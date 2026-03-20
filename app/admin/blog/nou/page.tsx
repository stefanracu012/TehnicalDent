"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUpload from "@/components/admin/ImageUpload";
import { secureFetch } from "@/lib/csrf-client";
import LanguageTabs from "@/components/admin/LanguageTabs";
import AutoTranslateButton from "@/components/admin/AutoTranslateButton";

type Translations = Record<string, Record<string, string>>;

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const categories = [
  { name: "Igienă Orală", slug: "igiena-orala" },
  { name: "Estetică", slug: "estetica" },
  { name: "Prevenție", slug: "preventie" },
  { name: "Copii", slug: "copii" },
  { name: "Nutriție", slug: "nutritie" },
  { name: "Tratamente", slug: "tratamente" },
];

export default function NewBlogPostPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [activeLocale, setActiveLocale] = useState("ro");
  const [translations, setTranslations] = useState<Translations>({});
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    coverImage: "",
    category: "igiena-orala",
    tags: "",
    author: "TechnicalDent",
    isPublished: false,
  });

  const handleTitleChange = (title: string) => {
    setFormData((p) => ({
      ...p,
      title,
      slug:
        p.slug === "" || p.slug === generateSlug(p.title)
          ? generateSlug(title)
          : p.slug,
    }));
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
      if (field === "title") {
        handleTitleChange(value);
        return;
      }
      setFormData((prev) => ({ ...prev, [field]: value }));
    } else {
      setTranslations((prev) => ({
        ...prev,
        [activeLocale]: { ...(prev[activeLocale] || {}), [field]: value },
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      alert("Titlul și conținutul sunt obligatorii");
      return;
    }
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

      const res = await secureFetch("/api/admin/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags
            ? formData.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : [],
          translations:
            Object.keys(cleanTranslations).length > 0
              ? cleanTranslations
              : null,
        }),
      });

      if (res.ok) {
        router.push("/admin/blog");
      } else {
        const data = await res.json();
        alert(data.error || "Eroare la salvare");
      }
    } catch {
      alert("Eroare la salvare");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted pt-24">
      <div className="mx-auto max-w-4xl px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-medium text-foreground">
            Articol nou
          </h1>
          <p className="mt-2 text-muted-foreground">
            Creați un articol nou pe blog
          </p>
        </div>

        <div className="bg-white border border-border p-8">
          <div className="mb-4 space-y-3">
            <LanguageTabs active={activeLocale} onChange={setActiveLocale} />
            <AutoTranslateButton
              formData={formData as unknown as Record<string, unknown>}
              translatableFields={["title", "excerpt", "content"]}
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
                Editați traducerea. Câmpurile goale vor folosi textul în română.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Cover Image - RO only */}
            {activeLocale === "ro" && (
              <ImageUpload
                value={formData.coverImage}
                onChange={(url) =>
                  setFormData((p) => ({ ...p, coverImage: url }))
                }
                folder="blog"
                label="Imagine de copertă"
              />
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Titlu *
              </label>
              <input
                type="text"
                required={activeLocale === "ro"}
                value={getField("title")}
                onChange={(e) => setField("title", e.target.value)}
                placeholder={
                  activeLocale !== "ro" ? formData.title : "Titlul articolului"
                }
                className="w-full border border-border px-4 py-3 text-lg focus:border-foreground focus:outline-none"
              />
            </div>

            {/* Slug - RO only */}
            {activeLocale === "ro" && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Slug (URL)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/blog/</span>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, slug: e.target.value }))
                    }
                    placeholder="titlul-articolului"
                    className="flex-1 border border-border px-4 py-3 focus:border-foreground focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Excerpt */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Descriere scurtă (excerpt)
              </label>
              <textarea
                value={getField("excerpt")}
                onChange={(e) => setField("excerpt", e.target.value)}
                rows={2}
                placeholder={
                  activeLocale !== "ro"
                    ? formData.excerpt
                    : "O scurtă descriere a articolului (pentru listare și SEO)"
                }
                className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none resize-vertical"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Conținut * (Markdown suportat)
              </label>
              <textarea
                required={activeLocale === "ro"}
                value={getField("content")}
                onChange={(e) => setField("content", e.target.value)}
                rows={20}
                placeholder={
                  activeLocale !== "ro"
                    ? "Traduceți conținutul articolului..."
                    : `Scrieți conținutul articolului aici...\n\nPuteți folosi Markdown:\n# Titlu\n## Subtitlu\n**text bold**\n*text italic*\n- listă\n1. listă numerotată`
                }
                className="w-full border border-border px-4 py-3 font-mono text-sm focus:border-foreground focus:outline-none resize-vertical"
              />
            </div>

            {/* Category + Author + Tags + Publish - RO only */}
            {activeLocale === "ro" && (
              <>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Categorie
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          category: e.target.value,
                        }))
                      }
                      className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none"
                    >
                      {categories.map((cat) => (
                        <option key={cat.slug} value={cat.slug}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Autor
                    </label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, author: e.target.value }))
                      }
                      className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Taguri (separate prin virgulă)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, tags: e.target.value }))
                    }
                    placeholder="stomatologie, igienă, sfaturi"
                    className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isPublished"
                    checked={formData.isPublished}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        isPublished: e.target.checked,
                      }))
                    }
                    className="w-4 h-4"
                  />
                  <label
                    htmlFor="isPublished"
                    className="text-sm text-foreground"
                  >
                    Publică imediat
                  </label>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-6 border-t border-border">
              <button
                type="button"
                onClick={() => router.push("/admin/blog")}
                className="px-6 py-3 text-sm font-semibold border border-border hover:bg-muted transition-colors"
              >
                Anulează
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-foreground text-white text-sm font-semibold px-6 py-3 hover:bg-foreground/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Se salvează..." : "Salvează articolul"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
