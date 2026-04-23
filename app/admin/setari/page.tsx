"use client";

import { useState, useEffect } from "react";
import { secureFetch } from "@/lib/csrf-client";
import ImageUpload from "@/components/admin/ImageUpload";
import AboutPreviewAdmin from "@/components/AboutPreviewAdmin";

const SETTINGS_CONFIG = [
  {
    key: "heroImage",
    label: "Imagine Hero (Pagina Principală)",
    description: "Imaginea principală din secțiunea Hero a paginii de start",
    folder: "hero",
    default: "/images/hero-dentist.jpg",
  },
  {
    key: "aboutPreviewImage",
    label: 'Imagine Secțiunea "Despre noi" (Homepage)',
    description: 'Imaginea din secțiunea "Despre noi" de pe pagina principală',
    folder: "about",
    default: "/images/about-clinic.jpg",
  },
  {
    key: "aboutStoryImage",
    label: "Imagine Povestea Noastră (Despre)",
    description:
      'Imaginea din secțiunea "Povestea noastră" de pe pagina Despre noi',
    folder: "about",
    default: "/images/about-story.jpg",
  },
  {
    key: "galleryCTAImage",
    label: 'Imagine CTA Galerie ("Vă așteptăm")',
    description:
      'Imaginea de fundal din secțiunea "Doriți să vizitați clinica?" de pe pagina Galerie',
    folder: "gallery",
    default: "/images/gallery/clinic-2.jpg",
  },
  {
    key: "facilityImage1",
    label: "Imagine Spațiul Nostru #1 (Despre)",
    description:
      'Prima imagine din secțiunea "Spațiul nostru" de pe pagina Despre (stânga)',
    folder: "facility",
    default: "/images/facility-1.jpg",
  },
  {
    key: "facilityImage2",
    label: "Imagine Spațiul Nostru #2 (Despre)",
    description:
      'A doua imagine din secțiunea "Spațiul nostru" de pe pagina Despre (dreapta)',
    folder: "facility",
    default: "/images/facility-2.jpg",
  },
];

const HERO_TEXT_FIELDS = [
  {
    key: "heroTitle",
    label: "Titlu Hero",
    defaultValue: "Excelență în medicina dentară modernă",
    multiline: false,
  },
  {
    key: "heroDescription",
    label: "Descriere Hero (paragraf sub titlu)",
    defaultValue:
      "La TechnicalDent, combinăm experiența medicală de înaltă clasă cu tehnologia de ultimă generație pentru a vă oferi tratamente stomatologice personalizate. Fiecare pacient beneficiază de atenție individualizată și un plan de tratament adaptat nevoilor sale specifice, într-un mediu confortabil și primitor.",
    multiline: true,
  },
];

const STORY_TEXT_FIELDS = [
  {
    key: "aboutStorySubtitle",
    label: "Subtitlu secțiune",
    defaultValue: "Povestea noastră",
    multiline: false,
  },
  {
    key: "aboutStoryTitle",
    label: "Titlu principal",
    defaultValue: "Peste 2 ani de excelență în stomatologie",
    multiline: false,
  },
  {
    key: "aboutStoryP1",
    label: "Paragraf 1",
    defaultValue:
      "TechnicalDent a luat naștere în 2024 din dorința de a crea un spațiu în care medicina dentară de înaltă calitate să întâlnească grija autentică pentru pacient. Fondatorul nostru a pus bazele unei clinici unde fiecare tratament este realizat cu precizie, fiecare pacient este ascultat și fiecare zâmbet contează.",
    multiline: true,
  },
  {
    key: "aboutStoryP2",
    label: "Paragraf 2",
    defaultValue:
      "De-a lungul anilor, am investit constant în tehnologie de ultimă generație și în formarea continuă a echipei noastre. Am adus în Chișinău tehnici și echipamente care anterior erau disponibile doar în clinicile din Europa de Vest.",
    multiline: true,
  },
  {
    key: "aboutStoryP3",
    label: "Paragraf 3",
    defaultValue:
      "Astăzi, TechnicalDent este recunoscută ca una dintre clinicile de referință din Moldova, cu mii de pacienți mulțumiți și o reputație construită pe rezultate concrete și relații de încredere.",
    multiline: true,
  },
  {
    key: "aboutStoryStat1Value",
    label: "Stat 1 — Valoare (ex: 2024)",
    defaultValue: "2024",
    multiline: false,
  },
  {
    key: "aboutStoryStat1Label",
    label: "Stat 1 — Etichetă (ex: An fondare)",
    defaultValue: "An fondare",
    multiline: false,
  },
  {
    key: "aboutStoryStat2Value",
    label: "Stat 2 — Valoare (ex: 2+)",
    defaultValue: "2+",
    multiline: false,
  },
  {
    key: "aboutStoryStat2Label",
    label: "Stat 2 — Etichetă (ex: Ani experiență)",
    defaultValue: "Ani experiență",
    multiline: false,
  },
  {
    key: "aboutStoryStat3Value",
    label: "Stat 3 — Valoare (ex: 400+)",
    defaultValue: "400+",
    multiline: false,
  },
  {
    key: "aboutStoryStat3Label",
    label: "Stat 3 — Etichetă (ex: Pacienți)",
    defaultValue: "Pacienți",
    multiline: false,
  },
];

