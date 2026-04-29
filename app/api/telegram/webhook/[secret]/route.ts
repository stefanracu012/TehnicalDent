// =============================================
// Telegram bot webhook
// Lets the admin create patients & appointments
// from inside the Telegram chat.
//
// Setup (once):
//   1. Set TELEGRAM_WEBHOOK_SECRET in env (random string).
//   2. POST to https://api.telegram.org/bot<TOKEN>/setWebhook
//      with url=https://<your-site>/api/telegram/webhook/<SECRET>
//   3. Only updates from TELEGRAM_CHAT_ID (admin) are accepted.
// =============================================

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  isValidPhone,
  normalizePhone,
  parseDateTime,
  findOverlappingAppointment,
  generateConfirmToken,
  formatDateTimeRo,
} from "@/lib/appointments";
import { notifyCreated } from "@/lib/notifications";

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const ADMIN_CHAT_ID =
  process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID || "";
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";

interface RouteParams {
  params: Promise<{ secret: string }>;
}

// ---------- Telegram helpers ----------

async function tgSend(chatId: number | string, text: string) {
  if (!TG_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  }).catch(() => {});
}

const HELP = `<b>Comenzi disponibile</b>

/help — afișează acest mesaj
/servicii — listă servicii (cu slug + durată)
/pacienti [text] — caută pacienți după nume sau telefon

<b>Pacient nou</b> (fără separator, detectare automată):
<code>/pacient_nou Nume Prenume telefon email?</code>
Ex: <code>/pacient_nou Ion Popescu 0712345678 ion@mail.com</code>
Ex: <code>/pacient_nou Maria Ionescu +40723456789</code>

<b>Programare nouă</b> (cu virgulă):
<code>/programare_noua telefon, slug_serviciu, YYYY-MM-DD HH:MM, durată_min?</code>
Ex: <code>/programare_noua 0712345678, albire-dentara, 2026-05-10 14:30, 60</code>
(Pacientul trebuie să existe — folosește /pacient_nou mai întâi.)

<b>Listă programări:</b>
/programari — următoarele 30 de zile
/programari azi
/programari maine
/programari YYYY-MM-DD`;

function splitComma(rest: string): string[] {
  return rest.split(",").map((s) => s.trim()).filter(Boolean);
}

// Smart parser for /pacient_nou — detects phone and email by pattern
function smartParsePacient(rest: string): {
  name: string;
  phone: string;
  email: string;
} {
  const tokens = rest.trim().split(/\s+/);
  const phonePat = /^[+]?[\d\s\-().]{7,20}$/;
  const emailPat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  let phone = "";
  let email = "";
  const nameParts: string[] = [];

  for (const t of tokens) {
    if (!email && emailPat.test(t)) {
      email = t;
    } else if (!phone && phonePat.test(t)) {
      phone = t;
    } else {
      nameParts.push(t);
    }
  }

  return { name: nameParts.join(" "), phone, email };
}

// ---------- Command handlers ----------

async function cmdServicii(): Promise<string> {
  const services = await prisma.service.findMany({
    where: { isActive: true, bookable: true },
    orderBy: { title: "asc" },
    select: { slug: true, title: true, duration: true },
    take: 50,
  });
  if (!services.length) return "Niciun serviciu activ.";
  return (
    `<b>Servicii (${services.length})</b>\n` +
    services
      .map((s) => `• <code>${s.slug}</code> — ${s.title} (${s.duration} min)`)
      .join("\n")
  );
}

async function cmdPacienti(query: string): Promise<string> {
  const q = query.trim();
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { phone: { contains: normalizePhone(q) } },
        ],
      }
    : {};
  const patients = await prisma.patient.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { name: true, phone: true, email: true },
  });
  if (!patients.length) return "Niciun pacient găsit.";
  return (
    `<b>Pacienți (${patients.length})</b>\n` +
    patients
      .map(
        (p) =>
          `• ${p.name} — <code>${p.phone}</code>${p.email ? ` · ${p.email}` : ""}`,
      )
      .join("\n")
  );
}

async function cmdPacientNou(rest: string): Promise<string> {
  const { name, phone: phoneRaw, email } = smartParsePacient(rest);

  if (!name || name.length < 2)
    return (
      "❌ Nu am putut detecta numele.\n" +
      "Format: <code>/pacient_nou Ion Popescu 0712345678 ion@mail.com</code>"
    );
  if (!isValidPhone(phoneRaw))
    return (
      "❌ Nu am putut detecta telefonul (7-15 cifre).\n" +
      "Ex: <code>/pacient_nou Ion Popescu 0712345678</code>"
    );

  const phone = normalizePhone(phoneRaw);
  const existing = await prisma.patient.findFirst({ where: { phone } });
  if (existing) {
    return `⚠️ Există deja: <b>${existing.name}</b> — <code>${existing.phone}</code>${existing.email ? ` · ${existing.email}` : ""}`;
  }

  const p = await prisma.patient.create({
    data: {
      name: name.trim(),
      phone,
      email: email ? email.trim() : null,
    },
  });
  return (
    `✅ <b>Pacient creat</b>\n` +
    `👤 ${p.name}\n` +
    `📞 <code>${p.phone}</code>` +
    (p.email ? `\n📧 ${p.email}` : "")
  );
}

