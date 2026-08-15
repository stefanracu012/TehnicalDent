"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { secureFetch } from "@/lib/csrf-client";

type Step = "email" | "code";

export default function RecuperareParolaPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await secureFetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Cererea a eșuat.");
      setNotice(data.message || "Verificați emailul.");
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare de conexiune.");
    } finally {
      setLoading(false);
    }
  };

  const submitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Parolele nu coincid.");
      return;
    }
    setLoading(true);
    try {
      const res = await secureFetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Resetarea a eșuat.");
      router.push("/admin/login?resetat=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare de conexiune.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="font-serif text-2xl font-medium text-foreground">
            Recuperare parolă
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {step === "email"
              ? "Introduceți adresa de email a contului. Vă trimitem un cod de resetare."
              : "Introduceți codul primit pe email și noua parolă."}
          </p>
        </div>

        <div className="bg-background border border-border p-6 sm:p-8">
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          {notice && step === "code" && (
            <p className="text-sm text-muted-foreground mb-4">{notice}</p>
          )}

          {step === "email" ? (
            <form onSubmit={requestCode} className="space-y-4">
              <div>
                <label className="block text-sm text-foreground mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  className="w-full border border-border px-3 py-2 bg-background"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-5 py-2.5 bg-foreground text-background text-sm font-medium disabled:opacity-50"
              >
                {loading ? "Se trimite..." : "Trimite codul"}
              </button>
            </form>
          ) : (
            <form onSubmit={submitNewPassword} className="space-y-4">
              <div>
                <label className="block text-sm text-foreground mb-1">
                  Cod primit pe email
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6 cifre"
                  className="w-full border border-border px-3 py-2 bg-background tracking-[0.3em]"
                />
              </div>
              <div>
                <label className="block text-sm text-foreground mb-1">
                  Parola nouă
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
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
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full border border-border px-3 py-2 bg-background"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-5 py-2.5 bg-foreground text-background text-sm font-medium disabled:opacity-50"
              >
                {loading ? "Se salvează..." : "Salvează parola nouă"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError("");
                }}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                Nu ați primit codul? Cereți altul
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-6">
          <Link
            href="/admin/login"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Înapoi la autentificare
          </Link>
        </p>
      </div>
    </div>
  );
}
