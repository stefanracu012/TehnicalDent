import { NextResponse } from "next/server";
import { createContactSubmission } from "@/lib/data";
import { captureLead, normalisePhone } from "@/lib/leads";
import { notifyLead } from "@/lib/lead-telegram";
import { sendTelegramToTopic, TELEGRAM_TOPICS } from "@/lib/telegram";
import { sanitizeObject, validateNoInjection } from "@/lib/security";

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

    // The form is the one channel that hands over a name and phone directly,
    // so the lead starts complete rather than filling in over several messages.
    const captured = await captureLead({
      source: "formular",
      reference: submission.id,
      name: body.name,
      phone: normalisePhone(body.phone) ?? body.phone,
      email: body.email || null,
      message: body.message,
      // The form's service field. It used to be visible only on the old
      // contact-messages page, which the lead list replaced.
      interest: body.service || null,
    });

    // Someone left a number and is waiting to be called — nobody answers a
    // form automatically, so this is always a lead a person has to act on.
    if (captured) {
      await notifyLead("nou", captured.lead, {
        why: "Formular de pe site — așteaptă să fie sunat.",
      });
    } else {
      // The lead could not be saved, but the request still must not be lost.
      const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      await sendTelegramToTopic(
        `🎯 <b>LEAD NOU — formular site</b>\n\n👤 ${esc(body.name)}\n📱 ${esc(body.phone)}\n💬 ${esc(body.message)}`,
        TELEGRAM_TOPICS.leaduri,
      );
    }

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
