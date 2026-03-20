"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { secureFetch } from "@/lib/csrf-client";
import ImageUpload from "@/components/admin/ImageUpload";
import LanguageTabs from "@/components/admin/LanguageTabs";
import AutoTranslateButton from "@/components/admin/AutoTranslateButton";

type Translations = Record<string, Record<string, string | string[]>>;

export default function NewServicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeLocale, setActiveLocale] = useState("ro");
  const [translations, setTranslations] = useState<Translations>({});
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    shortDesc: "",
    description: "",
    overview: "",
    process: "",
    recovery: "",
    benefits: [""],
    images: [""],
    category: "",
    order: 0,
    isActive: true,
  });

  useEffect(() => {
    secureFetch("/api/admin/services")
      .then((res) => res.json())
      .then((services: { category: string }[]) => {
        const cats = [...new Set(services.map((s) => s.category).filter(Boolean))];
        setExistingCategories(cats.sort());
      })
      .catch(() => {});
  }, []);

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

  const getBenefits = (): string[] => {
    if (activeLocale === "ro") return formData.benefits;
    const t = translations[activeLocale]?.benefits;
    if (Array.isArray(t) && t.length > 0) return t as string[];
    return formData.benefits.map(() => "");
  };

  const setBenefit = (index: number, value: string) => {
    if (activeLocale === "ro") {
      setFormData((prev) => ({
        ...prev,
        benefits: prev.benefits.map((b, i) => (i === index ? value : b)),
      }));
    } else {
      const current = getBenefits();
      const updated = current.map((b, i) => (i === index ? value : b));
      setTranslations((prev) => ({
        ...prev,
        [activeLocale]: { ...(prev[activeLocale] || {}), benefits: updated },
      }));
    }
  };

  const handleArrayChange = (field: "images", index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  };

  const addArrayItem = (field: "benefits" | "images") => {
    if (field === "benefits") {
      setFormData((prev) => ({ ...prev, benefits: [...prev.benefits, ""] }));
      setTranslations((prev) => {
        const updated = { ...prev };
        for (const loc of ["en", "ru", "it"]) {
          if (updated[loc]?.benefits && Array.isArray(updated[loc].benefits)) {
            updated[loc] = {
              ...updated[loc],
              benefits: [...(updated[loc].benefits as string[]), ""],
            };
          }
        }
        return updated;
      });
    } else {
      setFormData((prev) => ({ ...prev, [field]: [...prev[field], ""] }));
    }
  };

  const removeArrayItem = (field: "benefits" | "images", index: number) => {
    if (field === "benefits") {
      setFormData((prev) => ({
        ...prev,
        benefits: prev.benefits.filter((_, i) => i !== index),
      }));
      setTranslations((prev) => {
        const updated = { ...prev };
        for (const loc of ["en", "ru", "it"]) {
          if (updated[loc]?.benefits && Array.isArray(updated[loc].benefits)) {
            updated[loc] = {
              ...updated[loc],
              benefits: (updated[loc].benefits as string[]).filter(
                (_, i) => i !== index,
              ),
            };
          }
        }
        return updated;
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: prev[field].filter((_, i) => i !== index),
      }));
    }
  };

  const generateSlug = () => {
    const slug = formData.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    setFormData((prev) => ({ ...prev, slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cleanTranslations: Translations = {};
      for (const [loc, fields] of Object.entries(translations)) {
        const cleaned: Record<string, string | string[]> = {};
        for (const [key, val] of Object.entries(fields)) {
          if (Array.isArray(val)) {
            if (val.some((v) => typeof v === "string" && v.trim()))
              cleaned[key] = val;
          } else if (typeof val === "string" && val.trim()) {
            cleaned[key] = val;
          }
        }
        if (Object.keys(cleaned).length > 0) cleanTranslations[loc] = cleaned;
      }

      const response = await secureFetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          benefits: formData.benefits.filter((b) => b.trim()),
          images: formData.images.filter((i) => i.trim()),
          translations:
            Object.keys(cleanTranslations).length > 0
              ? cleanTranslations
              : null,
        }),
      });
      if (response.ok) {
        router.push("/admin/servicii");
      } else {
        alert("A apărut o eroare la salvarea serviciului.");
      }
    } catch (error) {
      console.error("Error creating service:", error);
      alert("A apărut o eroare la salvarea serviciului.");
    } finally {
      setLoading(false);
    }
  };

  const benefits = getBenefits();

  return (
    <div className="min-h-screen bg-muted pt-24">
      <div className="mx-auto max-w-4xl px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-medium text-foreground">
            Adaugă serviciu nou
          </h1>
          <p className="mt-2 text-muted-foreground">
            Completați informațiile pentru noul serviciu
          </p>
        </div>

        <div className="mb-6 space-y-3">
          <LanguageTabs active={activeLocale} onChange={setActiveLocale} />
          <AutoTranslateButton
            formData={formData as unknown as Record<string, unknown>}
            translatableFields={[
              "title",
              "shortDesc",
              "description",
              "overview",
              "process",
              "recovery",
              "benefits",
              "category",
            ]}
            onTranslationsReady={setTranslations}
          />
          {activeLocale !== "ro" && (
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
              Editați traducerea. Câmpurile goale vor folosi textul în română.
            </p>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-border p-8"
        >
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Titlu *
                </label>
                <input
                  type="text"
                  required={activeLocale === "ro"}
                  value={getField("title")}
                  onChange={(e) => setField("title", e.target.value)}
                  onBlur={activeLocale === "ro" ? generateSlug : undefined}
                  placeholder={
                    activeLocale !== "ro" ? formData.title : undefined
                  }
                  className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Slug (URL) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, slug: e.target.value }))
                  }
                  className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none"
                  disabled={activeLocale !== "ro"}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Categorie *
                </label>
                {activeLocale === "ro" ? (
                  <>
                    <input
                      type="text"
                      required
                      list="category-list"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, category: e.target.value }))
                      }
                      placeholder="Scrie sau selectează categoria"
                      className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none"
                    />
                    <datalist id="category-list">
                      {existingCategories.map((cat) => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </>
                ) : (
                  <input
                    type="text"
                    value={getField("category")}
                    onChange={(e) => setField("category", e.target.value)}
                    placeholder={formData.category}
                    className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Ordine afișare
                </label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      order: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none"
                  disabled={activeLocale !== "ro"}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Descriere scurtă *
              </label>
              <textarea
                required={activeLocale === "ro"}
                rows={2}
                value={getField("shortDesc")}
                onChange={(e) => setField("shortDesc", e.target.value)}
                placeholder={
                  activeLocale !== "ro" ? formData.shortDesc : undefined
                }
                className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Descriere completă *
              </label>
              <textarea
                required={activeLocale === "ro"}
                rows={4}
                value={getField("description")}
                onChange={(e) => setField("description", e.target.value)}
                placeholder={
                  activeLocale !== "ro" ? formData.description : undefined
                }
                className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Prezentare generală *
              </label>
              <textarea
                required={activeLocale === "ro"}
                rows={4}
                value={getField("overview")}
                onChange={(e) => setField("overview", e.target.value)}
                placeholder={
                  activeLocale !== "ro" ? formData.overview : undefined
                }
                className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Procesul de tratament *
              </label>
              <textarea
                required={activeLocale === "ro"}
                rows={4}
                value={getField("process")}
                onChange={(e) => setField("process", e.target.value)}
                placeholder={
                  activeLocale !== "ro" ? formData.process : undefined
                }
                className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Recuperare și îngrijire *
              </label>
              <textarea
                required={activeLocale === "ro"}
                rows={3}
                value={getField("recovery")}
                onChange={(e) => setField("recovery", e.target.value)}
                placeholder={
                  activeLocale !== "ro" ? formData.recovery : undefined
                }
                className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Beneficii
              </label>
              {benefits.map((benefit, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={benefit}
                    onChange={(e) => setBenefit(index, e.target.value)}
                    className="flex-1 border border-border px-4 py-2 focus:border-foreground focus:outline-none"
                    placeholder={
                      activeLocale !== "ro"
                        ? formData.benefits[index] || "Traducere beneficiu..."
                        : "Beneficiu..."
                    }
                  />
                  {activeLocale === "ro" && (
                    <button
                      type="button"
                      onClick={() => removeArrayItem("benefits", index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {activeLocale === "ro" && (
                <button
                  type="button"
                  onClick={() => addArrayItem("benefits")}
                  className="text-sm text-accent hover:text-accent/80"
                >
                  + Adaugă beneficiu
                </button>
              )}
            </div>

            {activeLocale === "ro" && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-4">
                  Imagini serviciu
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative">
                      <ImageUpload
                        value={image}
                        onChange={(url) =>
                          handleArrayChange("images", index, url)
                        }
                        folder="services"
                        label=""
                      />
                      {formData.images.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeArrayItem("images", index)}
                          className="absolute top-1 right-1 z-10 w-6 h-6 bg-red-600 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-700"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayItem("images")}
                    className="border-2 border-dashed border-border rounded-lg h-48 flex flex-col items-center justify-center hover:border-foreground/40 transition-colors"
                  >
                    <span className="text-2xl text-muted-foreground/40">+</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Adaugă imagine
                    </span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, isActive: e.target.checked }))
                }
                className="w-4 h-4"
                disabled={activeLocale !== "ro"}
              />
              <label htmlFor="isActive" className="text-sm text-foreground">
                Serviciu activ (vizibil pe site)
              </label>
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t border-border">
              <Button href="/admin/servicii" variant="outline">
                Anulează
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Se salvează..." : "Salvează serviciu"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
