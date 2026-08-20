import GalleryClient from "./GalleryClient";
import { getGalleryImages, getSetting } from "@/lib/data";
import { localizeGalleryImage } from "@/lib/localize";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAlternates } from "@/lib/seo";

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
  const t = await getTranslations("Gallery");
  return {
    title: t("heroTitle"),
    description: t("heroDescription"),
    alternates: getAlternates("/galerie", locale),
  };
}

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const images = (await getGalleryImages()).map((img) =>
    localizeGalleryImage(img, locale),
  );
  const ctaImage = (await getSetting("galleryCTAImage")) || undefined;
  return <GalleryClient images={images} ctaImage={ctaImage} />;
}
