"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { secureFetch } from "@/lib/csrf-client";

interface Conversation {
  senderId: string;
  senderName: string | null;
  lastMessage: string;
  lastDirection: "in" | "out";
  lastAt: string;
  messageCount: number;
}

interface ThreadMessage {
  id: string;
  senderId: string;
  direction: "in" | "out";
  body: string;
  createdAt: string;
}

const STATES = [
  { key: "all", label: "Toate" },
  { key: "unanswered", label: "Fără răspuns" },
  { key: "answered", label: "Cu răspuns" },
] as const;

const NAMED = [
  { key: "all", label: "Toate" },
  { key: "named", label: "Cu nume" },
  { key: "unnamed", label: "Fără nume" },
] as const;

const RANGES = [
  { key: "all", label: "Oricând" },
  { key: "1d", label: "Ultimele 24h" },
  { key: "7d", label: "Ultimele 7 zile" },
  { key: "30d", label: "Ultimele 30 zile" },
  { key: "90d", label: "Ultimele 90 zile" },
] as const;

const SORTS = [
  { key: "newest", label: "Cele mai noi" },
  { key: "oldest", label: "Cele mai vechi" },
  { key: "busiest", label: "Cele mai multe mesaje" },
] as const;

const PAGE_SIZES = [20, 50, 100];

/**
 * Messenger and Instagram inboxes are the same screen over the same API,
 * differing only in which channel they read — so the page components stay
 * thin and this holds the behaviour.
 *
 * The list is paginated on the server: one page of conversations at a time,
 * not the whole inbox, so it stays fast as the number of patients grows.
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
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [unanswered, setUnanswered] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [state, setState] = useState<string>("all");
  const [named, setNamed] = useState<string>("all");
  const [range, setRange] = useState<string>("all");
  const [sort, setSort] = useState<string>("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [selected, setSelected] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Typing shouldn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Any change to what's being asked for starts again at the first page,
  // otherwise a filter can land the user on a page that no longer exists.
  useEffect(() => {
    setPage(1);
  }, [query, state, named, range, sort, pageSize]);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        state,
        named,
        sort,
      });
      if (query) params.set("q", query);
      if (range !== "all") params.set("range", range);

      const res = await secureFetch(`/api/admin/social/${channel}?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare la încărcare");

      setConversations(data.conversations ?? []);
      setTotal(data.total ?? 0);
      setPageCount(data.pageCount ?? 1);
      setUnanswered(data.unanswered ?? 0);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [channel, page, pageSize, query, state, named, range, sort]);

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
  const filtersOn =
    Boolean(query) || state !== "all" || named !== "all" || range !== "all";

  const resetFilters = () => {
    setSearch("");
    setState("all");
    setNamed("all");
    setRange("all");
    setSort("newest");
  };

  const selectClass =
    "border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground";

  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="mb-6 sm:mb-10">
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground">
            {title}
          </h1>
          <p className="mt-2 text-muted-foreground">{subtitle}</p>
        </div>

        <section className="bg-background border border-border p-4 sm:p-5 mb-6">
          <div className="flex flex-col gap-3">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută după nume, text din mesaj sau ID…"
              className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-foreground"
            />

            <div className="flex flex-wrap gap-2">
              <label className="sr-only" htmlFor="filtru-stare">
                Stare
              </label>
              <select
                id="filtru-stare"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className={selectClass}
              >
                {STATES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>

              <label className="sr-only" htmlFor="filtru-nume">
                Nume
              </label>
              <select
                id="filtru-nume"
                value={named}
                onChange={(e) => setNamed(e.target.value)}
                className={selectClass}
              >
                {NAMED.map((n) => (
                  <option key={n.key} value={n.key}>
                    {n.label}
                  </option>
                ))}
              </select>

              <label className="sr-only" htmlFor="filtru-perioada">
                Perioadă
              </label>
              <select
                id="filtru-perioada"
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className={selectClass}
              >
                {RANGES.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>

              <label className="sr-only" htmlFor="filtru-sortare">
                Sortare
              </label>
              <select
                id="filtru-sortare"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className={selectClass}
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>

              <label className="sr-only" htmlFor="filtru-pagina">
                Conversații pe pagină
              </label>
              <select
                id="filtru-pagina"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className={selectClass}
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size} pe pagină
                  </option>
                ))}
              </select>

              {filtersOn && (
                <button
                  onClick={resetFilters}
                  className="px-3 py-2 text-sm border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                >
                  Șterge filtrele
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                {total} {total === 1 ? "conversație" : "conversații"}
                {filtersOn ? " după filtre" : ""}
              </span>
              {unanswered > 0 && (
                <button
                  onClick={() => setState("unanswered")}
                  className="text-amber-700 hover:underline"
                >
                  {unanswered} fără răspuns
                </button>
              )}
              <span>
                Pagina {page} din {pageCount}
              </span>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            {loading ? (
              <div className="bg-background border border-border p-8 text-center text-muted-foreground text-sm">
                Se încarcă…
              </div>
            ) : conversations.length === 0 ? (
              <div className="bg-background border border-border p-8 text-center text-muted-foreground text-sm">
                {filtersOn
                  ? "Nicio conversație pentru filtrele alese."
                  : "Nu există conversații încă."}
              </div>
            ) : (
              <div className="space-y-2">
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
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-foreground truncate">
                        {c.senderName || c.senderId}
                      </p>
                      {c.lastDirection === "in" && (
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5">
                          nou
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {c.lastDirection === "out" ? "Tu: " : ""}
                      {c.lastMessage}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDate(c.lastAt)} · {c.messageCount}{" "}
                      {c.messageCount === 1 ? "mesaj" : "mesaje"}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {pageCount > 1 && (
              <div className="flex items-center justify-between gap-2 mt-3">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1 || loading}
                  className="px-3 py-2 text-sm border border-border bg-background hover:border-foreground transition-colors disabled:opacity-40 disabled:hover:border-border"
                >
                  ← Înapoi
                </button>
                <span className="text-xs text-muted-foreground">
                  {page} / {pageCount}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, pageCount))}
                  disabled={page >= pageCount || loading}
                  className="px-3 py-2 text-sm border border-border bg-background hover:border-foreground transition-colors disabled:opacity-40 disabled:hover:border-border"
                >
                  Înainte →
                </button>
              </div>
            )}
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
      </div>
    </div>
  );
}
