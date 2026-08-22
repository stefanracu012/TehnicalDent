// =============================================
// The reception assistant.
//
// Answers patients and books them into hours the doctors actually marked free.
// Two things are enforced in code rather than in the prompt, because a prompt
// is a request and this involves someone's calendar:
//
//   1. It cannot book without a name and a valid phone number.
//   2. It cannot book an hour a doctor did not open, or one already taken —
//      claimSlot decides that, the same way the admin booking form does.
//
// Whether it may speak at all is a separate question, answered by shouldReply.
// =============================================

import prisma from "@/lib/prisma";
import { freeHours, claimSlot } from "@/lib/slots";
import { normalizePhone, isValidPhone } from "@/lib/appointments";
import type { AssistantMode } from "@prisma/client";

const API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o";
const ENDPOINT = "https://api.openai.com/v1/chat/completions";

export type AssistantChannelName = "whatsapp" | "messenger" | "instagram";

export function isAssistantConfigured(): boolean {
  return Boolean(API_KEY);
}

/** Reads as "oprit" when the channel has never been configured. */
export async function channelMode(
  channel: AssistantChannelName,
): Promise<AssistantMode> {
  const row = await prisma.assistantChannel.findUnique({ where: { channel } });
  return row?.mode ?? "oprit";
}

export async function shouldReply(
  channel: AssistantChannelName,
  handle: string,
): Promise<boolean> {
  if (!isAssistantConfigured()) return false;

  const mode = await channelMode(channel);
  if (mode === "oprit") return false;
  if (mode === "toti") return true;

  const allowed = await prisma.assistantAllowed.findUnique({
    where: { channel_handle: { channel, handle } },
  });
  return Boolean(allowed);
}

// ── Voice ───────────────────────────────────────────────────────────────────

/**
 * The brief.
 *
 * Most of this is about not sounding like software. The tells are specific and
 * worth naming: greeting every message, restating the question before
 * answering, offering "any further assistance", and listing options as bullets
 * when a person would just say two of them.
 */
const SYSTEM = `Ești Ana, asistentă la recepția clinicii stomatologice TehnicalDent din Chișinău, sectorul Botanica, Str. Sarmizegetusa 24/1.

Vorbești cu pacienții pe chat. Scrii ca un om, nu ca un sistem.

CUM VORBEȘTI:
- Mesaje scurte. Una-două propoziții de obicei. Ca pe WhatsApp, nu ca într-un email.
- Saluți o singură dată, la începutul conversației. Nu la fiecare mesaj.
- Nu repeți întrebarea pacientului înainte să răspunzi.
- Nu spui niciodată "Vă pot ajuta cu altceva?", "Cu plăcere!", "Desigur!", "Sunt aici să vă ajut".
- Nu folosești liste cu liniuțe. Dacă ai două variante, le spui în propoziție.
- Nu spui că ești asistent virtual, AI sau bot. Dacă te întreabă direct dacă ești robot, spui că ești de la recepție și treci mai departe.
- Fără emoji, fără majuscule de accent, fără semne de exclamare în lanț.
- Diacritice corecte.
- Dacă pacientul scrie în rusă, răspunzi în rusă. Dacă scrie în engleză, în engleză.

CE FACI:
- Afli de ce serviciu are nevoie. Dacă nu e clar, întrebi simplu: "La ce v-ar trebui programarea?"
- Verifici orele libere cu unealta, nu din memorie. Nu inventezi niciodată o oră.
- Propui cel mult două-trei ore concrete, cele mai apropiate. Nu o listă lungă.
- Înainte de a programa ai nevoie de nume și număr de telefon. Dacă nu le ai, le ceri firesc, nu ca pe un formular.
- Programezi doar după ce pacientul confirmă ora.
- După ce ai programat, confirmi scurt: ziua, ora, medicul.

CE NU FACI:
- Nu dai sfaturi medicale și nu spui ce tratament îi trebuie. Pentru asta e consultația.
- Nu spui prețuri decât dacă le ai din unealta de servicii, și le spui ca orientative.
- Nu promiți rezultate și nu estimezi durata vindecării.
- Dacă întrebarea e medicală sau delicată, spui că îl întrebi pe medic și revii, sau îl inviți la consultație.
- Dacă ceva nu merge sau pacientul e nemulțumit, nu insiști: spui că îl sună cineva de la recepție.`;

