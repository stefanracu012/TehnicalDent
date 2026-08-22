"use client";

import { useState, useEffect } from "react";
import { secureFetch } from "@/lib/csrf-client";

interface Account {
  email: string;
  name: string;
  isOwner: boolean;
}

interface TelegramState {
  connected: boolean;
  telegramId: string | null;
  bot: string;
}

export default function AdminContPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [telegram, setTelegram] = useState<TelegramState | null>(null);
  const [linking, setLinking] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    secureFetch("/api/admin/account")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setAccount(data);
          setName(data.name || "");
        }
      })
      .catch(() => setError("Nu am putut încărca datele contului."));

    secureFetch("/api/admin/account/telegram")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setTelegram(data))
      .catch(() => {});
  }, []);

  // While a link is open, the connection happens in Telegram rather than here,
  // so the page has to look for it. Stops as soon as it connects, and gives up
  // after the code's own lifetime rather than polling forever.
  useEffect(() => {
    if (!link || telegram?.connected) return;

    const started = Date.now();
    const timer = setInterval(async () => {
      if (Date.now() - started > 15 * 60 * 1000) {
        clearInterval(timer);
        return;
      }
      try {
        const res = await secureFetch("/api/admin/account/telegram");
        if (!res.ok) return;
        const data: TelegramState = await res.json();
        setTelegram(data);
        if (data.connected) {
          setLink(null);
          setDone("Telegram conectat.");
          clearInterval(timer);
        }
      } catch {
        // A failed poll is not worth showing — the next one is 3 seconds away.
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [link, telegram?.connected]);

  const save = async (payload: Record<string, unknown>, message: string) => {
    setSaving(true);
    setError(null);
    setDone(null);
    try {
      const res = await secureFetch("/api/admin/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Salvarea a eșuat.");
      setDone(message);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const connectTelegram = async () => {
    setLinking(true);
    setError(null);
    setDone(null);
    try {
      const res = await secureFetch("/api/admin/account/telegram", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Nu am putut genera linkul.");
      setLink(data.link);
      window.open(data.link, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută.");
    } finally {
      setLinking(false);
    }
  };

  const disconnectTelegram = async () => {
    if (!confirm("Nu veți mai primi notificări pe Telegram. Continuați?")) return;
    setLinking(true);
    setError(null);
    setDone(null);
    try {
      const res = await secureFetch("/api/admin/account/telegram", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Nu am putut deconecta.");
      }
      setTelegram((t) => (t ? { ...t, connected: false, telegramId: null } : t));
      setLink(null);
      setDone("Telegram deconectat.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută.");
    } finally {
      setLinking(false);
    }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError("Parolele nu coincid.");
      return;
    }
    const ok = await save(
      { currentPassword, newPassword },
      "Parola a fost schimbată.",
    );
    if (ok) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="mb-6 sm:mb-10">
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground">
            Contul meu
          </h1>
          <p className="mt-2 text-muted-foreground">
            {account?.email ?? "Se încarcă..."}
            {account?.isOwner && " — cont principal de administrator"}
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 mb-4 border border-red-200 bg-red-50 p-3">
            {error}
          </p>
        )}
        {done && (
          <p className="text-sm text-green-700 mb-4 border border-green-200 bg-green-50 p-3">
            {done}
          </p>
        )}

        <div className="bg-background border border-border p-6 mb-6">
          <h2 className="font-serif text-lg font-medium text-foreground mb-4">
            Nume afișat
          </h2>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 min-w-[12rem] border border-border px-3 py-2 bg-background"
            />
            <button
              onClick={() => save({ name }, "Numele a fost salvat.")}
              disabled={saving || !name.trim()}
              className="px-5 py-2 bg-foreground text-background text-sm font-medium disabled:opacity-50"
            >
              Salvează
            </button>
          </div>
        </div>

        <div className="bg-background border border-border p-6 mb-6">
          <h2 className="font-serif text-lg font-medium text-foreground mb-1">
            Notificări pe Telegram
          </h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Conectați-vă contul ca să primiți, personal, programările făcute la
            dumneavoastră și lista pacienților de dimineață — cu butoane pentru
            „Finalizat” și „Nu a venit”.
          </p>

          {telegram?.connected ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-1.5">
                ✓ Conectat
              </span>
              <button
                onClick={disconnectTelegram}
                disabled={linking}
                className="px-4 py-2 text-sm border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                Deconectează
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={connectTelegram}
                disabled={linking}
                className="px-5 py-2 bg-foreground text-background text-sm font-medium disabled:opacity-50"
              >
                {linking ? "Se pregătește..." : "Conectează Telegram"}
              </button>

              {link && (
                <div className="mt-4 border-l-2 border-accent/40 pl-3">
                  <p className="text-sm text-foreground">
                    S-a deschis Telegram — apăsați <b>Start</b> acolo. Pagina se
                    actualizează singură.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    Dacă nu s-a deschis, deschideți acest link pe telefonul pe
                    care aveți Telegram:
                  </p>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs break-all underline text-foreground"
                  >
                    {link}
                  </a>
                  <p className="text-xs text-muted-foreground mt-2">
                    Linkul este valabil 15 minute și doar pentru contul
                    dumneavoastră.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="bg-background border border-border p-6">
          <h2 className="font-serif text-lg font-medium text-foreground mb-4">
            Schimbă parola
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-foreground mb-1">
                Parola actuală
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border border-border px-3 py-2 bg-background"
              />
            </div>
            <div>
              <label className="block text-sm text-foreground mb-1">
                Parola nouă
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minim 8 caractere"
                className="w-full border border-border px-3 py-2 bg-background"
              />
            </div>
            <div>
              <label className="block text-sm text-foreground mb-1">
                Confirmă parola nouă
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-border px-3 py-2 bg-background"
              />
            </div>
            <button
              onClick={changePassword}
              disabled={saving || !currentPassword || newPassword.length < 8}
              className="px-5 py-2 bg-foreground text-background text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Se salvează..." : "Schimbă parola"}
            </button>
          </div>

          {account?.isOwner && (
            <p className="text-xs text-muted-foreground mt-4 border-l-2 border-accent/40 pl-3 leading-relaxed">
              După ce schimbați parola aici, parola din variabilele de mediu
              (ADMIN_PASSWORD) nu mai permite autentificarea. Dacă o uitați,
              folosiți &laquo;Am uitat parola&raquo; din pagina de login.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
