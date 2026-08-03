// =============================================
// Step-by-step Telegram conversations for creating a patient or an
// appointment via guided prompts (instead of typing the /pacient_nou or
// /programare_noua slash-command syntax). State lives in TelegramSession,
// one per chat — the webhook checks for an active session before falling
// through to normal slash-command parsing.
//
// Every prompt/answer message exchanged during a flow is tracked in
// data.msgIds; once the flow ends (confirm or cancel) they're all deleted,
// leaving only the final result message — no Q&A clutter left behind.
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
  getMoldovaDayRangeUTC,
} from "@/lib/appointments";
import { notifyCreated } from "@/lib/notifications";
import { sendTelegramMessage, deleteTelegramMessage } from "@/lib/telegram";

type Flow = "pacient_nou" | "programare_noua";

interface SessionData {
  threadId?: number;
  msgIds: number[];
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

// ---- Persistent reply keyboard (Telegram ties this to the whole chat, not
// a single topic, so it's one combined keyboard covering both menus — stays
// docked above the text input regardless of what scrolls by above it).
// Telegram only honors one reply_markup per message, so this is reattached
// on every PLAIN prompt (sendPrompt); messages that need inline buttons
// (confirm/cancel, pickers) can't carry it at the same time. ----

const BTN_VEZI_PACIENTI = "👥 Vezi pacienți";
const BTN_PACIENT_NOU = "➕ Pacient nou";
const BTN_VEZI_PROGRAMARI = "🔎 Vezi programări";
const BTN_PROGRAMARE_NOUA = "➕ Programare nouă";
const BTN_AZI = "📅 Azi";
const BTN_MAINE = "📆 Mâine";

export const REPLY_KEYBOARD = {
  keyboard: [
    [BTN_VEZI_PACIENTI, BTN_PACIENT_NOU],
    [BTN_VEZI_PROGRAMARI, BTN_PROGRAMARE_NOUA],
    [BTN_AZI, BTN_MAINE],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

/** Sends a plain (no inline-button) prompt, reattaching the persistent reply keyboard. */
async function sendPrompt(text: string, threadId?: number): Promise<number> {
  const msg = await sendTelegramMessage(text, { threadId, replyMarkup: REPLY_KEYBOARD });
  return msg.message_id;
}

async function deleteAll(ids: number[]): Promise<void> {
  for (const id of ids) {
    await deleteTelegramMessage(id);
  }
}

export async function showDayList(key: "azi" | "maine", threadId?: number): Promise<void> {
  const dayOffset = key === "azi" ? 0 : 1;
  const { fromUTC, toUTC } = getMoldovaDayRangeUTC(new Date(), dayOffset);
  const label = key === "azi" ? "Azi" : "Mâine";

  const list = await prisma.appointment.findMany({
    where: { dateTime: { gte: fromUTC, lte: toUTC }, status: { notIn: ["cancelled", "test"] } },
    orderBy: { dateTime: "asc" },
    include: {
      patient: { select: { name: true, phone: true } },
      service: { select: { title: true } },
    },
  });

  if (!list.length) {
    await sendTelegramMessage(`📅 <b>${label}</b>\n\nNicio programare.`, { threadId });
    return;
  }

  const STATUS: Record<string, string> = {
    pending: "🟡",
    confirmed: "🟢",
    completed: "✅",
    noshow: "👤",
  };
  await sendTelegramMessage(
    `<b>${label} (${list.length})</b>\n` +
      list
        .map((a) => {
          const time = a.dateTime.toLocaleTimeString("ro-RO", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Chisinau",
          });
          return `${STATUS[a.status] || "⚪"} ${time} · ${a.patient.name} · ${a.service.title}`;
        })
        .join("\n"),
    { threadId },
  );
}

/**
 * Handles a tap on the persistent reply keyboard — Telegram sends the
 * button's label back as an ordinary text message, so this just matches on
 * exact text. Returns true if `text` was one of the menu buttons.
 */
export async function handleReplyKeyboardButton(
  chatId: string,
  text: string,
  threadId?: number,
  messageId?: number,
): Promise<boolean> {
  switch (text) {
    case BTN_VEZI_PACIENTI:
      await showPacientiList(threadId);
      return true;
    case BTN_PACIENT_NOU:
      await startPacientNou(chatId, threadId, messageId);
      return true;
    case BTN_VEZI_PROGRAMARI:
      await showProgramariList(threadId);
      return true;
    case BTN_PROGRAMARE_NOUA:
      await startProgramareNoua(chatId, threadId, messageId);
      return true;
    case BTN_AZI:
      await showDayList("azi", threadId);
      return true;
    case BTN_MAINE:
      await showDayList("maine", threadId);
      return true;
    default:
      return false;
  }
}

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

// ---- Starting a flow (from a menu button or reply-keyboard tap) ----

export async function startPacientNou(
  chatId: string,
  threadId?: number,
  triggerMsgId?: number,
): Promise<void> {
  const promptId = await sendPrompt("👤 Care este <b>numele complet</b> al pacientului?", threadId);
  const msgIds = [...(triggerMsgId ? [triggerMsgId] : []), promptId];
  await setSession(chatId, "pacient_nou", "name", { threadId, msgIds });
}

export async function startProgramareNoua(
  chatId: string,
  threadId?: number,
  triggerMsgId?: number,
): Promise<void> {
  const promptId = await sendPrompt(
    "🔎 Scrie <b>numele sau telefonul</b> pacientului pentru care faci programarea.",
    threadId,
  );
  const msgIds = [...(triggerMsgId ? [triggerMsgId] : []), promptId];
  await setSession(chatId, "programare_noua", "search_patient", { threadId, msgIds });
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
    `<b>Pacienți recenți (${patients.length})</b>\n` +
      patients
        .map((p) => `• ${p.name} — <code>${p.phone}</code>${p.email ? ` · ${p.email}` : ""}`)
        .join("\n") +
      `\n\n<i>Arată doar cei mai recenți ${patients.length}. Scrie /pacienti nume_sau_telefon pentru căutare.</i>`,
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
  messageId?: number,
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
  const msgIds = [...(data.msgIds || []), ...(messageId ? [messageId] : [])];
  const withMsg: SessionData = { ...data, msgIds };

  if (session.flow === "pacient_nou") {
    await handlePacientNouStep(chatId, session.step, text, withMsg, threadId);
  } else {
    await handleProgramareNouaStep(chatId, session.step, text, withMsg, threadId);
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
    const promptId = await sendPrompt(
      "📞 Care este <b>telefonul</b>? (scrie „-” dacă nu are)",
      threadId,
    );
    await setSession(chatId, "pacient_nou", "phone", {
      ...data,
      name: t,
      msgIds: [...data.msgIds, promptId],
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
    const promptId = await sendPrompt("📧 <b>Email</b>? (scrie „-” dacă nu are)", threadId);
    await setSession(chatId, "pacient_nou", "email", {
      ...data,
      phone,
      msgIds: [...data.msgIds, promptId],
    });
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
    const confirmMsg = await sendTelegramMessage(
      `<b>Confirmi crearea pacientului?</b>\n👤 ${data.name}` +
        (data.phone ? `\n📞 <code>${data.phone}</code>` : "") +
        (email ? `\n📧 ${email}` : ""),
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
    await setSession(chatId, "pacient_nou", "confirm", {
      ...data,
      email,
      msgIds: [...data.msgIds, confirmMsg.message_id],
    });
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
      await deleteAll(data.msgIds);
      await sendTelegramMessage(
        "❌ Niciun pacient găsit. Creează-l întâi din topicul Pacienți (➕ Pacient nou), apoi reia programarea.",
        { threadId },
      );
      await clearSession(chatId);
      return;
    }
    const pickerMsg = await sendTelegramMessage("Alege pacientul:", {
      threadId,
      replyMarkup: {
        inline_keyboard: patients.map((p) => [
          { text: `${p.name} — ${p.phone}`, callback_data: `wiz:patient:${p.id}` },
        ]),
      },
    });
    await setSession(chatId, "programare_noua", "search_patient", {
      ...data,
      msgIds: [...data.msgIds, pickerMsg.message_id],
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
      await sendTelegramMessage("❌ Se suprapune cu o altă programare. Încearcă o altă oră.", {
        threadId,
      });
      return;
    }
    const confirmMsg = await sendTelegramMessage(
      `<b>Confirmi programarea?</b>\n👤 ${data.patientName} (<code>${data.patientPhone}</code>)\n` +
        `🦷 ${data.serviceTitle}\n📅 ${formatDateTimeRo(dt)}`,
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
    await setSession(chatId, "programare_noua", "confirm", {
      ...data,
      dateTimeIso: dt.toISOString(),
      msgIds: [...data.msgIds, confirmMsg.message_id],
    });
    return;
  }

  await sendTelegramMessage("Alege o opțiune din butoanele de mai sus.", { threadId });
}

// ---- Handling button presses (callback_query) with the "wiz:" / "menu:" prefixes ----

export async function handleWizardCallback(
  chatId: string,
  callbackData: string,
  callbackMessageId?: number,
): Promise<string> {
  const session = await getSession(chatId);

  if (callbackData === "wiz:cancel") {
    if (session) {
      const data = session.data as unknown as SessionData;
      await deleteAll([...data.msgIds, ...(callbackMessageId ? [callbackMessageId] : [])]);
    }
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
    const servicePicker = await sendTelegramMessage("Alege serviciul:", {
      threadId: data.threadId,
      replyMarkup: {
        inline_keyboard: services.map((s) => [
          { text: s.title, callback_data: `wiz:service:${s.id}` },
        ]),
      },
    });
    await setSession(chatId, "programare_noua", "service", {
      ...data,
      patientId: patient.id,
      patientName: patient.name,
      patientPhone: patient.phone,
      msgIds: [
        ...data.msgIds,
        ...(callbackMessageId ? [callbackMessageId] : []),
        servicePicker.message_id,
      ],
    });
    return `Pacient: ${patient.name}`;
  }

  if (callbackData.startsWith("wiz:service:")) {
    if (!session || session.flow !== "programare_noua") return "Sesiune expirată.";
    const serviceId = callbackData.slice("wiz:service:".length);
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return "Serviciu inexistent.";

    const data = session.data as unknown as SessionData;
    const promptId = await sendPrompt(
      "📅 Scrie <b>data și ora</b> (format: YYYY-MM-DD HH:MM)",
      data.threadId,
    );
    await setSession(chatId, "programare_noua", "datetime", {
      ...data,
      serviceId: service.id,
      serviceTitle: service.title,
      serviceDuration: service.duration || 30,
      msgIds: [...data.msgIds, ...(callbackMessageId ? [callbackMessageId] : []), promptId],
    });
    return `Serviciu: ${service.title}`;
  }

  if (callbackData === "wiz:confirm") {
    if (!session) return "Sesiune expirată.";
    const data = session.data as unknown as SessionData;
    const allMsgIds = [...data.msgIds, ...(callbackMessageId ? [callbackMessageId] : [])];

    if (session.flow === "pacient_nou") {
      return await confirmPacientNou(chatId, data, allMsgIds);
    }
    return await confirmProgramareNoua(chatId, data, allMsgIds);
  }

  return "";
}

async function confirmPacientNou(
  chatId: string,
  data: SessionData,
  msgIds: number[],
): Promise<string> {
  await clearSession(chatId);
  await deleteAll(msgIds);

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

async function confirmProgramareNoua(
  chatId: string,
  data: SessionData,
  msgIds: number[],
): Promise<string> {
  await clearSession(chatId);
  await deleteAll(msgIds);

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