// ── Tools ───────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "servicii",
      description:
        "Lista serviciilor pentru care se poate face programare, cu durata și prețul dacă există.",
      parameters: { type: "object", additionalProperties: false, required: [], properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "ore_libere",
      description:
        "Orele libere din calendarul medicilor, începând de mâine. Folosește-o de fiecare dată — nu propune niciodată o oră din memorie.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["zile"],
        properties: {
          zile: {
            type: "integer",
            description: "Câte zile în față să caute, între 1 și 14.",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "cauta_pacient",
      description:
        "Verifică dacă numărul de telefon există deja în sistem. Dacă da, primești numele și nu mai trebuie să-l ceri.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["telefon"],
        properties: { telefon: { type: "string" } },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "programeaza",
      description:
        "Creează programarea. Ai nevoie de nume, telefon, serviciu și ora exactă confirmată de pacient. Refuză dacă lipsește ceva.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["nume", "telefon", "serviciuSlug", "medicId", "dataOra"],
        properties: {
          nume: { type: "string" },
          telefon: { type: "string" },
          serviciuSlug: { type: "string" },
          medicId: { type: "string" },
          dataOra: {
            type: "string",
            description: "Exact valoarea din ore_libere, în format ISO.",
          },
        },
      },
    },
  },
];

/** YYYY-MM-DD in Moldova, n days from today. */
function moldovaDate(offsetDays: number): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + offsetDays);
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Chisinau",
  }).format(now);
}

async function listServices() {
  const services = await prisma.service.findMany({
    where: { isActive: true, bookable: true },
    orderBy: { order: "asc" },
    select: { slug: true, title: true, duration: true, price: true, discountPrice: true },
  });
  return services;
}

/**
 * Free hours across all active doctors, starting tomorrow.
 *
 * Same-day booking is left out on purpose — reception should be the one to say
 * yes to "can I come in an hour", not a chat.
 */
async function findSlots(days: number) {
  const span = Math.min(Math.max(days, 1), 14);
  const doctors = await prisma.teamMember.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    select: { id: true, name: true, role: true },
  });

  const out: {
    medicId: string;
    medic: string;
    data: string;
    ora: number;
    dataOra: string;
  }[] = [];

  for (let offset = 1; offset <= span && out.length < 40; offset++) {
    const date = moldovaDate(offset);
    for (const doctor of doctors) {
      for (const hour of await freeHours(doctor.id, date)) {
        out.push({
          medicId: doctor.id,
          medic: doctor.name,
          data: date,
          ora: hour,
          // Moldova is UTC+3 year-round for booking purposes here, matching how
          // the admin form builds its slots.
          dataOra: new Date(`${date}T${String(hour).padStart(2, "0")}:00:00+03:00`).toISOString(),
        });
      }
    }
  }

  return out.slice(0, 40);
}

async function findPatient(phoneRaw: string) {
  const phone = normalizePhone(phoneRaw);
  if (!isValidPhone(phone)) return { gasit: false, motiv: "Număr invalid" };
  const patient = await prisma.patient.findFirst({ where: { phone } });
  return patient
    ? { gasit: true, nume: patient.name, telefon: patient.phone }
    : { gasit: false };
}

/**
 * Books, or explains why it will not.
 *
 * The name and phone checks live here rather than in the prompt because they
 * are the difference between a booking somebody can be reached about and a
 * blocked hour nobody can trace.
 */
