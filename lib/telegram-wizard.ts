// =============================================
// Step-by-step Telegram conversations for creating a patient or an
// appointment via guided prompts (instead of typing the /pacient_nou or
// /programare_noua slash-command syntax). State lives in TelegramSession,
// one per chat — the webhook checks for an active session before falling
// through to normal slash-command parsing.
// =============================================

import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  isValidPhone,
  normalizePhone,
  parseDateTime,
  findOverlappingAppointment,
  generateConfirmToken,
  formatDateTimeRo,
} from "@/lib/appointments";
import { notifyCreated } from "@/lib/notifications";
import { sendTelegramMessage } from "@/lib/telegram";

type Flow = "pacient_nou" | "programare_noua";

interface SessionData {
  threadId?: number;
  name?: string;
  phone?: string;
  email?: string | null;
  patientId?: string;
  patientName?: string;
  patientPhone?: string;
  serviceId?: string;
  serviceTitle?: string;
  serviceDuration?: number;
  dateTimeIso?: string;
}

// ---- Menus (persistent buttons posted once into each topic; also re-sent by /menu) ----

export const MENU_PACIENTI = {
  text: "👥 <b>Meniu pacienți</b>\nAlege o acțiune:",
  keyboard: {
    inline_keyboard: [
      [
        { text: "🔎 Vezi pacienți", callback_data: "menu:pacienti_vezi" },
        { text: "➕ Pacient nou", callback_data: "menu:pacient_nou" },
      ],
    ],
  },
};

export const MENU_PROGRAMARI = {
  text: "🆕 <b>Meniu programări</b>\nAlege o acțiune:",
  keyboard: {
    inline_keyboard: [
      [
        { text: "🔎 Vezi programări", callback_data: "menu:programari_vezi" },
        { text: "➕ Programare nouă", callback_data: "menu:programare_noua" },
      ],
    ],
  },
};

async function getSession(chatId: string) {
  return prisma.telegramSession.findUnique({ where: { chatId } });
}

async function setSession(chatId: string, flow: Flow, step: string, data: SessionData) {
  await prisma.telegramSession.upsert({
    where: { chatId },
    create: { chatId, flow, step, data: data as unknown as Prisma.InputJsonValue },
    update: { flow, step, data: data as unknown as Prisma.InputJsonValue },
  });
}

async function clearSession(chatId: string) {
  await prisma.telegramSession.deleteMany({ where: { chatId } });
}

function isSkip(text: string): boolean {
  return text.trim() === "-";
}

// ---- Starting a flow (from a menu button) ----

export async function startPacientNou(chatId: string, threadId?: number): Promise<void> {
  await setSession(chatId, "pacient_nou", "name", { threadId });
  await sendTelegramMessage("👤 Care este <b>numele complet</b> al pacientului?", { threadId });
}

export async function startProgramareNoua(chatId: string, threadId?: number): Promise<void> {
  await setSession(chatId, "programare_noua", "search_patient", { threadId });
  await sendTelegramMessage(
    "🔎 Scrie <b>numele sau telefonul</b> pacientului pentru care faci programarea.",
    { threadId },
  );
}

export async function showPacientiList(threadId?: number): Promise<void> {
  const patients = await prisma.patient.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { name: true, phone: true, email: true },
  });
  if (!patients.length) {
    await sendTelegramMessage("Niciun pacient găsit.", { threadId });
    return;
  }
  await sendTelegramMessage(
    `<b>Pacienți (${patients.length})</b>\n` +
      patients
        .map((p) => `• ${p.name} — <code>${p.phone}</code>${p.email ? ` · ${p.email}` : ""}`)
        .join("\n"),
    { threadId },
  );
}

export async function showProgramariList(threadId?: number): Promise<void> {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from.getTime() + 30 * 24 * 60 * 60_000);

  const list = await prisma.appointment.findMany({
    where: { dateTime: { gte: from, lt: to }, status: { in: ["pending", "confirmed"] } },
    orderBy: { dateTime: "asc" },
    include: {
      patient: { select: { name: true, phone: true } },
      service: { select: { title: true } },
    },
    take: 30,
  });
  if (!list.length) {
    await sendTelegramMessage("Nicio programare în următoarele 30 de zile.", { threadId });
    return;
  }
  const STATUS: Record<string, string> = { pending: "🟡", confirmed: "🟢" };
  await sendTelegramMessage(
    `<b>Programări (${list.length})</b>\n` +
      list
        .map(
          (a) =>
            `${STATUS[a.status] || "⚪️"} ${formatDateTimeRo(a.dateTime)} · ${a.patient.name} · ${a.service.title}`,
        )
        .join("\n"),
    { threadId },
  );
}

// ---- Handling a plain-text reply within an active session ----

export async function handleWizardMessage(
  chatId: string,
  text: string,
): Promise<boolean> {
  const session = await getSession(chatId);
  if (!session) return false;

  // Escape hatch: any slash command cancels the wizard and falls through
  // to normal command handling.
  if (text.trim().startsWith("/")) {
    await clearSession(chatId);
    return false;
  }

  const data = session.data as unknown as SessionData;
  const threadId = data.threadId;

  if (session.flow === "pacient_nou") {
    await handlePacientNouStep(chatId, session.step, text, data, threadId);
  } else {
    await handleProgramareNouaStep(chatId, session.step, text, data, threadId);
  }
  return true;
}

