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
        <div className="mt-12 mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1">
            Texte — Secțiunea „Despre noi" (Homepage)
          </p>
          <p className="text-sm text-muted-foreground">
            Modificați textele afișate în secțiunea „Despre noi" de pe pagina
            principală. Lăsați un câmp gol pentru a folosi textul implicit.
          </p>
        </div>
        <div className="bg-white border border-border p-6 sm:p-8 space-y-6">
          {ABOUT_TEXT_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-foreground mb-1">
                {field.label}
              </label>
              {field.multiline ? (
                <textarea
                  rows={3}
                  value={settings[field.key] ?? ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                  placeholder={field.placeholder}
                  className="w-full border border-border px-4 py-3 text-sm focus:border-foreground focus:outline-none resize-vertical"
                />
              ) : (
                <input
                  type="text"
                  value={settings[field.key] ?? ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                  placeholder={field.placeholder}
                  className="w-full border border-border px-4 py-3 text-sm focus:border-foreground focus:outline-none"
                />
              )}
              <div className="mt-2 flex items-center gap-4">
                <button
                  onClick={() =>
                    saveSetting(field.key, settings[field.key] ?? "")
                  }
                  disabled={saving === field.key}
                  className="text-sm font-semibold bg-foreground text-white px-4 py-1.5 hover:bg-foreground/90 transition-colors disabled:opacity-50"
                >
                  {saving === field.key ? "Se salvează..." : "Salvează"}
                </button>
                {saved === field.key && (
                  <span className="text-sm text-green-600">✓ Salvat</span>
                )}
                {settings[field.key] && (
                  <button
                    onClick={() => {
                      setSettings((prev) => ({ ...prev, [field.key]: "" }));
                      saveSetting(field.key, "");
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
                  >
                    Resetează
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