const ABOUT_TEXT_FIELDS = [
  {
    key: "aboutPreviewYears",
    label: 'Număr Ani (ex: "2+")',
    defaultValue: "2+",
    multiline: false,
  },
  {
    key: "aboutPreviewBadge",
    label: "Text Badge (sub numărul de ani)",
    defaultValue: "Ani de experiență în stomatologie",
    multiline: false,
  },
  {
    key: "aboutPreviewSubtitle",
    label: "Subtitlu secțiune",
    defaultValue: "Despre noi",
    multiline: false,
  },
  {
    key: "aboutPreviewTitle",
    label: "Titlu principal",
    defaultValue:
      "O clinică dedicată sănătății și frumuseții zâmbetului dumneavoastră",
    multiline: false,
  },
  {
    key: "aboutPreviewP1",
    label: "Paragraf 1",
    defaultValue:
      "TechnicalDent este mai mult decât o clinică stomatologică – este un loc unde tehnologia avansată întâlnește grija autentică pentru pacient. Cu o echipă de specialiști dedicați și echipamente de ultimă generație, oferim tratamente personalizate pentru fiecare nevoie.",
    multiline: true,
  },
  {
    key: "aboutPreviewP2",
    label: "Paragraf 2",
    defaultValue:
      "Echipa noastră de medici specialiști aduce împreună decenii de experiență și o pasiune comună pentru excelență. De la consultații detaliate la proceduri complexe, fiecare pas este ghidat de angajamentul nostru față de rezultatele perfecte.",
    multiline: true,
  },
  {
    key: "aboutPreviewStat1Value",
    label: 'Statistică 1 — Valoare (ex: "Modern")',
    defaultValue: "Modern",
    multiline: false,
  },
  {
    key: "aboutPreviewStat1Label",
    label: "Statistică 1 — Descriere",
    defaultValue: "Echipamente de ultimă generație",
    multiline: false,
  },
  {
    key: "aboutPreviewStat2Value",
    label: 'Statistică 2 — Valoare (ex: "Complet")',
    defaultValue: "Complet",
    multiline: false,
  },
  {
    key: "aboutPreviewStat2Label",
    label: "Statistică 2 — Descriere",
    defaultValue: "Toate specialitățile sub un acoperiș",
    multiline: false,
  },
  {
    key: "aboutPreviewStat3Value",
    label: 'Statistică 3 — Valoare (ex: "Personal")',
    defaultValue: "Personal",
    multiline: false,
  },
  {
    key: "aboutPreviewStat3Label",
    label: "Statistică 3 — Descriere",
    defaultValue: "Plan de tratament individualizat",
    multiline: false,
  },
  {
    key: "aboutPreviewLink",
    label: 'Text link "Află mai multe"',
    defaultValue: "Află mai multe despre noi",
    multiline: false,
  },
];

// ── Supported locales ───────────────────────────────────────────
const LOCALES = [
  { code: "ro", label: "RO", flag: "🇷🇴" },
  { code: "en", label: "EN", flag: "🇬🇧" },
  { code: "it", label: "IT", flag: "🇮🇹" },
  { code: "ru", label: "RU", flag: "🇷🇺" },
] as const;
type LocaleCode = (typeof LOCALES)[number]["code"];

