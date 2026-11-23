import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "../globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TopBar from "@/components/TopBar";
import WhatsAppButton from "@/components/WhatsAppButton";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { getAlternates, getOgLocale } from "@/lib/seo";
import { DentistSchema } from "@/components/JsonLd";
import { getServices } from "@/lib/data";
import { localizeService } from "@/lib/localize";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    title: {
      default: t("title"),
      // The city rides along in every sub-page title — service pages compete on
      // "<serviciu> Chișinău", not on the bare service name.
      template: "%s | TehnicalDent Chișinău",
    },
    description: t("description"),
    keywords: t("keywords"),
    authors: [{ name: "TehnicalDent" }],
    icons: {
      icon: [
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        {
          url: "/android-chrome-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          url: "/android-chrome-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
      apple: "/apple-icon.png",
    },
    metadataBase: new URL("https://www.tehnicaldent.com"),
    alternates: getAlternates("", locale),
    openGraph: {
      type: "website",
      locale: getOgLocale(locale),
      siteName: "TehnicalDent",
      url: `https://www.tehnicaldent.com/${locale}`,
      images: [
        {
          url: "https://www.tehnicaldent.com/images/hero-dentist.jpg",
          width: 1200,
          height: 630,
          alt: "TehnicalDent — Clinică Stomatologică",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: ["https://www.tehnicaldent.com/images/hero-dentist.jpg"],
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages({ locale });

  // The services that exist, for the menu and the footer — in the visitor's
  // language. Rebuilt with the rest of the site whenever services are saved.
  const menuServices = (await getServices())
    .filter((s) => s.isActive)
    .map((s) => localizeService(s, locale))
    .map((s) => ({ slug: s.slug, title: s.title as string, category: s.category as string }));

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <DentistSchema locale={locale} />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <TopBar />
          <Header services={menuServices} />
          <main className="flex-1">{children}</main>
          <Footer services={menuServices} />
          <WhatsAppButton />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