async function cmdProgramareNoua(rest: string): Promise<string> {
  const parts = splitComma(rest);
  if (parts.length < 3) {
    return (
      "❌ Format: <code>/programare_noua telefon, slug_serviciu, YYYY-MM-DD HH:MM, durată?</code>\n" +
      "Folosește /servicii pentru lista de slug-uri."
    );
  }
  const [phoneRaw, slug, dateStr, durStr] = parts;
  if (!isValidPhone(phoneRaw)) return "❌ Telefon invalid.";

  const phone = normalizePhone(phoneRaw);
  const patient = await prisma.patient.findFirst({ where: { phone } });
  if (!patient) {
    return `❌ Pacientul cu telefon <code>${phone}</code> nu există. Creează-l cu /pacient_nou.`;
  }

  const service = await prisma.service.findUnique({ where: { slug } });
  if (!service) {
    return `❌ Serviciul <code>${slug}</code> nu există. Vezi /servicii.`;
  }

  // Accept "YYYY-MM-DD HH:MM" by converting space to 'T'
  const isoCandidate = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T");
  const dt = parseDateTime(isoCandidate);
  if (!dt) return "❌ Dată/oră invalidă (folosește YYYY-MM-DD HH:MM).";
  if (dt.getTime() < Date.now() - 60_000) return "❌ Data este în trecut.";

  const duration =
    durStr && /^\d+$/.test(durStr) ? parseInt(durStr, 10) : service.duration || 30;

  const overlap = await findOverlappingAppointment({ dateTime: dt, duration });
  if (overlap) {
    return `❌ Suprapunere cu o programare existentă (id <code>${overlap.id}</code>).`;
  }

  const created = await prisma.appointment.create({
    data: {
      patientId: patient.id,
      serviceId: service.id,
      dateTime: dt,
      duration,
      status: "pending",
    },
    include: { patient: true, service: true },
  });

  await prisma.appointment.update({
    where: { id: created.id },
    data: { confirmToken: generateConfirmToken(created.id) },
  });

  // Fire notifications (Telegram echo + WhatsApp/email to patient if configured)
  notifyCreated(created).catch((e) => console.error("notifyCreated:", e));

  return (
    `✅ <b>Programare creată</b>\n` +
    `👤 ${patient.name} (<code>${patient.phone}</code>)\n` +
    `🦷 ${service.title}\n` +
    `📅 ${formatDateTimeRo(dt)} (${duration} min)`
  );
}

async function cmdProgramari(arg: string): Promise<string> {
  const a = arg.trim().toLowerCase();
  let from = new Date();
  from.setHours(0, 0, 0, 0);
  let to = new Date(from.getTime() + 30 * 24 * 60 * 60_000);

  if (a === "azi") {
    to = new Date(from.getTime() + 24 * 60 * 60_000);
  } else if (a === "maine" || a === "mâine") {
    from = new Date(from.getTime() + 24 * 60 * 60_000);
    to = new Date(from.getTime() + 24 * 60 * 60_000);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(a)) {
    const d = new Date(`${a}T00:00:00`);
    if (!isNaN(d.getTime())) {
      from = d;
      to = new Date(d.getTime() + 24 * 60 * 60_000);
    }
  }

  const list = await prisma.appointment.findMany({
    where: {
      dateTime: { gte: from, lt: to },
      status: { in: ["pending", "confirmed"] },
    },
    orderBy: { dateTime: "asc" },
    include: {
      patient: { select: { name: true, phone: true } },
      service: { select: { title: true } },
    },
    take: 30,
  });

  if (!list.length) return "Nicio programare în intervalul selectat.";

  const STATUS = { pending: "🟡", confirmed: "🟢" } as const;

  return (
    `<b>Programări (${list.length})</b>\n` +
    list
      .map(
        (a) =>
          `${STATUS[a.status as "pending" | "confirmed"] || "⚪️"} ` +
          `${formatDateTimeRo(a.dateTime)} · ` +
          `${a.patient.name} · ${a.service.title}`,
      )
      .join("\n")
  );
}

// ---------- Webhook entrypoint ----------

interface TelegramMessage {
  message_id: number;
  from?: { id: number };
  chat: { id: number };
  text?: string;
}
interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { secret } = await params;

  // Path-segment secret guard
  if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true }); // ignore bad payloads
  }

  const msg = update.message || update.edited_message;
  if (!msg || !msg.text) return NextResponse.json({ ok: true });

  // Restrict to admin chat(s) — group AND private chat of the admin
  const ALLOWED = [String(ADMIN_CHAT_ID), process.env.TELEGRAM_ADMIN_USER_ID || ""].filter(Boolean);
  if (ALLOWED.length && !ALLOWED.includes(String(msg.chat.id))) {
    await tgSend(msg.chat.id, "⛔ Acces interzis.");
    return NextResponse.json({ ok: true });
  }

  const text = msg.text.trim();
  const match = text.match(/^\/(\w+)(?:@\w+)?\s*([\s\S]*)$/);
  if (!match) return NextResponse.json({ ok: true });

  const cmd = match[1].toLowerCase();
  const rest = match[2] || "";

  let reply = "";
  try {
    switch (cmd) {
      case "start":
      case "help":
        reply = HELP;
        break;
      case "servicii":
        reply = await cmdServicii();
        break;
      case "pacienti":
        reply = await cmdPacienti(rest);
        break;
      case "pacient_nou":
        reply = await cmdPacientNou(rest);
        break;
      case "programare_noua":
        reply = await cmdProgramareNoua(rest);
        break;
      case "programari":
        reply = await cmdProgramari(rest);
        break;
      default:
        reply = `Comandă necunoscută: /${cmd}\nFolosește /help.`;
    }
  } catch (err) {
    console.error("Telegram cmd error:", err);
    reply = `❌ Eroare server: ${err instanceof Error ? err.message : "necunoscută"}`;
  }

  await tgSend(msg.chat.id, reply);
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, info: "Telegram webhook endpoint" });
}
