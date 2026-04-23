"use client";

import { useState, useEffect } from "react";
import { secureFetch } from "@/lib/csrf-client";
import ImageUpload from "@/components/admin/ImageUpload";

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

const ABOUT_TEXT_FIELDS = [
  {
    key: "aboutPreviewYears",
    label: 'Număr Ani (ex: "2+")',
    placeholder: "2+",
    multiline: false,
  },
  {
    key: "aboutPreviewBadge",
    label: "Text Badge (sub numărul de ani)",
    placeholder: "Ani de experiență în stomatologie",
    multiline: false,
  },
  {
    key: "aboutPreviewSubtitle",
    label: "Subtitlu secțiune",
    placeholder: "Despre noi",
    multiline: false,
  },
  {
    key: "aboutPreviewTitle",
    label: "Titlu principal",
    placeholder:
      "O clinică dedicată sănătății și frumuseții zâmbetului dumneavoastră",
    multiline: false,
  },
  {
    key: "aboutPreviewP1",
    label: "Paragraf 1",
    placeholder: "TechnicalDent este mai mult decât o clinică stomatologică...",
    multiline: true,
  },
  {
    key: "aboutPreviewP2",
    label: "Paragraf 2",
    placeholder: "Echipa noastră de medici specialiști...",
    multiline: true,
  },
  {
    key: "aboutPreviewStat1Value",
    label: 'Statistică 1 — Valoare (ex: "Modern")',
    placeholder: "Modern",
    multiline: false,
  },
  {
    key: "aboutPreviewStat1Label",
    label: "Statistică 1 — Descriere",
    placeholder: "Echipamente de ultimă generație",
    multiline: false,
  },
  {
    key: "aboutPreviewStat2Value",
    label: 'Statistică 2 — Valoare (ex: "Complet")',
    placeholder: "Complet",
    multiline: false,
  },
  {
    key: "aboutPreviewStat2Label",
    label: "Statistică 2 — Descriere",
    placeholder: "Toate specialitățile sub un acoperiș",
    multiline: false,
  },
  {
    key: "aboutPreviewStat3Value",
    label: 'Statistică 3 — Valoare (ex: "Personal")',
    placeholder: "Personal",
    multiline: false,
  },
  {
    key: "aboutPreviewStat3Label",
    label: "Statistică 3 — Descriere",
    placeholder: "Plan de tratament individualizat",
    multiline: false,
  },
  {
    key: "aboutPreviewLink",
    label: 'Text link "Află mai multe"',
    placeholder: "Află mai multe despre noi",
    multiline: false,
  },
];

