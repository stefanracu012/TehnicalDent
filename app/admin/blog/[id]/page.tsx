"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import ImageUpload from "@/components/admin/ImageUpload";
import { secureFetch } from "@/lib/csrf-client";
import LanguageTabs from "@/components/admin/LanguageTabs";

type Translations = Record<string, Record<string, string>>;

const categories = [
  { name: "Igienă Orală", slug: "igiena-orala" },
  { name: "Estetică", slug: "estetica" },
  { name: "Prevenție", slug: "preventie" },
  { name: "Copii", slug: "copii" },
  { name: "Nutriție", slug: "nutritie" },
  { name: "Tratamente", slug: "tratamente" },
];

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  tags: string[];
  author: string;
  isPublished: boolean;
  publishedAt: string | null;
  translations?: Translations | null;
}

export default function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await secureFetch(`/api/admin/blog/${id}`);
        if (!res.ok) {
          alert("Articolul nu a fost găsit");
          router.push("/admin/blog");
          return;
        }
        const post: BlogPost = await res.json();
        setFormData({
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          coverImage: post.coverImage,
          category: post.category,
          tags: post.tags.join(", "),
          author: post.author,
          isPublished: post.isPublished,
        });
        setTranslations((post.translations as Translations) || {});
      } catch {
        alert("Eroare la încărcarea articolului");
        router.push("/admin/blog");
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id, router]);

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

      const res = await secureFetch(`/api/admin/blog/${id}`, {
        method: "PATCH",
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

  if (loading) {
    return (
      <div className="min-h-screen bg-muted pt-24">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 py-12">
          <div className="text-center py-12 text-muted-foreground">
            Se încarcă...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted pt-24">
      <div className="mx-auto max-w-4xl px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-medium text-foreground">
            Editare articol
          </h1>
          <p className="mt-2 text-muted-foreground">
            Modificați conținutul articolului
          </p>
        </div>

        <div className="bg-white border border-border p-8">
          <LanguageTabs active={activeLocale} onChange={setActiveLocale} />
          {activeLocale !== "ro" && (
            <p className="text-xs text-muted-foreground mb-4 -mt-4">
              ✏️ Editați traducerea. Câmpurile goale vor folosi textul în
              română.
            </p>
          )}

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
                    : "O scurtă descriere a articolului"
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
                    : "Scrieți conținutul articolului aici..."
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
                    Publicat
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
                {saving ? "Se salvează..." : "Salvează modificările"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
