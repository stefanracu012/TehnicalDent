// =============================================
// Low-level Telegram Bot API helpers — shared by lib/notifications.ts,
// lib/telegram-digest.ts and the WhatsApp webhook (admin alerts).
// =============================================

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID =
  process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID || "";

// Forum topics in the admin Telegram group (message_thread_id) — undefined
// means "General" (no topic), the safe fallback if a topic id isn't configured.
function topicEnv(name: string): number | undefined {
  const v = process.env[name];
  return v ? parseInt(v, 10) : undefined;
}
export const TELEGRAM_TOPICS = {
  azi: topicEnv("TELEGRAM_TOPIC_AZI"),
  maine: topicEnv("TELEGRAM_TOPIC_MAINE"),
  mesaje: topicEnv("TELEGRAM_TOPIC_MESAJE"),
  programariNoi: topicEnv("TELEGRAM_TOPIC_PROGRAMARI_NOI"),
  recall: topicEnv("TELEGRAM_TOPIC_RECALL"),
  anulari: topicEnv("TELEGRAM_TOPIC_ANULARI"),
  erori: topicEnv("TELEGRAM_TOPIC_ERORI"),
  pacienti: topicEnv("TELEGRAM_TOPIC_PACIENTI"),
} as const;

export function isTelegramConfigured(): boolean {
  return Boolean(TELEGRAM_TOKEN && TELEGRAM_CHAT_ID);
}

async function telegramCall<T = unknown>(method: string, body: object): Promise<T> {
  if (!TELEGRAM_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN not configured");
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) {
    throw new Error(`Telegram ${method} failed: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return data.result as T;
}

export async function sendTelegramMessage(
  text: string,
  opts: { threadId?: number; replyMarkup?: object } = {},
): Promise<{ message_id: number }> {
  if (!TELEGRAM_CHAT_ID) throw new Error("TELEGRAM_ADMIN_CHAT_ID not configured");
  return telegramCall("sendMessage", {
    chat_id: TELEGRAM_CHAT_ID,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(opts.threadId ? { message_thread_id: opts.threadId } : {}),
    ...(opts.replyMarkup ? { reply_markup: opts.replyMarkup } : {}),
  });
}

/**
 * Sends straight to a Telegram topic (or General if threadId is undefined),
 * swallowing errors — used for admin FYI pings (new/cancelled/recall/error)
 * that don't need the Notification-queue retry history WhatsApp/email get.
 */
export async function sendTelegramToTopic(text: string, threadId?: number): Promise<void> {
  try {
    await sendTelegramMessage(text, { threadId });
  } catch (e) {
    console.error("sendTelegramToTopic:", e);
  }
}

export async function deleteTelegramMessage(messageId: number): Promise<void> {
  if (!TELEGRAM_CHAT_ID) return;
  try {
    await telegramCall("deleteMessage", { chat_id: TELEGRAM_CHAT_ID, message_id: messageId });
  } catch {
    // ignore — message may already be gone (manually deleted, too old, etc.)
  }
}

export async function editTelegramMessage(messageId: number, text: string): Promise<void> {
  if (!TELEGRAM_CHAT_ID) return;
  try {
    await telegramCall("editMessageText", {
      chat_id: TELEGRAM_CHAT_ID,
      message_id: messageId,
      text,
      parse_mode: "HTML",
    });
  } catch (e) {
    console.error("editTelegramMessage:", e);
  }
}

export async function answerCallbackQuery(callbackId: string, text: string = ""): Promise<void> {
  try {
    await telegramCall("answerCallbackQuery", {
      callback_query_id: callbackId,
      text,
      show_alert: false,
    });
  } catch (e) {
    console.error("answerCallbackQuery:", e);
  }
}