// ── Reusable field component ──────────────────────────────────────
function AboutTextField({
  field,
  settings,
  setSettings,
  saving,
  saved,
  saveSetting,
  compact = false,
}: {
  field: (typeof ABOUT_TEXT_FIELDS)[0];
  settings: Record<string, string>;
  setSettings: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saving: string | null;
  saved: string | null;
  saveSetting: (key: string, value: string) => void;
  compact?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
        {field.label}
      </label>
      {field.multiline ? (
        <textarea
          rows={compact ? 2 : 3}
          value={settings[field.key] ?? ""}
          onChange={(e) =>
            setSettings((prev) => ({ ...prev, [field.key]: e.target.value }))
          }
          placeholder={field.placeholder}
          className="w-full border border-border px-3 py-2.5 text-sm focus:border-foreground focus:outline-none resize-vertical bg-muted/30"
        />
      ) : (
        <input
          type="text"
          value={settings[field.key] ?? ""}
          onChange={(e) =>
            setSettings((prev) => ({ ...prev, [field.key]: e.target.value }))
          }
          placeholder={field.placeholder}
          className="w-full border border-border px-3 py-2.5 text-sm focus:border-foreground focus:outline-none bg-muted/30"
        />
      )}
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={() => saveSetting(field.key, settings[field.key] ?? "")}
          disabled={saving === field.key}
          className="text-xs font-semibold bg-foreground text-white px-3 py-1.5 hover:bg-foreground/90 transition-colors disabled:opacity-50"
        >
          {saving === field.key ? "Se salvează..." : "Salvează"}
        </button>
        {saved === field.key && (
          <span className="text-xs text-green-600 font-medium">✓ Salvat</span>
        )}
        {settings[field.key] && (
          <button
            onClick={() => {
              setSettings((prev) => ({ ...prev, [field.key]: "" }));
              saveSetting(field.key, "");
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

  useEffect(() => {
    secureFetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
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
            </div>
          ))}
        </div>

        {/* ── ABOUT PREVIEW TEXTS SECTION ── */}
        <div className="mt-12 mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1">
            Texte — Secțiunea „Despre noi" (Homepage)
          </p>
          <p className="text-sm text-muted-foreground">
            Modificați textele afișate în secțiunea „Despre noi" de pe pagina
            principală. Lăsați un câmp gol pentru a folosi textul implicit.
          </p>
        </div>

        {/* Visual layout hint */}
        <div className="mb-6 border border-dashed border-border bg-white p-5 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground mb-3 text-sm">Previzualizare structură secțiune</p>
          <div className="grid grid-cols-2 gap-4">
            {/* Left col - image */}
            <div className="bg-muted rounded-lg p-4 flex flex-col items-center justify-center gap-2 min-h-[120px]">
              <div className="w-full h-16 bg-border/60 rounded flex items-center justify-center text-[11px] font-medium text-muted-foreground">
                📷 Imaginea secțiunii
              </div>
              <div className="w-24 h-16 bg-white rounded shadow-sm border border-border flex flex-col items-center justify-center self-end -mt-6 -mr-2 ml-auto">
                <span className="font-bold text-lg text-foreground">2+</span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight px-1">Ani de experiență</span>
              </div>
            </div>
            {/* Right col - text */}
            <div className="space-y-1.5">
              <div className="h-2 w-12 bg-muted-foreground/30 rounded" title="Subtitlu" />
              <div className="h-3 w-full bg-foreground/20 rounded" title="Titlu" />
              <div className="h-2 w-full bg-muted-foreground/20 rounded" title="Paragraf 1" />
              <div className="h-2 w-5/6 bg-muted-foreground/20 rounded" />
              <div className="h-2 w-full bg-muted-foreground/20 rounded mt-1" title="Paragraf 2" />
              <div className="h-2 w-4/6 bg-muted-foreground/20 rounded" />
              <div className="flex gap-3 mt-2">
                {["Stat 1", "Stat 2", "Stat 3"].map((s) => (
                  <div key={s} className="flex-1 space-y-1">
                    <div className="h-3 w-8 bg-foreground/25 rounded" />
                    <div className="h-2 w-full bg-muted-foreground/20 rounded" />
                  </div>
                ))}
              </div>
              <div className="h-2 w-24 bg-foreground/30 rounded mt-1" title="Link" />
            </div>
          </div>
        </div>

        {/* Group 1: Badge */}
        <div className="bg-white border border-border p-6 sm:p-8 mb-4">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-6 h-6 rounded-full bg-foreground text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
            <h3 className="font-serif text-base font-medium text-foreground">Insigna cu ani de experiență <span className="text-xs font-normal text-muted-foreground">(colțul imaginii)</span></h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {ABOUT_TEXT_FIELDS.filter(f => ["aboutPreviewYears","aboutPreviewBadge"].includes(f.key)).map((field) => (
              <AboutTextField key={field.key} field={field} settings={settings} setSettings={setSettings} saving={saving} saved={saved} saveSetting={saveSetting} />
            ))}
          </div>
        </div>

        {/* Group 2: Titlu & Texte */}
        <div className="bg-white border border-border p-6 sm:p-8 mb-4">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-6 h-6 rounded-full bg-foreground text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
            <h3 className="font-serif text-base font-medium text-foreground">Titlu și paragrafele de text</h3>
          </div>
          <div className="space-y-5">
            {ABOUT_TEXT_FIELDS.filter(f => ["aboutPreviewSubtitle","aboutPreviewTitle","aboutPreviewP1","aboutPreviewP2"].includes(f.key)).map((field) => (
              <AboutTextField key={field.key} field={field} settings={settings} setSettings={setSettings} saving={saving} saved={saved} saveSetting={saveSetting} />
            ))}
          </div>
        </div>

        {/* Group 3: Statistici */}
        <div className="bg-white border border-border p-6 sm:p-8 mb-4">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-6 h-6 rounded-full bg-foreground text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
            <h3 className="font-serif text-base font-medium text-foreground">Cele 3 statistici <span className="text-xs font-normal text-muted-foreground">(Modern / Complet / Personal)</span></h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[1,2,3].map((n) => (
              <div key={n} className="border border-dashed border-border p-4 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Statistică {n}</p>
                {ABOUT_TEXT_FIELDS.filter(f => f.key === `aboutPreviewStat${n}Value` || f.key === `aboutPreviewStat${n}Label`).map((field) => (
                  <AboutTextField key={field.key} field={field} settings={settings} setSettings={setSettings} saving={saving} saved={saved} saveSetting={saveSetting} compact />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Group 4: Link */}
        <div className="bg-white border border-border p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-6 h-6 rounded-full bg-foreground text-white text-xs font-bold flex items-center justify-center flex-shrink-0">4</span>
            <h3 className="font-serif text-base font-medium text-foreground">Link „Află mai multe"</h3>
          </div>
          {ABOUT_TEXT_FIELDS.filter(f => f.key === "aboutPreviewLink").map((field) => (
            <AboutTextField key={field.key} field={field} settings={settings} setSettings={setSettings} saving={saving} saved={saved} saveSetting={saveSetting} />
          ))}
        </div>
      </div>
    </div>
  );
}