async function handlePacientNouStep(
  chatId: string,
  step: string,
  text: string,
  data: SessionData,
  threadId?: number,
) {
  const t = text.trim();

  if (step === "name") {
    if (t.length < 2) {
      await sendTelegramMessage("❌ Numele e prea scurt. Încearcă din nou.", { threadId });
      return;
    }
    await setSession(chatId, "pacient_nou", "phone", { ...data, name: t });
    await sendTelegramMessage("📞 Care este <b>telefonul</b>? (scrie „-” dacă nu are)", {
      threadId,
    });
    return;
  }

  if (step === "phone") {
    if (!isSkip(t) && !isValidPhone(t)) {
      await sendTelegramMessage("❌ Telefon invalid (7-15 cifre). Încearcă din nou, sau „-”.", {
        threadId,
      });
      return;
    }
    const phone = isSkip(t) ? "" : normalizePhone(t);
    await setSession(chatId, "pacient_nou", "email", { ...data, phone });
    await sendTelegramMessage("📧 <b>Email</b>? (scrie „-” dacă nu are)", { threadId });
    return;
  }

  if (step === "email") {
    const emailPat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!isSkip(t) && !emailPat.test(t)) {
      await sendTelegramMessage("❌ Email invalid. Încearcă din nou, sau „-”.", { threadId });
      return;
    }
    if (!data.phone && isSkip(t)) {
      await sendTelegramMessage(
        "❌ Trebuie cel puțin telefon sau email — nu poți sări peste ambele. Scrie emailul:",
        { threadId },
      );
      return;
    }
    const email = isSkip(t) ? null : t;
    const next = { ...data, email };
    await setSession(chatId, "pacient_nou", "confirm", next);
    await sendTelegramMessage(
      `<b>Confirmi crearea pacientului?</b>\n👤 ${next.name}` +
        (next.phone ? `\n📞 <code>${next.phone}</code>` : "") +
        (next.email ? `\n📧 ${next.email}` : ""),
      {
        threadId,
        replyMarkup: {
          inline_keyboard: [
            [
              { text: "✅ Confirmă", callback_data: "wiz:confirm" },
              { text: "❌ Anulează", callback_data: "wiz:cancel" },
            ],
          ],
        },
      },
    );
    return;
  }

  // Already at "confirm" and admin typed text instead of pressing a button
  await sendTelegramMessage("Apasă ✅ Confirmă sau ❌ Anulează mai sus.", { threadId });
}

async function handleProgramareNouaStep(
  chatId: string,
  step: string,
  text: string,
  data: SessionData,
  threadId?: number,
) {
  const t = text.trim();

  if (step === "search_patient") {
    const patients = await prisma.patient.findMany({
      where: {
        OR: [
          { name: { contains: t, mode: "insensitive" } },
          { phone: { contains: normalizePhone(t) } },
        ],
      },
      take: 8,
      select: { id: true, name: true, phone: true },
    });
    if (!patients.length) {
      await sendTelegramMessage(
        "❌ Niciun pacient găsit. Creează-l întâi din topicul Pacienți (➕ Pacient nou), apoi reia programarea.",
        { threadId },
      );
      await clearSession(chatId);
      return;
    }
    await sendTelegramMessage("Alege pacientul:", {
      threadId,
      replyMarkup: {
        inline_keyboard: patients.map((p) => [
          { text: `${p.name} — ${p.phone}`, callback_data: `wiz:patient:${p.id}` },
        ]),
      },
    });
    return;
  }

  if (step === "datetime") {
    const isoCandidate = t.includes("T") ? t : t.replace(" ", "T");
    const dt = parseDateTime(isoCandidate);
    if (!dt) {
      await sendTelegramMessage("❌ Dată/oră invalidă. Format: YYYY-MM-DD HH:MM", { threadId });
      return;
    }
    if (dt.getTime() < Date.now() - 60_000) {
      await sendTelegramMessage("❌ Data este în trecut. Încearcă din nou.", { threadId });
      return;
    }
    const overlap = await findOverlappingAppointment({
      dateTime: dt,
      duration: data.serviceDuration || 30,
    });
    if (overlap) {
      await sendTelegramMessage(
        "❌ Se suprapune cu o altă programare. Încearcă o altă oră.",
        { threadId },
      );
      return;
    }
    const next = { ...data, dateTimeIso: dt.toISOString() };
    await setSession(chatId, "programare_noua", "confirm", next);
    await sendTelegramMessage(
      `<b>Confirmi programarea?</b>\n👤 ${next.patientName} (<code>${next.patientPhone}</code>)\n` +
        `🦷 ${next.serviceTitle}\n📅 ${formatDateTimeRo(dt)}`,
      {
        threadId,
        replyMarkup: {
          inline_keyboard: [
            [
              { text: "✅ Confirmă", callback_data: "wiz:confirm" },
              { text: "❌ Anulează", callback_data: "wiz:cancel" },
            ],
          ],
        },
      },
    );
    return;
  }

  await sendTelegramMessage("Alege o opțiune din butoanele de mai sus.", { threadId });
}

