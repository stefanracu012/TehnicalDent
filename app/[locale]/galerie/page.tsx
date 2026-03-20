import GalleryClient from "./GalleryClient";
import { getGalleryImages } from "@/lib/data";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Gallery");
  return {
    title: t("heroTitle") + " — TechnicalDent",
    description: t("heroDescription"),
  };
}

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const images = await getGalleryImages();
  return <GalleryClient images={images} />;
}
