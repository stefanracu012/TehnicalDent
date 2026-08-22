"use client";

import { useState, useEffect, useCallback } from "react";
import { secureFetch } from "@/lib/csrf-client";
import {
  ACTION_LABELS,
  ALL_PERMISSION_KEYS,
  PERMISSIONS,
  actionLabel,
  grantsPermission,
  permissionKey,
} from "@/lib/permissions";

/**
 * Stored permissions may be pre-split bare page keys, which grant every
 * action on that page. Expanding them means the checkboxes show what the
 * account can really do, and saving rewrites it in the current format.
 */
function expandPermissions(perms: string[]): string[] {
  return ALL_PERMISSION_KEYS.filter((key) => grantsPermission(perms, key));
}

/** One-line summary of an account's access, for the user list. */
function describePermissions(perms: string[]): string {
  const parts = PERMISSIONS.filter((p) =>
    grantsPermission(perms, permissionKey(p.key, "view")),
  ).map((p) => {
    const beyondView = p.actions.filter(
      (a) => a !== "view" && grantsPermission(perms, permissionKey(p.key, a)),
    );
    if (beyondView.length === 0) return `${p.label} (doar vizualizare)`;
    if (beyondView.length === p.actions.length - 1) return `${p.label} (tot)`;
    return `${p.label} (${beyondView
      .map((a) => actionLabel(p, a).toLowerCase())
      .join(", ")})`;
  });
  return parts.length > 0 ? parts.join(" · ") : "Fără permisiuni";
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  permissions: string[];
  isActive: boolean;
  teamMemberId: string | null;
  telegramId: string | null;
  isOwner?: boolean;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
}

const EMPTY_FORM = {
  email: "",
  name: "",
  password: "",
  teamMemberId: "",
  telegramId: "",
  permissions: [] as string[],
};

