"use client";

import { useCallback, useEffect, useState } from "react";
import { secureFetch } from "@/lib/csrf-client";

interface Allowed {
  id: string;
  channel: string;
  handle: string;
  label: string | null;
}

interface Candidate {
  channel: string;
  handle: string;
  label: string;
  lastMessage: string;
}

const CHANNELS = [
  { key: "whatsapp", label: "WhatsApp", note: "Funcționează complet." },
  { key: "messenger", label: "Messenger", note: "Mesajele ajung; răspunsul se trimite normal." },
  {
    key: "instagram",
    label: "Instagram",
    note: "Mesajele de la persoane fără rol pe aplicație nu ajung încă — App Review în curs.",
  },
] as const;

const MODES = [
  {
    key: "oprit",
    label: "Oprit",
    detail: "Nimeni nu primește răspuns automat. Rămâne mesajul fix de confirmare.",
  },
  {
    key: "selectat",
    label: "Doar conversațiile alese",
    detail: "Răspunde numai persoanelor adăugate mai jos. Restul primesc mesajul fix.",
  },
  {
    key: "toti",
    label: "Toți",
    detail: "Răspunde oricui scrie pe acest canal.",
  },
] as const;

export default function AdminAssistantPage() {
  const [channels, setChannels] = useState<Record<string, string>>({});
  const [allowed, setAllowed] = useState<Allowed[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await secureFetch("/api/admin/assistant");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare la încărcare");
      setChannels(data.channels ?? {});
      setAllowed(data.allowed ?? []);
      setCandidates(data.candidates ?? []);
      setConfigured(data.configured);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const send = async (payload: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await secureFetch("/api/admin/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Nu am putut salva.");
      }
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const setMode = async (channel: string, mode: string) => {
    if (
      mode === "toti" &&
      !confirm(
        `Asistentul va răspunde SINGUR oricui scrie pe ${channel}, fără să mai treacă prin tine. Continui?`,
      )
    ) {
      return;
    }
    await send({ action: "mode", channel, mode });
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      const res = await secureFetch(`/api/admin/assistant?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Nu am putut scoate.");
      }
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const isAllowed = (channel: string, handle: string) =>
    allowed.some((a) => a.channel === channel && a.handle === handle);

  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-14">
        <header className="mb-10">
          <h1 className="font-serif text-3xl sm:text-4xl font-medium text-foreground">
            Asistent AI
          </h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Răspunde pacienților, întreabă de ce serviciu au nevoie, se uită în
            calendarul medicilor și programează la cea mai apropiată oră liberă.
            Nu programează pe nimeni fără nume și număr de telefon.
          </p>
          <p className="mt-3 text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Începe cu o singură conversație a ta. Trece pe „Toți” abia când ai
            citit câteva discuții și ești mulțumit de cum vorbește.
          </p>
        </header>

        {!configured && (
          <div className="border border-yellow-300 bg-yellow-50 text-yellow-800 px-5 py-4 text-sm mb-8">
            Lipsește <code>OPENAI_API_KEY</code>. Până atunci asistentul nu
            răspunde, indiferent de setările de mai jos.
          </div>
        )}

        {error && (
          <div className="border border-red-200 bg-red-50 text-red-700 px-5 py-4 text-sm mb-8">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Se încarcă…</p>
        ) : (
          <div className="space-y-10">
            <section className="space-y-4">
              {CHANNELS.map((channel) => {
                const mode = channels[channel.key] ?? "oprit";
                return (
                  <div
                    key={channel.key}
                    className="bg-background border border-border p-5"
                  >
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <h2 className="font-serif text-lg font-medium text-foreground">
                        {channel.label}
                      </h2>
                      {mode !== "oprit" && (
                        <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                          {mode === "toti" ? "Activ pentru toți" : "Activ pentru cei aleși"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">{channel.note}</p>

                    <div className="space-y-2">
                      {MODES.map((m) => (
                        <label
                          key={m.key}
                          className="flex items-start gap-3 text-sm cursor-pointer"
                        >
                          <input
                            type="radio"
                            name={`mode-${channel.key}`}
                            checked={mode === m.key}
                            disabled={busy}
                            onChange={() => setMode(channel.key, m.key)}
                            className="w-4 h-4 mt-0.5"
                          />
                          <span>
                            {m.label}
                            <span className="block text-xs text-muted-foreground">
                              {m.detail}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>

            <section>
              <h2 className="font-serif text-xl font-medium text-foreground mb-1">
                Conversațiile alese
              </h2>
              <p className="text-sm text-muted-foreground mb-5 max-w-2xl leading-relaxed">
                Contează doar pe canalele setate pe „Doar conversațiile alese”.
                Pe un canal oprit nu răspunde nimănui, oricâte ai adăuga aici.
              </p>

              {allowed.length === 0 ? (
                <p className="text-sm text-muted-foreground bg-background border border-border p-5">
                  Niciuna încă. Alege una din lista de mai jos.
                </p>
              ) : (
                <div className="bg-background border border-border divide-y divide-border">
                  {allowed.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-3 px-5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {a.label || a.handle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {a.channel} · {a.handle}
                        </p>
                      </div>
                      <button
                        onClick={() => remove(a.id)}
                        disabled={busy}
                        className="text-xs font-semibold px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 shrink-0"
                      >
                        Scoate
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="font-serif text-xl font-medium text-foreground mb-1">
                Conversații recente
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                Ultimele persoane care au scris. Apasă ca să lași asistentul în
                conversația respectivă.
              </p>

              {candidates.length === 0 ? (
                <p className="text-sm text-muted-foreground bg-background border border-border p-5">
                  Nicio conversație încă.
                </p>
              ) : (
                <div className="bg-background border border-border divide-y divide-border max-h-[30rem] overflow-y-auto">
                  {candidates.map((c) => {
                    const on = isAllowed(c.channel, c.handle);
                    return (
                      <div
                        key={`${c.channel}:${c.handle}`}
                        className="flex items-center justify-between gap-3 px-5 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-foreground truncate">
                            {c.label}
                            <span className="ml-2 text-xs text-muted-foreground">
                              {c.channel}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {c.lastMessage}
                          </p>
                        </div>
                        <button
                          disabled={busy || on}
                          onClick={() =>
                            send({
                              action: "allow",
                              channel: c.channel,
                              handle: c.handle,
                              label: c.label,
                            })
                          }
                          className="text-xs font-semibold px-3 py-1.5 border border-border hover:bg-muted transition-colors disabled:opacity-40 shrink-0"
                        >
                          {on ? "Adăugată" : "Adaugă"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
