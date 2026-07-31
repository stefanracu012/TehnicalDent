import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendWhatsAppText } from "@/lib/notifications";

interface RouteParams {
  params: Promise<{ phone: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { phone } = await params;
  const decoded = decodeURIComponent(phone);

  try {
    const messages = await prisma.whatsAppMessage.findMany({
      where: { phone: decoded },
      orderBy: { createdAt: "asc" },
      take: 500,
    });
    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching WhatsApp thread:", error);
    return NextResponse.json({ error: "Failed to fetch thread" }, { status: 500 });
  }
}

// Manual reply from admin. Freeform text only works within Meta's 24h
// customer-service window (i.e. the patient messaged recently) — same
// constraint as the auto-reply in the webhook.
export async function POST(request: Request, { params }: RouteParams) {
  const { phone } = await params;
  const decoded = decodeURIComponent(phone);

  try {
    const bodyJson = (await request.json().catch(() => ({}))) as { text?: string };
    const text = String(bodyJson.text || "").trim();
    if (!text) {
      return NextResponse.json({ error: "Mesajul nu poate fi gol." }, { status: 400 });
    }

    await sendWhatsAppText(decoded, text);

    const patient = await prisma.patient.findFirst({
      where: { phone: { contains: decoded.replace(/^\+/, "").slice(-9) } },
      select: { id: true },
    });

    const saved = await prisma.whatsAppMessage.create({
      data: { phone: decoded, direction: "out", body: text, patientId: patient?.id },
    });

    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    console.error("Error sending WhatsApp reply:", error);
    const msg = error instanceof Error ? error.message : "Eroare necunoscută";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
