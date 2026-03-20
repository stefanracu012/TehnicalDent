"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import BlogCard from "@/components/BlogCard";
import { categories, type BlogPost } from "@/lib/blog-data";

interface RecomandariClientProps {
  posts: BlogPost[];
}

export default function RecomandariClient({ posts }: RecomandariClientProps) {
  const t = useTranslations("Blog");
  const [activeCategory, setActiveCategory] = useState("toate");

  const filteredPosts =
    activeCategory === "toate"
      ? posts
      : posts.filter((p) => p.category === activeCategory);

  const featuredPost = filteredPosts[0];
  const restPosts = filteredPosts.slice(1);

  return (
    <>
      {/* Category filter */}
      <div className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <nav className="flex gap-1 overflow-x-auto scrollbar-hide py-1 -mb-px">
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setActiveCategory(cat.slug)}
                className={`shrink-0 px-5 py-4 text-xs font-medium uppercase tracking-widest transition-colors duration-200 border-b-2 ${
                  activeCategory === cat.slug
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-foreground/20"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Featured Post */}
      {featuredPost && (
        <section className="py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <BlogCard post={featuredPost} featured />
          </div>
        </section>
      )}

      {/* Posts Grid */}
      {restPosts.length > 0 && (
        <section className="pb-20 lg:pb-28">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {restPosts.map((post, i) => (
                <div
                  key={post.slug}
                  className="animate-fade-in"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <BlogCard post={post} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty state */}
      {filteredPosts.length === 0 && (
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <svg
                className="w-8 h-8 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </div>
            <p className="text-lg text-muted-foreground">{t("emptyState")}</p>
          </div>
        </section>
      )}

      {/* Newsletter CTA */}
      <section className="bg-foreground py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-14 h-14 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                />
              </svg>
            </div>
            <h2 className="font-serif text-3xl font-medium text-white sm:text-4xl">
              {t("newsletterTitle")}
            </h2>
            <p className="mt-4 text-lg text-white/70 leading-relaxed">
              {t("newsletterDescription")}
            </p>
            <Link
              href="/contact"
              className="mt-8 inline-flex items-center gap-2 bg-white text-foreground px-8 py-4 text-sm font-medium tracking-wide uppercase hover:bg-white/90 transition-colors duration-200"
            >
              {t("programeazaConsultatie")}
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
