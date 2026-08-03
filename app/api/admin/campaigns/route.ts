import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sanitizeObject, validateNoInjection } from "@/lib/security";
import { sendCampaignToPatient, type CampaignPayload } from "@/lib/notifications";

interface CampaignRequestBody {
  patientIds: string[];
  templateKey?: string;
  service?: string;
  discount?: string;
  detail?: string;
  channels?: { whatsapp?: boolean; email?: boolean };
}

export async function POST(request: Request) {
  try {
    const rawBody = (await request.json()) as CampaignRequestBody;
    if (!validateNoInjection(rawBody as unknown as Record<string, unknown>)) {
      return NextResponse.json({ error: "Input invalid detectat." }, { status: 400 });
    }
    const body = sanitizeObject(rawBody as unknown as Record<string, unknown>, [
      "service",
      "discount",
      "detail",
    ]) as unknown as CampaignRequestBody;

    const channels = {
      whatsapp: Boolean(body.channels?.whatsapp),
      email: Boolean(body.channels?.email),
    };
    if (!channels.whatsapp && !channels.email) {
      return NextResponse.json({ error: "Alege cel puțin un canal (WhatsApp sau email)." }, { status: 400 });
    }

    let payload: CampaignPayload;
    if (body.templateKey === "oferta_promo") {
      const service = String(body.service || "").trim();
      const discount = String(body.discount || "").trim();
      if (!service || !discount) {
        return NextResponse.json(
          { error: "Serviciul și reducerea sunt obligatorii pentru oferta specială." },
          { status: 400 },
        );
      }
      payload = { templateKey: "oferta_promo", service, discount };
    } else if (body.templateKey === "reminder_control") {
      const detail = String(body.detail || "").trim();
      if (!detail) {
        return NextResponse.json({ error: "Detaliul reminder-ului e obligatoriu." }, { status: 400 });
      }
      payload = { templateKey: "reminder_control", detail };
    } else {
      return NextResponse.json({ error: "Șablon necunoscut." }, { status: 400 });
    }

    const patients = await prisma.patient.findMany({
      where: { id: { in: Array.isArray(body.patientIds) ? body.patientIds : [] } },
    });

    if (!patients.length) {
      return NextResponse.json({ error: "Niciun pacient selectat." }, { status: 400 });
    }

    let sent = 0;
    let skipped = 0;
    for (const patient of patients) {
      const result = await sendCampaignToPatient(patient, payload, channels);
      if (result.whatsapp || result.email) sent++;
      else skipped++;
    }

    return NextResponse.json({ sent, skipped, total: patients.length });
  } catch (error) {
    console.error("Error sending campaign:", error);
    return NextResponse.json({ error: "Eroare la trimiterea campaniei." }, { status: 500 });
  }
}
