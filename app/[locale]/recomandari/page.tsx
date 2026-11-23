import PageHero from "@/components/PageHero";
import RecomandariClient from "./RecomandariClient";
import { getPublishedBlogPosts } from "@/lib/blog-data";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAlternates, getKeywords } from "@/lib/seo";
import { BreadcrumbSchema } from "@/components/JsonLd";

// Prerendered at build time. Next does not infer this on its own here because
// next-intl reads the locale from request context; every admin mutation calls
// revalidatePath("/", "layout"), so edits still go live immediately.
export const dynamic = "force-static";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Blog" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    keywords: getKeywords([t("metaTitle"), t("metaDescription")], locale),
    alternates: getAlternates("/recomandari", locale),
  };
}

export default async function RecomandariPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Blog" });
  const posts = await getPublishedBlogPosts(locale);
  const tNav = await getTranslations({ locale, namespace: "Nav" });

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "TehnicalDent", url: `https://www.tehnicaldent.com/${locale}` },
          { name: tNav("recomandari"), url: `https://www.tehnicaldent.com/${locale}/recomandari` },
        ]}
      />
      <PageHero title={t("heroTitle")} description={t("heroDescription")} />
      {/* An article with no translation is not listed in another language: its
          page there is only the Romanian text and is kept out of the index. */}
      <RecomandariClient posts={posts.filter((p) => p.translated !== false)} />
    </>
  );
}
