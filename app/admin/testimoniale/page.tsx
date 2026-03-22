"use client";

import { useState, useEffect } from "react";
import { secureFetch } from "@/lib/csrf-client";
import LanguageTabs from "@/components/admin/LanguageTabs";
import AutoTranslateButton from "@/components/admin/AutoTranslateButton";
import ImageUpload from "@/components/admin/ImageUpload";

type Translations = Record<string, Record<string, string>>;

interface Testimonial {
  id: string;
  name: string;
  content: string;
  image?: string | null;
  service: string | null;
  isActive: boolean;
  createdAt: string;
  translations?: Translations | null;
}

const emptyTestimonial = {
  name: "",
  content: "",
  image: "",
  service: "",
  isActive: true,
};

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [formData, setFormData] = useState(emptyTestimonial);
  const [showForm, setShowForm] = useState(false);
  const [activeLocale, setActiveLocale] = useState("ro");
  const [translations, setTranslations] = useState<Translations>({});

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      const res = await secureFetch("/api/admin/testimonials");
      const data = await res.json();
      setTestimonials(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getField = (field: string): string => {
    if (activeLocale === "ro")
      return (
        ((formData as unknown as Record<string, unknown>)[field] as string) ||
        ""
      );
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
    setFormData(emptyTestimonial);
    setTranslations({});
    setActiveLocale("ro");
    setShowForm(true);
  };

  const openEdit = (t: Testimonial) => {
    setEditing(t);
    setFormData({
      name: t.name,
      content: t.content,
      image: t.image || "",
      service: t.service || "",
      isActive: t.isActive,
    });
    setTranslations((t.translations as Translations) || {});
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

      const url = editing
        ? `/api/admin/testimonials/${editing.id}`
        : "/api/admin/testimonials";
      const method = editing ? "PATCH" : "POST";
      const res = await secureFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          image: formData.image || null,
          service: formData.service || null,
          translations:
            Object.keys(cleanTranslations).length > 0
              ? cleanTranslations
              : null,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setEditing(null);
        fetchTestimonials();
      } else {
        alert("Eroare la salvare");
      }
    } catch {
      alert("Eroare la salvare");
    } finally {
      setSaving(false);
    }
  };

  const deleteTestimonial = async (id: string) => {
    if (!confirm("Sigur doriți să ștergeți acest testimonial?")) return;
    try {
      await secureFetch(`/api/admin/testimonials/${id}`, { method: "DELETE" });
      fetchTestimonials();
    } catch {
      alert("Eroare la ștergere");
    }
  };

  const toggleActive = async (t: Testimonial) => {
    try {
      await secureFetch(`/api/admin/testimonials/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !t.isActive }),
      });
      fetchTestimonials();
    } catch {
      alert("Eroare");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ro-RO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-muted pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 sm:mb-12">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground">
              Testimoniale
            </h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">
              Administrează testimonialele pacienților
            </p>
          </div>
          <button
            onClick={openNew}
            className="self-start sm:self-auto bg-foreground text-white text-sm font-semibold px-5 py-2.5 sm:px-6 sm:py-3 hover:bg-foreground/90 transition-colors"
          >
            + Adaugă testimonial
          </button>
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-5 sm:p-8 rounded-t-2xl sm:rounded-lg">
              <h2 className="font-serif text-2xl font-medium text-foreground mb-6">
                {editing ? "Editează testimonial" : "Adaugă testimonial nou"}
              </h2>

              <div className="mb-4 space-y-3">
                <LanguageTabs
                  active={activeLocale}
                  onChange={setActiveLocale}
                />
                <AutoTranslateButton
                  formData={formData as unknown as Record<string, unknown>}
                  translatableFields={["content", "service"]}
                  onTranslationsReady={setTranslations}
                />
                {activeLocale !== "ro" && (
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <svg
                      className="h-3.5 w-3.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                      />
                    </svg>
                    Editați traducerea. Câmpurile goale vor folosi textul în
                    română.
                  </p>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Image - RO tab only */}
                {activeLocale === "ro" && (
                  <ImageUpload
                    value={formData.image}
                    onChange={(url) =>
                      setFormData((p) => ({ ...p, image: url }))
                    }
                    folder="testimonials"
                    label="Fotografia pacientului (opțional)"
                  />
                )}

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Numele pacientului *
                  </label>
                  <input
                    type="text"
                    required={activeLocale === "ro"}
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, name: e.target.value }))
                    }
                    className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none"
                    disabled={activeLocale !== "ro"}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Testimonialul *
                  </label>
                  <textarea
                    required={activeLocale === "ro"}
                    rows={5}
                    value={getField("content")}
                    onChange={(e) => setField("content", e.target.value)}
                    placeholder={
                      activeLocale !== "ro" ? formData.content : undefined
                    }
                    className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Serviciul asociat (opțional)
                  </label>
                  {activeLocale === "ro" ? (
                    <>
                      <input
                        type="text"
                        list="service-suggestions"
                        value={formData.service}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, service: e.target.value }))
                        }
                        placeholder="Scrie sau alege un serviciu..."
                        className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none"
                      />
                      <datalist id="service-suggestions">
                        <option value="Implantologie" />
                        <option value="Ortodonție" />
                        <option value="Estetică dentară" />
                        <option value="Chirurgie orală" />
                        <option value="Protetică dentară" />
                        <option value="Endodonție" />
                        <option value="Parodontologie" />
                        <option value="Pedodonție" />
                        <option value="Reabilitare orală completă" />
                        <option value="Stomatologie generală" />
                        <option value="Pedodonție și stomatologie generală" />
                      </datalist>
                    </>
                  ) : (
                    <input
                      type="text"
                      value={getField("service")}
                      onChange={(e) => setField("service", e.target.value)}
                      placeholder={formData.service || "Traducere serviciu..."}
                      className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none"
                    />
                  )}
                </div>

                {activeLocale === "ro" && (
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          isActive: e.target.checked,
                        }))
                      }
                      className="w-4 h-4"
                    />
                    <label
                      htmlFor="isActive"
                      className="text-sm text-foreground"
                    >
                      Activ (vizibil pe site)
                    </label>
                  </div>
                )}

                <div className="flex justify-end gap-4 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-3 text-sm font-semibold border border-border hover:bg-muted transition-colors"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-foreground text-white text-sm font-semibold px-6 py-3 hover:bg-foreground/90 transition-colors disabled:opacity-50"
                  >
                    {saving ? "Se salvează..." : "Salvează"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Se încarcă...
          </div>
        ) : testimonials.length === 0 ? (
          <div className="text-center py-12 bg-white border border-border">
            <p className="text-muted-foreground mb-4">
              Nu există testimoniale.
            </p>
            <button
              onClick={openNew}
              className="text-accent hover:text-accent/80 text-sm font-semibold"
            >
              Adaugă primul testimonial
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {testimonials.map((t) => (
              <div
                key={t.id}
                className={`bg-white border border-border p-4 sm:p-6 ${!t.isActive ? "opacity-50" : ""}`}
              >
                <div className="flex gap-4">
                  {/* Avatar thumbnail */}
                  <div className="w-12 h-12 flex-shrink-0 overflow-hidden rounded-full bg-muted">
                    {t.image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={t.image}
                        alt={t.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm font-semibold">
                        {t.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                      <h3 className="font-serif text-base sm:text-lg font-medium text-foreground">
                        {t.name}
                      </h3>
                      {t.service && (
                        <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                          {t.service}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(t.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      &ldquo;{t.content}&rdquo;
                    </p>
                    <div className="flex gap-3 mt-3 pt-3 border-t border-border">
                      <button
                        onClick={() => openEdit(t)}
                        className="text-xs text-accent hover:text-accent/80 font-semibold"
                      >
                        Editează
                      </button>
                      <button
                        onClick={() => toggleActive(t)}
                        className="text-xs text-muted-foreground hover:text-foreground font-semibold"
                      >
                        {t.isActive ? "Dezactivează" : "Activează"}
                      </button>
                      <button
                        onClick={() => deleteTestimonial(t.id)}
                        className="text-xs text-red-600 hover:text-red-800 font-semibold"
                      >
                        Șterge
                      </button>
                    </div>
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
