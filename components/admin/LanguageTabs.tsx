"use client";

/* Small inline SVG flag icons – no emoji dependency */
function FlagRO() {
  return (
    <svg
      viewBox="0 0 24 16"
      className="w-5 h-3.5 inline-block shrink-0 rounded-[1px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.08)]"
    >
      <rect width="8" height="16" fill="#002B7F" />
      <rect x="8" width="8" height="16" fill="#FCD116" />
      <rect x="16" width="8" height="16" fill="#CE1126" />
    </svg>
  );
}

function FlagEN() {
  return (
    <svg
      viewBox="0 0 60 30"
      className="w-5 h-3.5 inline-block shrink-0 rounded-[1px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.08)]"
    >
      <clipPath id="s">
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id="t">
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath="url(#s)">
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path
          d="M0,0 L60,30 M60,0 L0,30"
          clipPath="url(#t)"
          stroke="#C8102E"
          strokeWidth="4"
        />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}

function FlagRU() {
  return (
    <svg
      viewBox="0 0 24 16"
      className="w-5 h-3.5 inline-block shrink-0 rounded-[1px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.08)]"
    >
      <rect width="24" height="5.33" fill="#fff" />
      <rect y="5.33" width="24" height="5.33" fill="#0039A6" />
      <rect y="10.67" width="24" height="5.33" fill="#D52B1E" />
    </svg>
  );
}

function FlagIT() {
  return (
    <svg
      viewBox="0 0 24 16"
      className="w-5 h-3.5 inline-block shrink-0 rounded-[1px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.08)]"
    >
      <rect width="8" height="16" fill="#009246" />
      <rect x="8" width="8" height="16" fill="#fff" />
      <rect x="16" width="8" height="16" fill="#CE2B37" />
    </svg>
  );
}

const LOCALE_LABELS: {
  code: string;
  Flag: () => React.JSX.Element;
  label: string;
}[] = [
  { code: "ro", Flag: FlagRO, label: "RO" },
  { code: "en", Flag: FlagEN, label: "EN" },
  { code: "ru", Flag: FlagRU, label: "RU" },
  { code: "it", Flag: FlagIT, label: "IT" },
];

export default function LanguageTabs({
  active,
  onChange,
}: {
  active: string;
  onChange: (locale: string) => void;
}) {
  return (
    <div className="flex gap-1 p-1 bg-muted rounded-lg">
      {LOCALE_LABELS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => onChange(l.code)}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold rounded-md transition-all ${
            active === l.code
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <l.Flag />
          {l.label}
        </button>
      ))}
    </div>
  );
}