// ── Reusable field component ──────────────────────────────────────
function AboutTextField({
  field,
  settings,
  setSettings,
  saving,
  saved,
  saveSetting,
  compact = false,
  keySuffix = "",
}: {
  field: (typeof ABOUT_TEXT_FIELDS)[0];
  settings: Record<string, string>;
  setSettings: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saving: string | null;
  saved: string | null;
  saveSetting: (key: string, value: string) => void;
  compact?: boolean;
  keySuffix?: string;
}) {
  const effectiveKey = field.key + (keySuffix ?? "");
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
        {field.label}
      </label>
      {field.multiline ? (
        <textarea
          rows={compact ? 2 : 3}
          value={settings[effectiveKey] ?? ""}
          onChange={(e) =>
            setSettings((prev) => ({ ...prev, [effectiveKey]: e.target.value }))
          }
          placeholder={field.defaultValue}
          className="w-full border border-border px-3 py-2.5 text-sm focus:border-foreground focus:outline-none resize-vertical bg-muted/30"
        />
      ) : (
        <input
          type="text"
          value={settings[effectiveKey] ?? ""}
          onChange={(e) =>
            setSettings((prev) => ({ ...prev, [effectiveKey]: e.target.value }))
          }
          placeholder={field.defaultValue}
          className="w-full border border-border px-3 py-2.5 text-sm focus:border-foreground focus:outline-none bg-muted/30"
        />
      )}
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={() => saveSetting(effectiveKey, settings[effectiveKey] ?? "")}
          disabled={saving === effectiveKey}
          className="text-xs font-semibold bg-foreground text-white px-3 py-1.5 hover:bg-foreground/90 transition-colors disabled:opacity-50"
        >
          {saving === effectiveKey ? "Se salvează..." : "Salvează"}
        </button>
        {saved === effectiveKey && (
          <span className="text-xs text-green-600 font-medium">✓ Salvat</span>
        )}
        {settings[effectiveKey] && (
          <button
            onClick={() => {
              setSettings((prev) => ({ ...prev, [effectiveKey]: "" }));
              saveSetting(effectiveKey, "");
            }}
            className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
          >
            Resetează
          </button>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [activeLang, setActiveLang] = useState<LocaleCode>("ro");

  useEffect(() => {
    secureFetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        // Pre-fill any missing about text fields with their default values
        const defaults: Record<string, string> = {};
        ABOUT_TEXT_FIELDS.forEach((f) => {
          if (!data[f.key]) defaults[f.key] = f.defaultValue;
        });
        STORY_TEXT_FIELDS.forEach((f) => {
          if (!data[f.key]) defaults[f.key] = f.defaultValue;
        });
        HERO_TEXT_FIELDS.forEach((f) => {
          if (!data[f.key]) defaults[f.key] = f.defaultValue;
        });
        setSettings({ ...defaults, ...data });
        setLoaded(true);
      });
  }, []);

  const saveSetting = async (
    key: string,
    value: string,
    description?: string,
  ) => {
    setSaving(key);
    try {
      await secureFetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value, description }),
      });
      setSettings((prev) => ({ ...prev, [key]: value }));
      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
    } catch {
      alert("Eroare la salvare");
    } finally {
      setSaving(null);
    }
  };

  if (!loaded) {
    return (
      <div className="min-h-screen bg-muted pt-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted pt-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground">
            Setări Site
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Modificați imaginile și textele secțiunilor site-ului
          </p>
        </div>

        {/* ── IMAGES SECTION ── */}
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
            Imagini
          </p>
        </div>
        <div className="space-y-8">
          {SETTINGS_CONFIG.map((config) => (
            <div
              key={config.key}
              className="bg-white border border-border p-6 sm:p-8"
            >
              <h2 className="font-serif text-lg font-medium text-foreground mb-1">
                {config.label}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                {config.description}
              </p>

              <ImageUpload
                value={settings[config.key] || config.default}
                onChange={(url) =>
                  saveSetting(config.key, url, config.description)
                }
                folder={config.folder}
                label="Schimbă imaginea"
              />

              {saving === config.key && (
                <p className="mt-3 text-sm text-accent">Se salvează...</p>
              )}

              {settings[config.key] &&
                settings[config.key] !== config.default && (
                  <button
                    onClick={() =>
                      saveSetting(
                        config.key,
                        config.default,
                        config.description,
                      )
                    }
                    className="mt-4 text-sm text-muted-foreground hover:text-foreground underline transition-colors"
                  >
                    Resetează la imaginea implicită
                  </button>
                )}

              {/* ── Hero text fields — shown only for heroImage ── */}
              {config.key === "heroImage" && (
                <div className="mt-8 pt-8 border-t border-border">
                  <div className="flex items-center justify-between mb-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Texte secțiune Hero
                    </p>
                    <div className="flex gap-1">
                      {LOCALES.map((l) => (
                        <button key={l.code} onClick={() => setActiveLang(l.code)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                            activeLang === l.code ? "bg-foreground text-white" : "bg-muted text-muted-foreground hover:bg-border"
                          }`}>
                          {l.flag} {l.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {activeLang !== "ro" && (
                    <p className="text-xs text-accent bg-accent-light border border-accent/20 rounded px-3 py-2 mb-5">
                      Câmpurile goale vor folosi traducerile implicite din fișierele de limbă.
                    </p>
                  )}
                  <div className="space-y-5">
                    {HERO_TEXT_FIELDS.map((field) => (
                      <AboutTextField
                        key={field.key + activeLang}
                        field={field}
                        settings={settings}
                        setSettings={setSettings}
                        saving={saving}
                        saved={saved}
                        saveSetting={saveSetting}
                        keySuffix={activeLang === "ro" ? "" : "_" + activeLang}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Story text fields — shown only for aboutStoryImage ── */}
              {config.key === "aboutStoryImage" && (
                <div className="mt-8 pt-8 border-t border-border">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-5">
                    Texte secțiune „Povestea noastră"
                  </p>

                  {/* Subtitlu + Titlu */}
                  <div className="space-y-5 mb-6">
                    {STORY_TEXT_FIELDS.filter((f) =>
                      ["aboutStorySubtitle", "aboutStoryTitle"].includes(f.key),
                    ).map((field) => (
                      <AboutTextField
                        key={field.key}
                        field={field}
                        settings={settings}
                        setSettings={setSettings}
                        saving={saving}
                        saved={saved}
                        saveSetting={saveSetting}
                      />
                    ))}
                  </div>

                  {/* Paragrafe */}
                  <div className="space-y-5 mb-6">
                    {STORY_TEXT_FIELDS.filter((f) =>
                      ["aboutStoryP1", "aboutStoryP2", "aboutStoryP3"].includes(
                        f.key,
                      ),
                    ).map((field) => (
                      <AboutTextField
                        key={field.key}
                        field={field}
                        settings={settings}
                        setSettings={setSettings}
                        saving={saving}
                        saved={saved}
                        saveSetting={saveSetting}
                      />
                    ))}
                  </div>

                  {/* Statistici */}
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">
                    Cele 3 statistici
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className="border border-dashed border-border p-4 space-y-4"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Statistică {n}
                        </p>
                        {STORY_TEXT_FIELDS.filter(
                          (f) =>
                            f.key === `aboutStoryStat${n}Value` ||
                            f.key === `aboutStoryStat${n}Label`,
                        ).map((field) => (
                          <AboutTextField
                            key={field.key}
                            field={field}
                            settings={settings}
                            setSettings={setSettings}
                            saving={saving}
                            saved={saved}
                            saveSetting={saveSetting}
                            compact
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── ABOUT PREVIEW TEXTS SECTION ── */}
        <div className="mt-12 mb-6">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Texte — Secțiunea „Despre noi” (Homepage)
            </p>
            <div className="flex gap-1">
              {LOCALES.map((l) => (
                <button key={l.code} onClick={() => setActiveLang(l.code)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                    activeLang === l.code ? "bg-foreground text-white" : "bg-muted text-muted-foreground hover:bg-border"
                  }`}>
                  {l.flag} {l.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Modificați textele afișate în secțiunea „Despre noi” de pe pagina
            principală. Lăsați un câmp gol pentru a folosi textul implicit.
          </p>
          {activeLang !== "ro" && (
            <p className="mt-2 text-xs text-accent bg-accent-light border border-accent/20 rounded px-3 py-2">
              Câmpurile goale vor folosi traducerile implicite din fișierele de limbă.
            </p>
          )}
        </div>

        {/* Live preview — identical to homepage */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Previzualizare live
          </p>
          <div className="bg-white border border-border px-6 py-10 overflow-hidden">
            <AboutPreviewAdmin
              image={settings["aboutPreviewImage"] || undefined}
              years={settings["aboutPreviewYears"] || undefined}
              badge={settings["aboutPreviewBadge"] || undefined}
              subtitle={settings["aboutPreviewSubtitle"] || undefined}
              title={settings["aboutPreviewTitle"] || undefined}
              p1={settings["aboutPreviewP1"] || undefined}
              p2={settings["aboutPreviewP2"] || undefined}
              stat1Value={settings["aboutPreviewStat1Value"] || undefined}
              stat1Label={settings["aboutPreviewStat1Label"] || undefined}
              stat2Value={settings["aboutPreviewStat2Value"] || undefined}
              stat2Label={settings["aboutPreviewStat2Label"] || undefined}
              stat3Value={settings["aboutPreviewStat3Value"] || undefined}
              stat3Label={settings["aboutPreviewStat3Label"] || undefined}
              link={settings["aboutPreviewLink"] || undefined}
            />
          </div>
        </div>

        {/* Group 1: Badge */}
        <div className="bg-white border border-border p-6 sm:p-8 mb-4">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-6 h-6 rounded-full bg-foreground text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
              1
            </span>
            <h3 className="font-serif text-base font-medium text-foreground">
              Insigna cu ani de experiență{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (colțul imaginii)
              </span>
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {ABOUT_TEXT_FIELDS.filter((f) =>
              ["aboutPreviewYears", "aboutPreviewBadge"].includes(f.key),
            ).map((field) => (
              <AboutTextField
                key={field.key + activeLang}
                field={field}
                settings={settings}
                setSettings={setSettings}
                saving={saving}
                saved={saved}
                saveSetting={saveSetting}
                keySuffix={activeLang === "ro" ? "" : "_" + activeLang}
              />
            ))}
          </div>
        </div>

        {/* Group 2: Titlu & Texte */}
        <div className="bg-white border border-border p-6 sm:p-8 mb-4">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-6 h-6 rounded-full bg-foreground text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
              2
            </span>
            <h3 className="font-serif text-base font-medium text-foreground">
              Titlu și paragrafele de text
            </h3>
          </div>
          <div className="space-y-5">
            {ABOUT_TEXT_FIELDS.filter((f) =>
              [
                "aboutPreviewSubtitle",
                "aboutPreviewTitle",
                "aboutPreviewP1",
                "aboutPreviewP2",
              ].includes(f.key),
            ).map((field) => (
              <AboutTextField
                key={field.key + activeLang}
                field={field}
                settings={settings}
                setSettings={setSettings}
                saving={saving}
                saved={saved}
                saveSetting={saveSetting}
                keySuffix={activeLang === "ro" ? "" : "_" + activeLang}
              />
            ))}
          </div>
        </div>

        {/* Group 3: Statistici */}
        <div className="bg-white border border-border p-6 sm:p-8 mb-4">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-6 h-6 rounded-full bg-foreground text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
              3
            </span>
            <h3 className="font-serif text-base font-medium text-foreground">
              Cele 3 statistici{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (Modern / Complet / Personal)
              </span>
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="border border-dashed border-border p-4 space-y-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Statistică {n}
                </p>
                {ABOUT_TEXT_FIELDS.filter(
                  (f) =>
                    f.key === `aboutPreviewStat${n}Value` ||
                    f.key === `aboutPreviewStat${n}Label`,
                ).map((field) => (
                  <AboutTextField
                    key={field.key + activeLang}
                    field={field}
                    settings={settings}
                    setSettings={setSettings}
                    saving={saving}
                    saved={saved}
                    saveSetting={saveSetting}
                    compact
                    keySuffix={activeLang === "ro" ? "" : "_" + activeLang}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Group 4: Link */}
        <div className="bg-white border border-border p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-6 h-6 rounded-full bg-foreground text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
              4
            </span>
            <h3 className="font-serif text-base font-medium text-foreground">
              Link „Află mai multe"
            </h3>
          </div>
          {ABOUT_TEXT_FIELDS.filter((f) => f.key === "aboutPreviewLink").map(
            (field) => (
              <AboutTextField
                key={field.key + activeLang}
                field={field}
                settings={settings}
                setSettings={setSettings}
                saving={saving}
                saved={saved}
                saveSetting={saveSetting}
                keySuffix={activeLang === "ro" ? "" : "_" + activeLang}
              />
            ),
          )}
        </div>
      </div>
    </div>
  );
}
