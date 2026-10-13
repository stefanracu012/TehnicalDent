import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendSocialReply } from "@/lib/messenger";
import { sendWhatsAppText } from "@/lib/notifications";
import { pauseAssistant } from "@/lib/assistant";
import { clearUrgent } from "@/lib/leads";
import {
  diagnose,
  findConversation,
  forgetThread,
  getInbox,
  getThread,
  markConversationSeen,
  type InboxPlatform,
} from "@/lib/inbox";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const PLATFORMS: InboxPlatform[] = ["messenger", "instagram", "whatsapp"];

/**
 * The inbox: Messenger, Instagram and WhatsApp in one list.
 *
 * GET                              the conversations
 * GET ?conversation=<id>           one conversation's messages
 * GET ?platform=&person=           the conversation with one person
 * GET ?diagnose=1                  why Meta conversations are not arriving
 * POST { platform, recipientId, text, conversationId? }   a staff reply
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  try {
    if (params.get("diagnose") === "1") {
      return NextResponse.json(await diagnose());
    }

    const conversationId = params.get("conversation");
    if (conversationId) {
      const messages = await getThread(conversationId);
      // Opened means read.
      await markConversationSeen(conversationId);
      return NextResponse.json({ conversationId, messages });
    }

    const platform = params.get("platform") as InboxPlatform | null;
    const person = params.get("person");
    if (platform && person && PLATFORMS.includes(platform)) {
      const conversation = await findConversation(platform, person);
      return NextResponse.json({ conversation });
    }

    return NextResponse.json(await getInbox({ force: params.get("refresh") === "1" }));
  } catch (error) {
    console.error("Error reading the inbox:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nu am putut citi mesajele." },
      { status: 502 },
    );
  }
}

// Staff-composed reply. A colleague answering by hand takes the conversation
// over, so the assistant is paused on it — the same as the old per-channel
// inboxes did. Meta's 24h window and the HUMAN_AGENT tag are handled inside
// sendSocialReply(); WhatsApp has no such tag, so a freeform text only goes
// through while the patient's own message is recent.
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      platform?: InboxPlatform;
      recipientId?: string;
      text?: string;
      conversationId?: string;
    };

    const text = String(body.text ?? "").trim();
    const recipientId = String(body.recipientId ?? "").trim();
    const platform = body.platform;

    if (!platform || !PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: "Canal necunoscut." }, { status: 400 });
    }
    if (!recipientId) {
      return NextResponse.json({ error: "Lipsește destinatarul." }, { status: 400 });
    }
    if (!text) {
      return NextResponse.json({ error: "Mesajul nu poate fi gol." }, { status: 400 });
    }

    if (platform === "whatsapp") {
      await sendWhatsAppText(recipientId, text);

      const patient = await prisma.patient.findFirst({
        where: { phone: { contains: recipientId.replace(/^\+/, "").slice(-9) } },
        select: { id: true },
      });
      await prisma.whatsAppMessage.create({
        data: { phone: recipientId, direction: "out", body: text, patientId: patient?.id },
      });
    } else {
      await sendSocialReply(platform, recipientId, text);
    }

    await pauseAssistant(platform, recipientId, "Răspuns manual din panou").catch(
      (error) => console.warn("Could not pause the assistant:", error),
    );
    // A person has answered, so whatever the assistant flagged as urgent is in hand.
    await clearUrgent({ channel: platform, handle: recipientId });

    // Our own reply must not light the conversation up as unread. Meta stamps
    // it with its clock, so the mark leaves a little room.
    if (body.conversationId) {
      forgetThread(body.conversationId);
      await markConversationSeen(body.conversationId, new Date(Date.now() + 15_000));
    }

    return NextResponse.json(
      { ok: true, sentAt: new Date().toISOString() },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error sending reply:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Eroare necunoscută." },
      { status: 502 },
    );
  }
}
