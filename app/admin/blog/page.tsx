"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { secureFetch } from "@/lib/csrf-client";

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
  createdAt: string;
  updatedAt: string;
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft">("all");

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await secureFetch("/api/admin/blog");
      const data = await res.json();
      setPosts(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm("Sigur doriți să ștergeți acest articol?")) return;
    try {
      await secureFetch(`/api/admin/blog/${id}`, { method: "DELETE" });
      fetchPosts();
    } catch {
      alert("Eroare la ștergere");
    }
  };

  const togglePublish = async (post: BlogPost) => {
    try {
      await secureFetch(`/api/admin/blog/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !post.isPublished }),
      });
      fetchPosts();
    } catch {
      alert("Eroare");
    }
  };

  const filtered = posts.filter((p) => {
    if (filterStatus === "published") return p.isPublished;
    if (filterStatus === "draft") return !p.isPublished;
    return true;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ro-RO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-muted pt-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-medium text-foreground">
              Blog
            </h1>
            <p className="mt-2 text-muted-foreground">
              Creați și gestionați articolele de pe blog
            </p>
          </div>
          <Link
            href="/admin/blog/nou"
            className="bg-foreground text-white text-sm font-semibold px-6 py-3 hover:bg-foreground/90 transition-colors"
          >
            + Articol nou
          </Link>
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
                  : "bg-white border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              <span className="ml-1.5 text-xs opacity-60">
                (
                {key === "all"
                  ? posts.length
                  : key === "published"
                    ? posts.filter((p) => p.isPublished).length
                    : posts.filter((p) => !p.isPublished).length}
                )
              </span>
            </button>
          ))}
        </div>

        {/* Posts List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Se încarcă...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white border border-border">
            <p className="text-muted-foreground mb-4">
              {posts.length === 0
                ? "Nu există articole pe blog."
                : "Nu există articole în această categorie."}
            </p>
            <Link
              href="/admin/blog/nou"
              className="inline-block bg-foreground text-white text-sm font-semibold px-6 py-3 hover:bg-foreground/90 transition-colors"
            >
              + Creează primul articol
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((post) => (
              <div
                key={post.id}
                className="bg-white border border-border p-6 flex items-start gap-6"
              >
                {/* Cover Image Thumbnail */}
                {post.coverImage && (
                  <div className="flex-shrink-0 w-32 h-20 bg-muted overflow-hidden">
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-serif text-lg font-medium text-foreground truncate">
                      {post.title}
                    </h3>
                    <span
                      className={`flex-shrink-0 px-2 py-0.5 text-xs font-semibold rounded-full ${
                        post.isPublished
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {post.isPublished ? "Publicat" : "Ciornă"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                    {post.excerpt || "Fără descriere"}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{post.category}</span>
                    <span>•</span>
                    <span>{post.author}</span>
                    <span>•</span>
                    <span>
                      {post.publishedAt
                        ? `Publicat: ${formatDate(post.publishedAt)}`
                        : `Creat: ${formatDate(post.createdAt)}`}
                    </span>
                    {post.tags.length > 0 && (
                      <>
                        <span>•</span>
                        <span>{post.tags.join(", ")}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => togglePublish(post)}
                    className={`text-xs font-semibold px-3 py-1.5 border transition-colors ${
                      post.isPublished
                        ? "border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                        : "border-green-300 text-green-700 hover:bg-green-50"
                    }`}
                  >
                    {post.isPublished ? "Retrage" : "Publică"}
                  </button>
                  <Link
                    href={`/admin/blog/${post.id}`}
                    className="text-xs font-semibold px-3 py-1.5 border border-border text-foreground hover:bg-muted transition-colors"
                  >
                    Editează
                  </Link>
                  <button
                    onClick={() => deletePost(post.id)}
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
