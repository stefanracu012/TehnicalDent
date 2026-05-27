import Image from "next/image";
import Button from "@/components/Button";
import Section from "@/components/Section";
import SectionHeader from "@/components/SectionHeader";

export const dynamic = "force-dynamic";
import ServiceBentoGrid from "@/components/ServiceBentoGrid";
import TestimonialsCarousel from "@/components/TestimonialsCarousel";
import GalleryPreview from "@/components/GalleryPreview";
import { getServices, getTestimonials, getGalleryImages } from "@/lib/data";
import {
  localizeService,
  localizeTestimonial,
  localizeGalleryImage,
} from "@/lib/localize";
import AboutPreview from "@/components/AboutPreview";
import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const services = (await getServices()).map((s) => localizeService(s, locale));
  const testimonials = (await getTestimonials()).map((t) =>
    localizeTestimonial(t, locale),
  );
  const galleryImages = (await getGalleryImages()).map((g) =>
    localizeGalleryImage(g, locale),
  );
  const heroImage = "/images/f9fcff16-2ae0-4969-a4f6-8e2e5d3d7bc0.png";
  const aboutOverrides = {};
  const t = await getTranslations("Home");

  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <Image
            src={heroImage}
            alt={t("heroImgAlt")}
            fill
            priority
            sizes="100vw"
            className="object-cover object-top"
          />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 py-20">
          <div className="max-w-2xl animate-fade-in-up">
            <h1 className="font-serif text-4xl font-medium tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-8 text-lg leading-relaxed text-foreground/80">
              {t("heroDescription")}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button href="/contact#formular" size="lg">
                {t("programeazaConsultatie")}
              </Button>
              <Button href="/servicii" variant="outline" size="lg">
                {t("exploreaServiciile")}
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10">
          <div className="w-px h-16 bg-gradient-to-b from-foreground/30 to-transparent animate-pulse" />
        </div>
      </section>

      {/* Services Preview */}
      <Section background="muted">
        <SectionHeader
          subtitle={t("serviciiSubtitle")}
          title={t("serviciiTitle")}
          description={t("serviciiDescription")}
        />

        <div className="mt-12">
          <ServiceBentoGrid services={services} />
        </div>

        <div className="mt-12 text-center">
          <Button href="/servicii" variant="outline">
            {t("veziToateServiciile")}
          </Button>
        </div>
      </Section>

      {/* About Preview */}
      <Section background="muted">
        <AboutPreview overrides={aboutOverrides} />
      </Section>

      {/* Gallery Preview */}
      <Section background="muted">
        <GalleryPreview images={galleryImages} />
      </Section>

      {/* Testimonials */}
      <section className="bg-muted overflow-hidden">
        <TestimonialsCarousel testimonials={testimonials.slice(0, 3)} />
      </section>

      {/* Final CTA */}
      <Section>
        <div className="relative py-16 lg:py-24">
          <div className="absolute inset-0 bg-foreground" />
          <div className="relative z-10 text-center px-6">
            <h2 className="font-serif text-3xl font-medium tracking-tight text-white sm:text-4xl lg:text-5xl">
              {t("ctaTitle")}
            </h2>
            <p className="mt-6 max-w-2xl mx-auto text-lg leading-relaxed text-white/80">
              {t("ctaDescription")}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <Button
                href="/contact#formular"
                size="lg"
                className="!bg-background !text-foreground hover:!bg-white/90"
              >
                {t("programeazaAcum")}
              </Button>
              <Button
                href="tel:+37379950008"
                variant="outline"
                size="lg"
                className="!text-white !border-white hover:!bg-background hover:!text-foreground"
              >
                {t("sunaNeLabel")}
              </Button>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
