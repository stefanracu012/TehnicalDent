"use client";

const LOCALE_LABELS = [
  { code: "ro", label: "🇷🇴 RO" },
  { code: "en", label: "🇬🇧 EN" },
  { code: "ru", label: "🇷🇺 RU" },
  { code: "it", label: "🇮🇹 IT" },
];

export default function LanguageTabs({
  active,
  onChange,
}: {
  active: string;
  onChange: (locale: string) => void;
}) {
  return (
    <div className="flex gap-1 p-1 bg-muted rounded-lg mb-6">
      {LOCALE_LABELS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => onChange(l.code)}
          className={`flex-1 px-3 py-2.5 text-sm font-semibold rounded-md transition-all ${
            active === l.code
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
