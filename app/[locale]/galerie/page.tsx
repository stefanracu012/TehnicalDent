import GalleryClient from "./GalleryClient";
import { getGalleryImages } from "@/lib/data";
import { localizeGalleryImage } from "@/lib/localize";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAlternates } from "@/lib/seo";

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
  return <GalleryClient images={images} />;
}
