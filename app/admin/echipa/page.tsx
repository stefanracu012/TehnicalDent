"use client";

import { useState, useEffect } from "react";
import ImageUpload from "@/components/admin/ImageUpload";
import { secureFetch } from "@/lib/csrf-client";
import LanguageTabs from "@/components/admin/LanguageTabs";

type Translations = Record<string, Record<string, string>>;

interface TeamMember {
  id: string;
  name: string;
  role: string;
  description: string;
  image: string;
  order: number;
  isActive: boolean;
  translations?: Translations | null;
}

const emptyMember = {
  name: "",
  role: "",
  description: "",
  image: "",
  order: 0,
  isActive: true,
};

export default function AdminTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [formData, setFormData] = useState(emptyMember);
  const [showForm, setShowForm] = useState(false);
  const [activeLocale, setActiveLocale] = useState("ro");
  const [translations, setTranslations] = useState<Translations>({});

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await secureFetch("/api/admin/team");
      const data = await res.json();
      setMembers(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getField = (field: string): string => {
    if (activeLocale === "ro")
      return ((formData as unknown as Record<string, unknown>)[field] as string) || "";
    return (translations[activeLocale]?.[field] as string) || "";
  };

  const setField = (field: string, value: string) => {
    if (activeLocale === "ro") {
      setFormData((prev) => ({ ...prev, [field]: value }));
    } else {
      setTranslations((prev) => ({
        ...prev,
        [activeLocale]: { ...(prev[activeLocale] || {}), [field]: value },
      }));
    }
  };

  const openNew = () => {
    setEditing(null);
    setFormData(emptyMember);
    setTranslations({});
    setActiveLocale("ro");
    setShowForm(true);
  };

  const openEdit = (member: TeamMember) => {
    setEditing(member);
    setFormData({
      name: member.name,
      role: member.role,
      description: member.description,
      image: member.image,
      order: member.order,
      isActive: member.isActive,
    });
    setTranslations((member.translations as Translations) || {});
    setActiveLocale("ro");
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const cleanTranslations: Translations = {};
      for (const [loc, fields] of Object.entries(translations)) {
        const cleaned: Record<string, string> = {};
        for (const [key, val] of Object.entries(fields)) {
          if (typeof val === "string" && val.trim()) cleaned[key] = val;
        }
        if (Object.keys(cleaned).length > 0) cleanTranslations[loc] = cleaned;
      }

      const url = editing ? `/api/admin/team/${editing.id}` : "/api/admin/team";
      const method = editing ? "PATCH" : "POST";
      const res = await secureFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          translations: Object.keys(cleanTranslations).length > 0 ? cleanTranslations : null,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setEditing(null);
        fetchMembers();
      } else {
        alert("Eroare la salvare");
      }
    } catch {
      alert("Eroare la salvare");
    } finally {
      setSaving(false);
    }
  };

  const deleteMember = async (id: string) => {
    if (!confirm("Sigur doriți să ștergeți acest membru?")) return;
    try {
      await secureFetch(`/api/admin/team/${id}`, { method: "DELETE" });
      fetchMembers();
    } catch {
      alert("Eroare la ștergere");
    }
  };

  const toggleActive = async (member: TeamMember) => {
    try {
      await secureFetch(`/api/admin/team/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !member.isActive }),
      });
      fetchMembers();
    } catch {
      alert("Eroare");
    }
  };

  return (
    <div className="min-h-screen bg-muted pt-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="font-serif text-3xl font-medium text-foreground">Echipa</h1>
            <p className="mt-2 text-muted-foreground">Gestionați membrii echipei afișați pe site</p>
          </div>
          <button onClick={openNew} className="bg-foreground text-white text-sm font-semibold px-6 py-3 hover:bg-foreground/90 transition-colors">+ Adaugă membru</button>
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 rounded-lg">
              <h2 className="font-serif text-2xl font-medium text-foreground mb-6">
                {editing ? "Editează membru" : "Adaugă membru nou"}
              </h2>

              <LanguageTabs active={activeLocale} onChange={setActiveLocale} />
              {activeLocale !== "ro" && (
                <p className="text-xs text-muted-foreground mb-4 -mt-4">
                  ✏️ Editați traducerea. Câmpurile goale vor folosi textul în română.
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Nume complet *</label>
                    <input type="text" required={activeLocale === "ro"} value={activeLocale === "ro" ? formData.name : formData.name} onChange={(e) => activeLocale === "ro" ? setFormData((p) => ({ ...p, name: e.target.value })) : undefined} className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none" disabled={activeLocale !== "ro"} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Rol / Specialitate *</label>
                    <input type="text" required={activeLocale === "ro"} value={getField("role")} onChange={(e) => setField("role", e.target.value)} placeholder={activeLocale !== "ro" ? formData.role : "ex: Medic ortodont"} className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Descriere *</label>
                  <textarea required={activeLocale === "ro"} rows={4} value={getField("description")} onChange={(e) => setField("description", e.target.value)} placeholder={activeLocale !== "ro" ? formData.description : undefined} className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none resize-none" />
                </div>

                {activeLocale === "ro" && (
                  <>
                    <ImageUpload value={formData.image} onChange={(url) => setFormData((p) => ({ ...p, image: url }))} folder="team" label="Fotografie" />
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Ordine afișare</label>
                        <input type="number" value={formData.order} onChange={(e) => setFormData((p) => ({ ...p, order: parseInt(e.target.value) || 0 }))} className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none" />
                      </div>
                      <div className="flex items-end pb-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4" />
                          <span className="text-sm text-foreground">Activ</span>
                        </label>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-4 pt-4 border-t border-border">
                  <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 text-sm font-semibold border border-border hover:bg-muted transition-colors">Anulează</button>
                  <button type="submit" disabled={saving} className="bg-foreground text-white text-sm font-semibold px-6 py-3 hover:bg-foreground/90 transition-colors disabled:opacity-50">
                    {saving ? "Se salvează..." : "Salvează"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Se încarcă...</div>
        ) : members.length === 0 ? (
          <div className="text-center py-12 bg-white border border-border">
            <p className="text-muted-foreground mb-4">Nu există membri în echipă.</p>
            <button onClick={openNew} className="text-accent hover:text-accent/80 text-sm font-semibold">Adaugă primul membru</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {members.map((member) => (
              <div key={member.id} className={`bg-white border border-border overflow-hidden ${!member.isActive ? "opacity-50" : ""}`}>
                {member.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={member.image} alt={member.name} className="w-full h-56 object-cover" />
                ) : (
                  <div className="w-full h-56 bg-muted flex items-center justify-center">
                    <svg className="w-16 h-16 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                <div className="p-5">
                  <h3 className="font-serif text-lg font-medium text-foreground">{member.name}</h3>
                  <p className="text-sm text-accent mt-0.5">{member.role}</p>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{member.description}</p>
                  <div className="flex gap-3 mt-4 pt-4 border-t border-border">
                    <button onClick={() => openEdit(member)} className="text-xs text-accent hover:text-accent/80 font-semibold">Editează</button>
                    <button onClick={() => toggleActive(member)} className="text-xs text-muted-foreground hover:text-foreground font-semibold">{member.isActive ? "Dezactivează" : "Activează"}</button>
                    <button onClick={() => deleteMember(member.id)} className="text-xs text-red-600 hover:text-red-800 font-semibold">Șterge</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
