"use client";

import { useState, useEffect, useRef } from "react";
import { secureFetch } from "@/lib/csrf-client";

interface Conversation {
  phone: string;
  patientName: string | null;
  lastMessage: string;
  lastDirection: "in" | "out";
  lastAt: string;
  unread: number;
}

interface ThreadMessage {
  id: string;
  phone: string;
  direction: "in" | "out";
  body: string;
  createdAt: string;
}

export default function AdminWhatsAppPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedPhone) fetchThread(selectedPhone);
  }, [selectedPhone]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread]);

  const fetchConversations = async () => {
    try {
      const res = await secureFetch("/api/admin/whatsapp");
      const data = await res.json();
      setConversations(data);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchThread = async (phone: string) => {
    setThreadLoading(true);
    try {
      const res = await secureFetch(`/api/admin/whatsapp/${encodeURIComponent(phone)}`);
      const data = await res.json();
      setThread(data);
    } catch (error) {
      console.error("Error fetching thread:", error);
    } finally {
      setThreadLoading(false);
    }
  };

  const sendReply = async () => {
    if (!selectedPhone || !reply.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await secureFetch(`/api/admin/whatsapp/${encodeURIComponent(selectedPhone)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: reply.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Trimiterea a eșuat.");
      }
      setReply("");
      await fetchThread(selectedPhone);
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
    });

  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="mb-6 sm:mb-12">
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground">
            WhatsApp
          </h1>
          <p className="mt-2 text-muted-foreground">
            Conversații primite prin WhatsApp
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Se încarcă...</div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12 bg-background border border-border">
            <p className="text-muted-foreground">Nu există conversații încă.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Conversation list */}
            <div className="lg:col-span-1 space-y-2">
              {conversations.map((c) => (
                <button
                  key={c.phone}
                  onClick={() => setSelectedPhone(c.phone)}
                  className={`w-full text-left p-4 border transition-colors ${
                    selectedPhone === c.phone
                      ? "bg-background border-foreground"
                      : "bg-background border-border hover:border-foreground/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-foreground">
                      {c.patientName || c.phone}
                    </p>
                    {c.unread > 0 && (
                      <span className="w-2 h-2 bg-accent rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                  {c.patientName && (
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {c.lastDirection === "out" ? "Tu: " : ""}
                    {c.lastMessage}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDate(c.lastAt)}
                  </p>
                </button>
              ))}
            </div>

            {/* Thread */}
            <div className="lg:col-span-2">
              {selectedPhone ? (
                <div className="bg-background border border-border p-4 sm:p-8 flex flex-col h-[70vh]">
                  <div className="mb-4 pb-4 border-b border-border">
                    <h2 className="font-serif text-xl font-medium text-foreground">
                      {conversations.find((c) => c.phone === selectedPhone)?.patientName ||
                        selectedPhone}
                    </h2>
                    <p className="text-sm text-muted-foreground">{selectedPhone}</p>
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
                    {sendError && (
                      <p className="text-sm text-red-600 mb-2">{sendError}</p>
                    )}
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
                      Funcționează doar dacă pacientul a scris în ultimele 24h.
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
