"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import type { BlogPost } from "@/lib/blog-data";

interface BlogCardProps {
  post: BlogPost;
  featured?: boolean;
}

export default function BlogCard({ post, featured = false }: BlogCardProps) {
  const t = useTranslations("Blog");
  const locale = useLocale();
  const formattedDate = new Date(post.date).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (featured) {
    return (
      <Link href={`/recomandari/${post.slug}`} className="group block">
        <article className="grid grid-cols-1 lg:grid-cols-2 gap-0 bg-white border border-border overflow-hidden hover:border-foreground/20 transition-colors duration-300">
          {/* Image */}
          <div className="relative aspect-[16/10] lg:aspect-auto overflow-hidden">
            <Image
              src={post.image}
              alt={post.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            {/* Category badge */}
            <div className="absolute top-6 left-6">
              <span className="inline-block bg-white/95 backdrop-blur-sm text-foreground text-xs font-medium uppercase tracking-widest px-4 py-2">
                {post.category.replace("-", " ")}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col justify-center p-8 lg:p-12">
            <div className="flex items-center gap-3 text-xs text-muted-foreground uppercase tracking-widest">
              <time dateTime={post.date}>{formattedDate}</time>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
              <span>
                {post.readTime} {t("min")}
              </span>
            </div>

            <h2 className="mt-5 font-serif text-2xl lg:text-3xl font-medium text-foreground leading-tight group-hover:text-foreground/70 transition-colors duration-300">
              {post.title}
            </h2>

            <p className="mt-4 text-base leading-relaxed text-muted-foreground line-clamp-3">
              {post.excerpt}
            </p>

            <div className="mt-8 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-foreground/8 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-foreground/50"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {post.author.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {post.author.role}
                </p>
              </div>
            </div>

            <div className="mt-8">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground group-hover:gap-3 transition-all duration-300">
                {t("citesteArticolul")}
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
              </span>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link href={`/recomandari/${post.slug}`} className="group block h-full">
      <article className="h-full bg-white border border-border overflow-hidden hover:border-foreground/20 transition-colors duration-300 flex flex-col">
        {/* Image */}
        <div className="relative aspect-[16/10] overflow-hidden">
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          {/* Category badge */}
          <div className="absolute top-4 left-4">
            <span className="inline-block bg-white/95 backdrop-blur-sm text-foreground text-[10px] font-medium uppercase tracking-widest px-3 py-1.5">
              {post.category.replace("-", " ")}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-6 lg:p-8">
          <div className="flex items-center gap-3 text-xs text-muted-foreground uppercase tracking-widest">
            <time dateTime={post.date}>{formattedDate}</time>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <span>
              {post.readTime} {t("min")}
            </span>
          </div>

          <h3 className="mt-4 font-serif text-xl font-medium text-foreground leading-tight group-hover:text-foreground/70 transition-colors duration-300 line-clamp-2">
            {post.title}
          </h3>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-3 flex-1">
            {post.excerpt}
          </p>

          <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-foreground/8 flex items-center justify-center">
                <span className="text-xs font-semibold text-foreground/50">
                  {post.author.name.charAt(0)}
                </span>
              </div>
              <p className="text-xs font-medium text-foreground">
                {post.author.name.split(" ").slice(0, 2).join(" ")}
              </p>
            </div>

            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {t("citeste")}
              <svg
                className="w-3.5 h-3.5"
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
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
