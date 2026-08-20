"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { secureFetch } from "@/lib/csrf-client";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  category: string;
  tags: string[];
  author: string;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

interface SocialPost {
  id: string;
  title: string;
  images: string[];
  instagramCaption: string;
  tags: string[];
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  facebookPostId: string | null;
  instagramPostId: string | null;
}

type Kind = "articles" | "posts";

/** Both kinds collapse to this so the list row is written once. */
interface Row {
  id: string;
  title: string;
  subtitle: string;
  image: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  meta: string[];
  editHref: string;
}

export default function AdminBlogPage() {
  const [kind, setKind] = useState<Kind>("articles");
  const [articles, setArticles] = useState<BlogPost[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "published" | "draft"
  >("all");

  const fetchAll = useCallback(async () => {
    try {
      const [a, p] = await Promise.all([
        secureFetch("/api/admin/blog").then((r) => r.json()),
        secureFetch("/api/admin/blog/posts").then((r) => r.json()),
      ]);
      setArticles(Array.isArray(a) ? a : []);
      setPosts(Array.isArray(p) ? p : []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const endpoint = (id: string) =>
    kind === "articles" ? `/api/admin/blog/${id}` : `/api/admin/blog/posts/${id}`;

  const remove = async (id: string) => {
    const what = kind === "articles" ? "acest articol" : "această postare";
    if (!confirm(`Sigur doriți să ștergeți ${what}?`)) return;
    try {
      await secureFetch(endpoint(id), { method: "DELETE" });
      fetchAll();
    } catch {
      alert("Eroare la ștergere");
    }
  };

  const togglePublish = async (row: Row) => {
    try {
      await secureFetch(endpoint(row.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !row.isPublished }),
      });
      fetchAll();
    } catch {
      alert("Eroare");
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("ro-RO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const rows: Row[] =
    kind === "articles"
      ? articles.map((a) => ({
          id: a.id,
          title: a.title,
          subtitle: a.excerpt || "Fără descriere",
          image: a.coverImage || null,
          isPublished: a.isPublished,
          publishedAt: a.publishedAt,
          createdAt: a.createdAt,
          meta: [a.category, a.author, ...(a.tags.length ? [a.tags.join(", ")] : [])],
          editHref: `/admin/blog/${a.id}`,
        }))
      : posts.map((p) => ({
          id: p.id,
          title: p.title || "Postare fără titlu",
          subtitle: p.instagramCaption.split("\n")[0] || "Fără text",
          image: p.images[0] ?? null,
          isPublished: p.isPublished,
          publishedAt: p.publishedAt,
          createdAt: p.createdAt,
          meta: [
            p.images.length > 1 ? `Carusel · ${p.images.length} imagini` : "1 imagine",
            ...[
              p.facebookPostId ? "Facebook ✓" : null,
              p.instagramPostId ? "Instagram ✓" : null,
            ].filter((v): v is string => v !== null),
            ...(p.tags.length ? [p.tags.join(", ")] : []),
          ],
          editHref: `/admin/blog/postari/${p.id}`,
        }));

  const filtered = rows.filter((r) => {
    if (filterStatus === "published") return r.isPublished;
    if (filterStatus === "draft") return !r.isPublished;
    return true;
  });

  const isArticles = kind === "articles";
  const newHref = isArticles ? "/admin/blog/nou" : "/admin/blog/postari/nou";
  const newLabel = isArticles ? "+ Articol nou" : "+ Postare nouă";

  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground">
              Blog
            </h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">
              {isArticles
                ? "Articole cu pagină pe site, indexate de Google"
                : "Postări doar pentru Facebook și Instagram"}
            </p>
          </div>
          <Link
            href={newHref}
            className="self-start sm:self-auto bg-foreground text-white text-sm font-semibold px-5 py-2.5 sm:px-6 sm:py-3 hover:bg-foreground/90 transition-colors"
          >
            {newLabel}
          </Link>
        </div>

        {/* Type — decides what the button above creates, so it reads as a mode
            rather than a filter. */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {(
            [
              { key: "articles", label: "Articole", count: articles.length },
              { key: "posts", label: "Postări", count: posts.length },
            ] as const
          ).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setKind(key)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                kind === key
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              <span className="ml-1.5 text-xs opacity-60">({count})</span>
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {(
            [
              { key: "all", label: "Toate" },
              { key: "published", label: "Publicate" },
              { key: "draft", label: "Ciorne" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
                filterStatus === key
                  ? "bg-foreground text-white"
                  : "bg-background border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              <span className="ml-1.5 text-xs opacity-60">
                (
                {key === "all"
                  ? rows.length
                  : key === "published"
                    ? rows.filter((r) => r.isPublished).length
                    : rows.filter((r) => !r.isPublished).length}
                )
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Se încarcă...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-background border border-border">
            <p className="text-muted-foreground mb-4">
              {rows.length === 0
                ? isArticles
                  ? "Nu există articole pe blog."
                  : "Nu există postări."
                : "Nimic în această categorie."}
            </p>
            <Link
              href={newHref}
              className="inline-block bg-foreground text-white text-sm font-semibold px-6 py-3 hover:bg-foreground/90 transition-colors"
            >
              {newLabel}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((row) => (
              <div
                key={row.id}
                className="bg-background border border-border p-4 sm:p-6 flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6"
              >
                {/* Square, so the list shows the same framing the article and
                    the social post use. */}
                {row.image && (
                  <div className="flex-shrink-0 w-24 aspect-square bg-muted overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={row.image}
                      alt={row.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start sm:items-center gap-2 sm:gap-3 mb-1">
                    <h3 className="font-serif text-base sm:text-lg font-medium text-foreground line-clamp-2 sm:truncate">
                      {row.title}
                    </h3>
                    <span
                      className={`flex-shrink-0 px-2 py-0.5 text-xs font-semibold rounded-full ${
                        row.isPublished
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {row.isPublished ? "Publicat" : "Ciornă"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                    {row.subtitle}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {row.meta.map((m, i) => (
                      <span key={i}>{m}</span>
                    ))}
                    <span>
                      {row.publishedAt
                        ? `Publicat: ${formatDate(row.publishedAt)}`
                        : `Creat: ${formatDate(row.createdAt)}`}
                    </span>
                  </div>
                </div>

                <div className="flex-shrink-0 flex items-center gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-border">
                  <button
                    onClick={() => togglePublish(row)}
                    className={`text-xs font-semibold px-3 py-1.5 border transition-colors ${
                      row.isPublished
                        ? "border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                        : "border-green-300 text-green-700 hover:bg-green-50"
                    }`}
                  >
                    {row.isPublished ? "Retrage" : "Publică"}
                  </button>
                  <Link
                    href={row.editHref}
                    className="text-xs font-semibold px-3 py-1.5 border border-border text-foreground hover:bg-muted transition-colors"
                  >
                    Editează
                  </Link>
                  <button
                    onClick={() => remove(row.id)}
                    className="text-xs font-semibold px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Șterge
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
