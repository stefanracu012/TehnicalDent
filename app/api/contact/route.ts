import { NextResponse } from "next/server";
import { createContactSubmission } from "@/lib/data";
import { sanitizeObject, validateNoInjection } from "@/lib/security";

async function sendTelegramNotification(data: {
  name: string;
  phone: string;
  email?: string;
  service?: string;
  message: string;
}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const now = new Date().toLocaleString("ro-RO", {
    timeZone: "Europe/Chisinau",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const text = [
    `🦷 <b>Programare nouă</b>`,
    ``,
    `👤 <b>Nume:</b> ${data.name}`,
    `📞 <b>Telefon:</b> ${data.phone}`,
    data.email ? `📧 <b>Email:</b> ${data.email}` : null,
    data.service ? `🏥 <b>Serviciu:</b> ${data.service}` : null,
    ``,
    `💬 <b>Mesaj:</b>`,
    data.message,
    ``,
    `🕐 ${now}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });
  } catch (err) {
    console.error("Telegram notification failed:", err);
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();

    // Security: validate & sanitize input
    if (!validateNoInjection(rawBody)) {
      return NextResponse.json(
        { error: "Input invalid detectat." },
        { status: 400 }
      );
    }
    const body = sanitizeObject(rawBody);

    // Validate required fields
    if (!body.name || !body.phone || !body.message) {
      return NextResponse.json(
        { error: "Numele, telefonul și mesajul sunt obligatorii." },
        { status: 400 }
      );
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^[\d\s+()-]{6,25}$/;
    if (!phoneRegex.test(body.phone)) {
      return NextResponse.json(
        { error: "Numărul de telefon nu este valid." },
        { status: 400 }
      );
    }

    // Validate email if provided
    if (body.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        return NextResponse.json(
          { error: "Adresa de email nu este validă." },
          { status: 400 }
        );
      }
    }

    // Save to database
    const submission = await createContactSubmission({
      name: body.name,
      phone: body.phone,
      email: body.email || undefined,
      service: body.service || undefined,
      message: body.message,
    });

    // Send Telegram notification
    await sendTelegramNotification({
      name: body.name,
      phone: body.phone,
      email: body.email || undefined,
      service: body.service || undefined,
      message: body.message,
    });

    return NextResponse.json(
      { message: "Mesajul a fost trimis cu succes.", id: submission.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating contact submission:", error);
    return NextResponse.json(
      { error: "A apărut o eroare. Vă rugăm să încercați din nou." },
      { status: 500 }
    );
  }
}
