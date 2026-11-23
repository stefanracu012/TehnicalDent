import { getTranslations } from "next-intl/server";
import { FaqSchema } from "@/components/JsonLd";

const KEYS = [1, 2, 3, 4, 5, 6] as const;

/**
 * Frequently asked questions, answered on the page and marked up for search
 * engines. Every answer is something the clinic has said itself — how to book,
 * where it is, when it works, what hygiene and whitening include, vouchers —
 * so the page and the markup say the same thing.
 */
export default async function Faq({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "Faq" });
  const items = KEYS.map((n) => ({ question: t(`q${n}`), answer: t(`a${n}`) }));

  return (
    <section className="py-16 lg:py-20 bg-muted">
      <FaqSchema items={items} />
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <h2 className="font-serif text-3xl font-medium text-foreground mb-8">{t("titlu")}</h2>
        <div className="divide-y divide-border border-y border-border">
          {items.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium text-foreground">
                {item.question}
                <svg
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </summary>
              <p className="mt-3 leading-relaxed text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
