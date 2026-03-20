import type { Metadata } from "next";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  getPublishedBlogPost,
  getPublishedBlogPosts,
  getAllPublishedSlugs,
} from "@/lib/blog-data";

interface Props {
  params: Promise<{ slug: string; locale: string }>;
}

export async function generateStaticParams() {
  const slugs = await getAllPublishedSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("BlogDetail");
  const post = await getPublishedBlogPost(slug);
  if (!post) return { title: t("articolNegasit") };

  return {
    title: `${post.title} | TehnicalDent`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("BlogDetail");
  const post = await getPublishedBlogPost(slug);

  if (!post) notFound();

  const formattedDate = new Date(post.date).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Get related posts (same category, excluding current)
  const allPosts = await getPublishedBlogPosts();
  const relatedPosts = allPosts
    .filter((p) => p.category === post.category && p.slug !== post.slug)
    .slice(0, 2);

  // If not enough related posts, fill with other posts
  const morePosts =
    relatedPosts.length < 2
      ? allPosts
          .filter(
            (p) =>
              p.slug !== post.slug &&
              !relatedPosts.find((r) => r.slug === p.slug),
          )
          .slice(0, 2 - relatedPosts.length)
      : [];

  const suggestedPosts = [...relatedPosts, ...morePosts];

  return (
    <>
      {/* Hero Image */}
      <section className="relative pt-[11rem]">
        <div className="relative aspect-[21/9] max-h-[500px] w-full overflow-hidden">
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10" />

          {/* Back button */}
          <div className="absolute top-6 left-6 z-10">
            <Link
              href="/recomandari"
              className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2.5 text-xs font-medium uppercase tracking-widest text-foreground hover:bg-white transition-colors duration-200"
            >
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
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                />
              </svg>
              {t("inapoiLaBlog")}
            </Link>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <article className="py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="bg-muted px-3 py-1.5 font-medium text-foreground">
              {post.category.replace("-", " ")}
            </span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <time dateTime={post.date}>{formattedDate}</time>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <span>
              {post.readTime} {t("min")}
            </span>
          </div>

          {/* Title */}
          <h1 className="mt-8 font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-foreground leading-tight">
            {post.title}
          </h1>

          {/* Excerpt */}
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground border-l-2 border-foreground/20 pl-6">
            {post.excerpt}
          </p>

          {/* Author */}
          <div className="mt-10 pt-8 border-t border-border flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-foreground/8 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-foreground/50"
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
              <p className="text-sm font-semibold text-foreground">
                {post.author.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {post.author.role}
              </p>
            </div>
          </div>

          {/* Content paragraphs */}
          <div className="mt-12 space-y-6">
            {post.content.map((paragraph, i) => (
              <p
                key={i}
                className="text-base leading-[1.85] text-foreground/85"
              >
                {paragraph}
              </p>
            ))}
          </div>

          {/* Tags */}
          <div className="mt-12 pt-8 border-t border-border">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground mr-2">
                {t("etichete")}
              </span>
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-block bg-muted px-3 py-1.5 text-xs text-foreground/70"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* CTA Box */}
          <div className="mt-12 bg-muted p-8 lg:p-10">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-foreground/8 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-foreground/60"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-serif text-xl font-medium text-foreground">
                  {t("ctaTitle")}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t("ctaDescription")}
                </p>
                <Link
                  href="/contact"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-foreground/70 transition-colors"
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
          </div>
        </div>
      </article>

      {/* Related Posts */}
      {suggestedPosts.length > 0 && (
        <section className="bg-muted py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <h2 className="font-serif text-2xl sm:text-3xl font-medium text-foreground text-center">
              {t("articoleSimilare")}
            </h2>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {suggestedPosts.map((related) => {
                const relatedDate = new Date(related.date).toLocaleDateString(
                  locale,
                  {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  },
                );

                return (
                  <Link
                    key={related.slug}
                    href={`/recomandari/${related.slug}`}
                    className="group block bg-white border border-border overflow-hidden hover:border-foreground/20 transition-colors duration-300"
                  >
                    <div className="relative aspect-[16/9] overflow-hidden">
                      <Image
                        src={related.image}
                        alt={related.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground uppercase tracking-widest">
                        <time dateTime={related.date}>{relatedDate}</time>
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                        <span>
                          {related.readTime} {t("min")}
                        </span>
                      </div>
                      <h3 className="mt-3 font-serif text-lg font-medium text-foreground group-hover:text-foreground/70 transition-colors duration-300 line-clamp-2">
                        {related.title}
                      </h3>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
