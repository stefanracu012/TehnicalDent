import { useTranslations } from "next-intl";

export default function Loading() {
  const t = useTranslations("Loading");

  return (
    <div className="min-h-screen flex items-center justify-center bg-white pt-20">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-sm text-muted-foreground">{t("seIncarca")}</p>
      </div>
    </div>
  );
}
