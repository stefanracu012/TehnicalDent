"use client";

import { useState, useEffect } from "react";
import { secureFetch } from "@/lib/csrf-client";

interface Account {
  email: string;
  name: string;
  isOwner: boolean;
}

export default function AdminContPage() {
  const [account, setAccount] = useState<Account | null>(null);
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
  }, []);

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
