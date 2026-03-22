"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import ImageUpload from "@/components/admin/ImageUpload";
import { secureFetch } from "@/lib/csrf-client";
import LanguageTabs from "@/components/admin/LanguageTabs";
import AutoTranslateButton from "@/components/admin/AutoTranslateButton";
import SectionBuilder, {
  type BlogSection,
  createEmptySection,
} from "@/components/admin/SectionBuilder";

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
  sections?: BlogSection[] | null;
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
  const [sections, setSections] = useState<BlogSection[]>([
    createEmptySection(),
  ]);
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
        // Load sections or convert old content to sections
        if (
          post.sections &&
          Array.isArray(post.sections) &&
          post.sections.length > 0
        ) {
          setSections(post.sections as BlogSection[]);
        } else if (post.content) {
          const paragraphs = post.content.split(/\n\n+/).filter(Boolean);
          setSections(
            paragraphs.map((text) => ({
              id: Math.random().toString(36).substring(2, 10),
              text,
            })),
          );
        } else {
          setSections([createEmptySection()]);
        }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasContent = sections.some(
      (s) => s.title || s.text || s.imageUrl || s.youtubeUrl,
    );
    if (!formData.title || !hasContent) {
      alert("Titlul și cel puțin o secțiune cu conținut sunt obligatorii");
      return;
    }
    setSaving(true);

    // Auto-generate content from sections for SEO / read time / backward compat
    const autoContent = sections
      .map((s) => [s.title, s.text].filter(Boolean).join("\n\n"))
      .filter(Boolean)
      .join("\n\n");

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
          content: autoContent || formData.content,
          sections,
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
      <div className="min-h-screen bg-muted pt-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
          <div className="text-center py-12 text-muted-foreground">
            Se încarcă...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted pt-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="mb-6 sm:mb-8">
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground">
            Editare articol
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">
            Modificați conținutul articolului
          </p>
        </div>

        <div className="bg-white border border-border p-4 sm:p-8">
          <div className="mb-4 space-y-3">
            <LanguageTabs active={activeLocale} onChange={setActiveLocale} />
            <AutoTranslateButton
              formData={{
                ...(formData as unknown as Record<string, unknown>),
                ...sections.reduce(
                  (acc, s, i) => ({
                    ...acc,
                    ...(s.title ? { [`section_${i}_title`]: s.title } : {}),
                    ...(s.text ? { [`section_${i}_text`]: s.text } : {}),
                  }),
                  {} as Record<string, string>,
                ),
              }}
              translatableFields={[
                "title",
                "excerpt",
                ...sections.flatMap((s, i) => {
                  const fields: string[] = [];
                  if (s.title) fields.push(`section_${i}_title`);
                  if (s.text) fields.push(`section_${i}_text`);
                  return fields;
                }),
              ]}
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

            {/* Content — Section Builder (RO) or Section Translations (other locales) */}
            {activeLocale === "ro" ? (
              <SectionBuilder sections={sections} onChange={setSections} />
            ) : (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Traducere secțiuni
                </label>
                {sections.map((section, i) => (
                  <div
                    key={section.id}
                    className="border border-border rounded-lg p-4 bg-muted/20"
                  >
                    <p className="text-xs font-semibold text-muted-foreground mb-3">
                      Secțiunea {i + 1}
                    </p>
                    {section.title && (
                      <div className="mb-3">
                        <label className="block text-xs text-muted-foreground mb-1">
                          Titlu
                        </label>
                        <input
                          type="text"
                          value={getField(`section_${i}_title`)}
                          onChange={(e) =>
                            setField(`section_${i}_title`, e.target.value)
                          }
                          placeholder={section.title}
                          className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none"
                        />
                      </div>
                    )}
                    {section.text && (
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          Text
                        </label>
                        <textarea
                          value={getField(`section_${i}_text`)}
                          onChange={(e) =>
                            setField(`section_${i}_text`, e.target.value)
                          }
                          rows={3}
                          placeholder={section.text}
                          className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none resize-vertical"
                        />
                      </div>
                    )}
                    {!section.title && !section.text && (
                      <p className="text-xs text-muted-foreground italic">
                        Secțiune doar cu imagine/video — nu necesită traducere
                      </p>
                    )}
                  </div>
                ))}
                {sections.filter((s) => s.title || s.text).length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nu există secțiuni cu text de tradus.
                  </p>
                )}
              </div>
            )}

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
