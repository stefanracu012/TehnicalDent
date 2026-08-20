"use client";

export interface SeoSocialValues {
  metaTitle: string;
  metaDescription: string;
  facebookCaption: string;
  instagramCaption: string;
}

interface SeoSocialFieldsProps {
  values: SeoSocialValues;
  onChange: (key: keyof SeoSocialValues, value: string) => void;
}

/**
 * The drafting assistant fills these in, so they sit collapsed — but the search
 * snippet and the social copy are what most people actually see, so they have to
 * stay editable.
 *
 * Limits are Google's rendering budget, not a validation rule: over the limit
 * the text still saves, it just gets truncated in results.
 */
const FIELDS = [
  {
    key: "metaTitle",
    label: "Titlu în Google",
    hint: "Numele clinicii și orașul se adaugă automat.",
    limit: 55,
    rows: 0,
  },
  {
    key: "metaDescription",
    label: "Descriere în Google",
    hint: "Ce vede pacientul sub titlu în rezultate.",
    limit: 155,
    rows: 3,
  },
  {
    key: "facebookCaption",
    label: "Text pentru Facebook",
    hint: "Programarea, WhatsApp-ul și adresa se adaugă automat la final.",
    limit: 0,
    rows: 4,
  },
  {
    key: "instagramCaption",
    label: "Text pentru Instagram",
    hint: "Prima propoziție e singura vizibilă fără „mai mult”.",
    limit: 0,
    rows: 4,
  },
] as const;

export default function SeoSocialFields({
  values,
  onChange,
}: SeoSocialFieldsProps) {
  return (
    <details className="border border-border">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold select-none">
        SEO și rețele sociale
      </summary>
      <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
        {FIELDS.map((f) => {
          const value = values[f.key] ?? "";
          const over = f.limit > 0 && value.length > f.limit;
          const shared = {
            value,
            onChange: (
              e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
            ) => onChange(f.key, e.target.value),
            className:
              "w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none",
          };

          return (
            <div key={f.key}>
              <label className="flex items-baseline justify-between text-sm font-medium text-foreground mb-1">
                <span>{f.label}</span>
                {f.limit > 0 && (
                  <span
                    className={
                      over
                        ? "text-xs text-red-600"
                        : "text-xs text-muted-foreground"
                    }
                  >
                    {value.length}/{f.limit}
                  </span>
                )}
              </label>
              {f.rows > 0 ? (
                <textarea rows={f.rows} {...shared} />
              ) : (
                <input type="text" {...shared} />
              )}
              <p className="mt-1 text-xs text-muted-foreground">{f.hint}</p>
            </div>
          );
        })}
      </div>
    </details>
  );
}
