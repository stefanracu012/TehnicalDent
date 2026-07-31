import { useTranslations } from "next-intl";
import Button from "@/components/Button";

export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted pt-20">
      <div className="text-center px-6">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground mb-4">
          {t("subtitle")}
        </p>
        <h1 className="font-serif text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-md mx-auto">
          {t("description")}
        </p>
        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
          <Button href="/">{t("inapoiAcasa")}</Button>
          <Button href="/contact" variant="outline">
            {t("contacteazaNe")}
          </Button>
        </div>
      </div>
    </div>
  );
}
