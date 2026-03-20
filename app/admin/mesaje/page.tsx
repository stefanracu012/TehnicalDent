"use client";

import { useState, useEffect } from "react";
import { secureFetch } from "@/lib/csrf-client";

interface ContactMessage {
  id: string;
  name: string;
  phone: string;
  email?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(
    null,
  );

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await secureFetch("/api/admin/messages");
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await secureFetch(`/api/admin/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      fetchMessages();
    } catch (error) {
      console.error("Error updating message:", error);
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("Sigur doriți să ștergeți acest mesaj?")) return;

    try {
      await secureFetch(`/api/admin/messages/${id}`, { method: "DELETE" });
      setSelectedMessage(null);
      fetchMessages();
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ro-RO", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-muted pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="mb-6 sm:mb-12">
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground">
            Mesaje de contact
          </h1>
          <p className="mt-2 text-muted-foreground">
            Mesajele primite prin formularul de contact
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Se încarcă...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 bg-white border border-border">
            <p className="text-muted-foreground">Nu există mesaje de afișat.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Messages List */}
            <div className="lg:col-span-1 space-y-2">
              {messages.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => {
                    setSelectedMessage(msg);
                    if (!msg.isRead) markAsRead(msg.id);
                  }}
                  className={`w-full text-left p-4 border transition-colors ${
                    selectedMessage?.id === msg.id
                      ? "bg-white border-foreground"
                      : "bg-white border-border hover:border-foreground/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <p
                      className={`font-medium ${!msg.isRead ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {msg.name}
                    </p>
                    {!msg.isRead && (
                      <span className="w-2 h-2 bg-accent rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {msg.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDate(msg.createdAt)}
                  </p>
                </button>
              ))}
            </div>

            {/* Message Detail */}
            <div className="lg:col-span-2">
              {selectedMessage ? (
                <div className="bg-white border border-border p-4 sm:p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="font-serif text-xl font-medium text-foreground">
                        {selectedMessage.name}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatDate(selectedMessage.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteMessage(selectedMessage.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Șterge
                    </button>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Telefon
                      </p>
                      <a
                        href={`tel:${selectedMessage.phone}`}
                        className="text-foreground hover:text-accent"
                      >
                        {selectedMessage.phone}
                      </a>
                    </div>
                    {selectedMessage.email && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Email
                        </p>
                        <a
                          href={`mailto:${selectedMessage.email}`}
                          className="text-foreground hover:text-accent"
                        >
                          {selectedMessage.email}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-border pt-6">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Mesaj
                    </p>
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                      {selectedMessage.message}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-border p-8 text-center text-muted-foreground">
                  Selectați un mesaj pentru a-l vizualiza
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
