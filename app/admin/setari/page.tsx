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
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
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
            Modificați imaginile și setările generale ale site-ului
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
      </div>
    </div>
  );
}