async function book(args: {
  nume?: string;
  telefon?: string;
  serviciuSlug?: string;
  medicId?: string;
  dataOra?: string;
}) {
  const name = (args.nume ?? "").trim();
  if (name.length < 2) {
    return { ok: false, motiv: "Lipsește numele pacientului. Cere-l înainte." };
  }

  const phone = normalizePhone(args.telefon ?? "");
  if (!isValidPhone(phone)) {
    return { ok: false, motiv: "Lipsește un număr de telefon valid. Cere-l înainte." };
  }

  const service = await prisma.service.findUnique({
    where: { slug: args.serviciuSlug ?? "" },
  });
  if (!service) return { ok: false, motiv: "Serviciu necunoscut." };

  const when = args.dataOra ? new Date(args.dataOra) : null;
  if (!when || Number.isNaN(when.getTime())) {
    return { ok: false, motiv: "Ora nu este validă." };
  }

  const patient =
    (await prisma.patient.findFirst({ where: { phone } })) ??
    (await prisma.patient.create({ data: { name, phone } }));

  const appointment = await prisma.appointment.create({
    data: {
      patientId: patient.id,
      serviceId: service.id,
      teamMemberId: args.medicId,
      dateTime: when,
      duration: service.duration,
      notes: "Programare făcută prin chat.",
    },
  });

  try {
    // The same guard the admin form goes through: it re-checks the doctor's
    // availability and loses the race cleanly if the hour went in the meantime.
    await claimSlot(args.medicId ?? "", when, appointment.id);
  } catch (error) {
    await prisma.appointment.delete({ where: { id: appointment.id } });
    return {
      ok: false,
      motiv:
        (error as Error).name === "SlotTakenError"
          ? "Ora tocmai a fost ocupată. Propune alta."
          : "Medicul nu are ora aceea liberă. Propune alta.",
    };
  }

  // A lead that turned into a patient is no longer a lead.
  await prisma.lead
    .updateMany({
      where: { phone, status: { notIn: ["convertit", "pierdut"] } },
      data: { status: "convertit", patientId: patient.id, followUpAt: null },
    })
    .catch(() => {});

  return {
    ok: true,
    pacient: patient.name,
    cand: when.toISOString(),
    serviciu: service.title,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runTool(name: string, args: any): Promise<unknown> {
  switch (name) {
    case "servicii":
      return listServices();
    case "ore_libere":
      return findSlots(Number(args?.zile) || 7);
    case "cauta_pacient":
      return findPatient(String(args?.telefon ?? ""));
    case "programeaza":
      return book(args ?? {});
    default:
      return { error: `Unealtă necunoscută: ${name}` };
  }
}

export interface AssistantTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * Produces the next reply, booking along the way when the patient agreed to an
 * hour. Returns null when it has nothing to say, which the caller treats as
 * "stay quiet" rather than sending an empty message.
 */
export async function assistantReply(
  history: AssistantTurn[],
  knownPatient?: { name: string; phone: string } | null,
): Promise<string | null> {
  if (!isAssistantConfigured()) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = [
    { role: "system", content: SYSTEM },
    {
      role: "system",
      content: knownPatient
        ? `Pacientul e deja în sistem: ${knownPatient.name}, ${knownPatient.phone}. Nu-i mai cere numele sau numărul.`
        : "Pacientul nu e în sistem. Ai nevoie de nume și număr de telefon înainte de a programa.",
    },
    ...history.slice(-12),
  ];

  for (let round = 0; round < 6; round++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ model: MODEL, temperature: 0.6, messages, tools: TOOLS }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Assistant failed:", body?.error?.message);
      return null;
    }

    const message = body?.choices?.[0]?.message;
    if (!message) return null;

    const calls = message.tool_calls ?? [];
    if (calls.length === 0) {
      const text = (message.content ?? "").trim();
      return text || null;
    }

    messages.push(message);
    for (const call of calls) {
      let result: unknown;
      try {
        result = await runTool(
          call.function.name,
          JSON.parse(call.function.arguments || "{}"),
        );
      } catch (error) {
        result = { error: (error as Error).message };
      }
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  return null;
}