export default function AdminUtilizatoriPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [uRes, tRes] = await Promise.all([
        secureFetch("/api/admin/users"),
        secureFetch("/api/admin/team"),
      ]);
      const uData = await uRes.json();
      const tData = await tRes.json();
      setUsers(Array.isArray(uData) ? uData : []);
      setTeam(Array.isArray(tData) ? tData : []);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (user: AdminUser) => {
    setEditing(user);
    setForm({
      email: user.email,
      name: user.name,
      password: "",
      teamMemberId: user.teamMemberId || "",
      telegramId: user.telegramId || "",
      permissions: expandPermissions(user.permissions),
    });
    setError(null);
    setShowForm(true);
  };

  const togglePermission = (key: string) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter((p) => p !== key)
        : [...f.permissions, key],
    }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const url = editing ? `/api/admin/users/${editing.id}` : "/api/admin/users";
      const payload: Record<string, unknown> = {
        name: form.name,
        permissions: form.permissions,
        teamMemberId: form.teamMemberId || null,
        telegramId: form.telegramId.trim() || null,
      };
      if (!editing) {
        payload.email = form.email;
        payload.password = form.password;
      } else if (form.password) {
        payload.password = form.password;
      }

      const res = await secureFetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Salvarea a eșuat.");
      }
      setShowForm(false);
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user: AdminUser) => {
    await secureFetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    await fetchAll();
  };

  const remove = async (user: AdminUser) => {
    if (!confirm(`Ștergeți utilizatorul ${user.name}?`)) return;
    const res = await secureFetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Ștergerea a eșuat.");
      return;
    }
    await fetchAll();
  };

  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="mb-6 sm:mb-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground">
              Utilizatori
            </h1>
            <p className="mt-2 text-muted-foreground">
              Conturi de acces și permisiuni pentru personalul clinicii
            </p>
          </div>
          <button
            onClick={openNew}
            className="px-5 py-2.5 bg-foreground text-background text-sm font-medium"
          >
            Adaugă utilizator
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Se încarcă...</div>
        ) : (
          <div className="space-y-3">
            {users.length === 0 && (
              <div className="bg-background border border-border p-8 text-center text-muted-foreground">
                Nu există utilizatori încă. Contul principal de administrator
                rămâne activ oricum.
              </div>
            )}
            {users.map((user) => (
              <div
                key={user.id}
                className="bg-background border border-border p-4 sm:p-6 flex flex-wrap items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {user.name}
                    {user.isOwner && (
                      <span className="ml-2 text-xs text-accent">
                        (cont principal)
                      </span>
                    )}
                    {!user.isActive && (
                      <span className="ml-2 text-xs text-red-600">(dezactivat)</span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {user.isOwner
                      ? "Acces complet la toate paginile, inclusiv la cele adăugate ulterior."
                      : describePermissions(user.permissions)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(user)}
                    className="px-3 py-1.5 border border-border text-sm"
                  >
                    Editează
                  </button>
                  {/* The owner cannot be disabled or removed — doing so would
                      lock the clinic out of its own admin. */}
                  {!user.isOwner && (
                    <>
                      <button
                        onClick={() => toggleActive(user)}
                        className="px-3 py-1.5 border border-border text-sm"
                      >
                        {user.isActive ? "Dezactivează" : "Activează"}
                      </button>
                      <button
                        onClick={() => remove(user)}
                        className="px-3 py-1.5 border border-red-300 text-red-600 text-sm"
                      >
                        Șterge
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 overflow-y-auto z-50">
            <div className="bg-background border border-border p-6 sm:p-8 max-w-2xl w-full my-8">
              <h2 className="font-serif text-xl font-medium text-foreground mb-6">
                {editing ? `Editare: ${editing.name}` : "Utilizator nou"}
              </h2>

              {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-foreground mb-1">Nume</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-border px-3 py-2 bg-background"
                  />
                </div>

                <div>
                  <label className="block text-sm text-foreground mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    disabled={!!editing}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-border px-3 py-2 bg-background disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-sm text-foreground mb-1">
                    {editing ? "Parolă nouă (lăsați gol pentru a păstra)" : "Parolă"}
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Minim 8 caractere"
                    className="w-full border border-border px-3 py-2 bg-background"
                  />
                </div>

                <div>
                  <label className="block text-sm text-foreground mb-1">
                    Este doctor? (leagă contul de un membru al echipei)
                  </label>
                  <select
                    value={form.teamMemberId}
                    onChange={(e) => setForm({ ...form, teamMemberId: e.target.value })}
                    className="w-full border border-border px-3 py-2 bg-background"
                  >
                    <option value="">Nu — cont de personal</option>
                    {team.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {m.role}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Doctorii legați aici își pot completa propriul calendar de
                    disponibilitate.
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-foreground mb-1">
                    ID Telegram (opțional)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.telegramId}
                    onChange={(e) => setForm({ ...form, telegramId: e.target.value })}
                    placeholder="ex. 123456789"
                    className="w-full border border-border px-3 py-2 bg-background"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Aici primește doctorul, personal, programările lui noi și
                    lista pacienților de dimineață. Îl află scriind /start
                    botului clinicii. Fără el, notificările merg doar în grupul
                    comun.
                  </p>
                </div>

                {editing?.isOwner ? (
                  <p className="text-sm text-muted-foreground border border-border p-3">
                    Contul principal are automat acces la tot, inclusiv la
                    paginile adăugate în viitor, deci nu are permisiuni de
                    configurat. Puteți schimba numele și parola.
                  </p>
                ) : (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <label className="block text-sm text-foreground">
                      Permisiuni — ce poate face pe fiecare pagină
                    </label>
                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, permissions: [...ALL_PERMISSION_KEYS] }))}
                        className="px-2 py-1 border border-border"
                      >
                        Bifează tot
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, permissions: [] }))}
                        className="px-2 py-1 border border-border"
                      >
                        Golește
                      </button>
                    </div>
                  </div>
                  <div className="border border-border divide-y divide-border">
                    {PERMISSIONS.map((p) => (
                      <div
                        key={p.key}
                        className="p-3 flex flex-wrap items-center gap-x-4 gap-y-2"
                      >
                        <span className="text-sm text-foreground w-full sm:w-48 shrink-0">
                          {p.label}
                        </span>
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                          {p.actions.map((action) => {
                            const key = permissionKey(p.key, action);
                            return (
                              <label
                                key={key}
                                className="flex items-center gap-1.5 text-sm text-muted-foreground"
                              >
                                <input
                                  type="checkbox"
                                  checked={form.permissions.includes(key)}
                                  onChange={() => togglePermission(key)}
                                />
                                {actionLabel(p, action)}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Fără &laquo;{ACTION_LABELS.view}&raquo; pagina nu apare deloc în
                    meniu. Acțiunile care nu există pentru o pagină nu sunt afișate.
                  </p>
                </div>
                )}
              </div>

              <div className="flex gap-2 mt-8">
                <button
                  onClick={save}
                  disabled={saving}
                  className="px-5 py-2.5 bg-foreground text-background text-sm font-medium disabled:opacity-50"
                >
                  {saving ? "Se salvează..." : "Salvează"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 border border-border text-sm"
                >
                  Anulează
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