// ---- Handling button presses (callback_query) with the "wiz:" / "menu:" prefixes ----

export async function handleWizardCallback(
  chatId: string,
  callbackData: string,
): Promise<string> {
  const session = await getSession(chatId);

  if (callbackData === "wiz:cancel") {
    await clearSession(chatId);
    return "Anulat.";
  }

  if (callbackData.startsWith("wiz:patient:")) {
    if (!session || session.flow !== "programare_noua") return "Sesiune expirată.";
    const patientId = callbackData.slice("wiz:patient:".length);
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return "Pacient inexistent.";

    const data = session.data as unknown as SessionData;
    const services = await prisma.service.findMany({
      orderBy: { title: "asc" },
      take: 20,
      select: { id: true, title: true },
    });
    if (!services.length) {
      await clearSession(chatId);
      return "Niciun serviciu configurat.";
    }
    const next: SessionData = {
      ...data,
      patientId: patient.id,
      patientName: patient.name,
      patientPhone: patient.phone,
    };
    await setSession(chatId, "programare_noua", "service", next);
    await sendTelegramMessage("Alege serviciul:", {
      threadId: data.threadId,
      replyMarkup: {
        inline_keyboard: services.map((s) => [
          { text: s.title, callback_data: `wiz:service:${s.id}` },
        ]),
      },
    });
    return `Pacient: ${patient.name}`;
  }

  if (callbackData.startsWith("wiz:service:")) {
    if (!session || session.flow !== "programare_noua") return "Sesiune expirată.";
    const serviceId = callbackData.slice("wiz:service:".length);
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return "Serviciu inexistent.";

    const data = session.data as unknown as SessionData;
    const next: SessionData = {
      ...data,
      serviceId: service.id,
      serviceTitle: service.title,
      serviceDuration: service.duration || 30,
    };
    await setSession(chatId, "programare_noua", "datetime", next);
    await sendTelegramMessage("📅 Scrie <b>data și ora</b> (format: YYYY-MM-DD HH:MM)", {
      threadId: data.threadId,
    });
    return `Serviciu: ${service.title}`;
  }

  if (callbackData === "wiz:confirm") {
    if (!session) return "Sesiune expirată.";
    const data = session.data as unknown as SessionData;

    if (session.flow === "pacient_nou") {
      return await confirmPacientNou(chatId, data);
    }
    return await confirmProgramareNoua(chatId, data);
  }

  return "";
}

async function confirmPacientNou(chatId: string, data: SessionData): Promise<string> {
  await clearSession(chatId);
  const orClause = [
    ...(data.phone ? [{ phone: data.phone }] : []),
    ...(data.email ? [{ email: data.email }] : []),
  ];
  const existing = orClause.length
    ? await prisma.patient.findFirst({ where: { OR: orClause } })
    : null;
  if (existing) {
    await sendTelegramMessage(
      `⚠️ Există deja: <b>${existing.name}</b> — <code>${existing.phone}</code>`,
      { threadId: data.threadId },
    );
    return "Există deja.";
  }

  const p = await prisma.patient.create({
    data: { name: data.name || "", phone: data.phone || "", email: data.email || null },
  });
  await sendTelegramMessage(
    `✅ <b>Pacient creat</b>\n👤 ${p.name}` +
      (p.phone ? `\n📞 <code>${p.phone}</code>` : "") +
      (p.email ? `\n📧 ${p.email}` : ""),
    { threadId: data.threadId },
  );
  return "Creat!";
}

async function confirmProgramareNoua(chatId: string, data: SessionData): Promise<string> {
  await clearSession(chatId);
  if (!data.patientId || !data.serviceId || !data.dateTimeIso) {
    await sendTelegramMessage("❌ Date incomplete, reia programarea.", { threadId: data.threadId });
    return "Eroare.";
  }

  const dt = new Date(data.dateTimeIso);
  const overlap = await findOverlappingAppointment({
    dateTime: dt,
    duration: data.serviceDuration || 30,
  });
  if (overlap) {
    await sendTelegramMessage("❌ Se suprapune cu o altă programare între timp.", {
      threadId: data.threadId,
    });
    return "Suprapunere.";
  }

  const created = await prisma.appointment.create({
    data: {
      patientId: data.patientId,
      serviceId: data.serviceId,
      dateTime: dt,
      duration: data.serviceDuration || 30,
      status: "pending",
    },
    include: { patient: true, service: true },
  });
  await prisma.appointment.update({
    where: { id: created.id },
    data: { confirmToken: generateConfirmToken(created.id) },
  });

  notifyCreated(created).catch((e) => console.error("notifyCreated:", e));

  await sendTelegramMessage(
    `✅ <b>Programare creată</b>\n👤 ${created.patient.name}\n🦷 ${created.service.title}\n📅 ${formatDateTimeRo(dt)}`,
    { threadId: data.threadId },
  );
  return "Creată!";
}
