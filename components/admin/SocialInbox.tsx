"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { secureFetch } from "@/lib/csrf-client";

interface Conversation {
  senderId: string;
  senderName: string | null;
  lastMessage: string;
  lastDirection: "in" | "out";
  lastAt: string;
  inboundCount: number;
}

interface ThreadMessage {
  id: string;
  senderId: string;
  direction: "in" | "out";
  body: string;
  createdAt: string;
}

/**
 * Messenger and Instagram inboxes are the same screen over the same API,
 * differing only in which channel they read — so the page components stay
 * thin and this holds the behaviour.
 */
export default function SocialInbox({
  channel,
  title,
  subtitle,
}: {
  channel: "messenger" | "instagram";
  title: string;
  subtitle: string;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await secureFetch(`/api/admin/social/${channel}`);
      const data = await res.json();
      setConversations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [channel]);

  const fetchThread = useCallback(
    async (senderId: string) => {
      setThreadLoading(true);
      try {
        const res = await secureFetch(
          `/api/admin/social/${channel}/${encodeURIComponent(senderId)}`,
        );
        const data = await res.json();
        setThread(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching thread:", error);
      } finally {
        setThreadLoading(false);
      }
    },
    [channel],
  );

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selected) fetchThread(selected);
  }, [selected, fetchThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread]);

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await secureFetch(
        `/api/admin/social/${channel}/${encodeURIComponent(selected)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: reply.trim() }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Trimiterea a eșuat.");
      }
      setReply("");
      await fetchThread(selected);
      await fetchConversations();
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Eroare necunoscută.");
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString("ro-RO", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Chisinau",
    });

  const selectedConv = conversations.find((c) => c.senderId === selected);

  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="mb-6 sm:mb-12">
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground">
            {title}
          </h1>
          <p className="mt-2 text-muted-foreground">{subtitle}</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Se încarcă...</div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12 bg-background border border-border">
            <p className="text-muted-foreground">Nu există conversații încă.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-2">
              {conversations.map((c) => (
                <button
                  key={c.senderId}
                  onClick={() => setSelected(c.senderId)}
                  className={`w-full text-left p-4 border transition-colors ${
                    selected === c.senderId
                      ? "bg-background border-foreground"
                      : "bg-background border-border hover:border-foreground/50"
                  }`}
                >
                  <p className="font-medium text-foreground truncate">
                    {c.senderName || c.senderId}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {c.lastDirection === "out" ? "Tu: " : ""}
                    {c.lastMessage}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">{formatDate(c.lastAt)}</p>
                </button>
              ))}
            </div>

            <div className="lg:col-span-2">
              {selected ? (
                <div className="bg-background border border-border p-4 sm:p-8 flex flex-col h-[70vh]">
                  <div className="mb-4 pb-4 border-b border-border">
                    <h2 className="font-serif text-xl font-medium text-foreground truncate">
                      {selectedConv?.senderName || selected}
                    </h2>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {threadLoading ? (
                      <p className="text-muted-foreground text-sm">Se încarcă...</p>
                    ) : (
                      thread.map((m) => (
                        <div
                          key={m.id}
                          className={`max-w-[75%] p-3 text-sm ${
                            m.direction === "out"
                              ? "ml-auto bg-foreground text-background"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.body}</p>
                          <p
                            className={`text-[10px] mt-1 ${
                              m.direction === "out"
                                ? "text-background/60"
                                : "text-muted-foreground"
                            }`}
                          >
                            {formatDate(m.createdAt)}
                          </p>
                        </div>
                      ))
                    )}
                    <div ref={bottomRef} />
                  </div>

                  <div className="mt-4 pt-4 border-t border-border">
                    {sendError && <p className="text-sm text-red-600 mb-2">{sendError}</p>}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendReply()}
                        placeholder="Scrie un răspuns..."
                        className="flex-1 border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:border-foreground"
                      />
                      <button
                        onClick={sendReply}
                        disabled={sending || !reply.trim()}
                        className="px-4 py-2 bg-foreground text-background text-sm font-medium disabled:opacity-50"
                      >
                        Trimite
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      După 24h de la ultimul mesaj al pacientului, răspunsul se trimite
                      automat cu eticheta HUMAN_AGENT (valabilă 7 zile).
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-background border border-border p-8 text-center text-muted-foreground">
                  Selectează o conversație pentru a o vizualiza
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
