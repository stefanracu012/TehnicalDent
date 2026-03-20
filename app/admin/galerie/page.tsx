"use client";

import { useState, useEffect } from "react";
import ImageUpload from "@/components/admin/ImageUpload";
import { secureFetch } from "@/lib/csrf-client";
import LanguageTabs from "@/components/admin/LanguageTabs";
import AutoTranslateButton from "@/components/admin/AutoTranslateButton";

type Translations = Record<string, Record<string, string>>;

interface GalleryImage {
  id: string;
  url: string;
  alt: string;
  category: string;
  order: number;
  isActive: boolean;
  translations?: Translations | null;
}

const categories = ["Clinică", "Echipament", "Rezultate"];

const emptyImage = {
  url: "",
  alt: "",
  category: "Clinică",
  order: 0,
  isActive: true,
};

export default function AdminGalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<GalleryImage | null>(null);
  const [formData, setFormData] = useState(emptyImage);
  const [showForm, setShowForm] = useState(false);
  const [filterCat, setFilterCat] = useState("Toate");
  const [activeLocale, setActiveLocale] = useState("ro");
  const [translations, setTranslations] = useState<Translations>({});

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const res = await secureFetch("/api/admin/gallery");
      const data = await res.json();
      setImages(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getField = (field: string): string => {
    if (activeLocale === "ro")
      return (
        ((formData as unknown as Record<string, unknown>)[field] as string) ||
        ""
      );
    return (translations[activeLocale]?.[field] as string) || "";
  };

  const setField = (field: string, value: string) => {
    if (activeLocale === "ro") {
      setFormData((prev) => ({ ...prev, [field]: value }));
    } else {
      setTranslations((prev) => ({
        ...prev,
        [activeLocale]: { ...(prev[activeLocale] || {}), [field]: value },
      }));
    }
  };

  const openNew = () => {
    setEditing(null);
    setFormData(emptyImage);
    setTranslations({});
    setActiveLocale("ro");
    setShowForm(true);
  };

  const openEdit = (img: GalleryImage) => {
    setEditing(img);
    setFormData({
      url: img.url,
      alt: img.alt,
      category: img.category,
      order: img.order,
      isActive: img.isActive,
    });
    setTranslations((img.translations as Translations) || {});
    setActiveLocale("ro");
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.url) {
      alert("Vă rugăm încărcați o imagine");
      return;
    }
    setSaving(true);
    try {
      const cleanTranslations: Translations = {};
      for (const [loc, fields] of Object.entries(translations)) {
        const cleaned: Record<string, string> = {};
        for (const [key, val] of Object.entries(fields)) {
          if (typeof val === "string" && val.trim()) cleaned[key] = val;
        }
        if (Object.keys(cleaned).length > 0) cleanTranslations[loc] = cleaned;
      }

      const url = editing
        ? `/api/admin/gallery/${editing.id}`
        : "/api/admin/gallery";
      const method = editing ? "PATCH" : "POST";
      const res = await secureFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          translations:
            Object.keys(cleanTranslations).length > 0
              ? cleanTranslations
              : null,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setEditing(null);
        fetchImages();
      } else {
        alert("Eroare la salvare");
      }
    } catch {
      alert("Eroare la salvare");
    } finally {
      setSaving(false);
    }
  };

  const deleteImage = async (id: string) => {
    if (!confirm("Sigur doriți să ștergeți această imagine?")) return;
    try {
      await secureFetch(`/api/admin/gallery/${id}`, { method: "DELETE" });
      fetchImages();
    } catch {
      alert("Eroare la ștergere");
    }
  };

  const toggleActive = async (img: GalleryImage) => {
    try {
      await secureFetch(`/api/admin/gallery/${img.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !img.isActive }),
      });
      fetchImages();
    } catch {
      alert("Eroare");
    }
  };

  const filtered =
    filterCat === "Toate"
      ? images
      : images.filter((img) => img.category === filterCat);

  return (
    <div className="min-h-screen bg-muted pt-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-medium text-foreground">
              Galerie
            </h1>
            <p className="mt-2 text-muted-foreground">
              Încărcați și organizați imaginile din galerie
            </p>
          </div>
          <button
            onClick={openNew}
            className="bg-foreground text-white text-sm font-semibold px-6 py-3 hover:bg-foreground/90 transition-colors"
          >
            + Adaugă imagine
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {["Toate", ...categories].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${filterCat === cat ? "bg-foreground text-white" : "bg-white border border-border text-muted-foreground hover:text-foreground"}`}
            >
              {cat}
              {cat !== "Toate" && (
                <span className="ml-1.5 text-xs opacity-60">
                  ({images.filter((i) => i.category === cat).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto p-8 rounded-lg">
              <h2 className="font-serif text-2xl font-medium text-foreground mb-6">
                {editing ? "Editează imagine" : "Adaugă imagine nouă"}
              </h2>

              <div className="mb-4 space-y-3">
                <LanguageTabs
                  active={activeLocale}
                  onChange={setActiveLocale}
                />
                <AutoTranslateButton
                  formData={formData as unknown as Record<string, unknown>}
                  translatableFields={["alt", "category"]}
                  onTranslationsReady={setTranslations}
                />
                {activeLocale !== "ro" && (
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <svg
                      className="h-3.5 w-3.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                      />
                    </svg>
                    Editați traducerea. Câmpurile goale vor folosi textul în
                    română.
                  </p>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {activeLocale === "ro" && (
                  <ImageUpload
                    value={formData.url}
                    onChange={(url) => setFormData((p) => ({ ...p, url }))}
                    folder="gallery"
                    label="Imagine *"
                  />
                )}

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Descriere imagine (alt) *
                  </label>
                  <input
                    type="text"
                    required={activeLocale === "ro"}
                    value={getField("alt")}
                    onChange={(e) => setField("alt", e.target.value)}
                    placeholder={
                      activeLocale !== "ro"
                        ? formData.alt
                        : "ex: Cabinet stomatologic modern"
                    }
                    className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Categorie *
                    </label>
                    {activeLocale === "ro" ? (
                      <select
                        value={formData.category}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            category: e.target.value,
                          }))
                        }
                        className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none"
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={getField("category")}
                        onChange={(e) => setField("category", e.target.value)}
                        placeholder={formData.category}
                        className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Ordine
                    </label>
                    <input
                      type="number"
                      value={formData.order}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          order: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none"
                      disabled={activeLocale !== "ro"}
                    />
                  </div>
                </div>

                {activeLocale === "ro" && (
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isActiveGallery"
                      checked={formData.isActive}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          isActive: e.target.checked,
                        }))
                      }
                      className="w-4 h-4"
                    />
                    <label
                      htmlFor="isActiveGallery"
                      className="text-sm text-foreground"
                    >
                      Activă (vizibilă pe site)
                    </label>
                  </div>
                )}

                <div className="flex justify-end gap-4 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-3 text-sm font-semibold border border-border hover:bg-muted transition-colors"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-foreground text-white text-sm font-semibold px-6 py-3 hover:bg-foreground/90 transition-colors disabled:opacity-50"
                  >
                    {saving ? "Se salvează..." : "Salvează"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Se încarcă...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white border border-border">
            <p className="text-muted-foreground mb-4">
              {images.length === 0
                ? "Nu există imagini în galerie."
                : "Nu există imagini în această categorie."}
            </p>
            <button
              onClick={openNew}
              className="text-accent hover:text-accent/80 text-sm font-semibold"
            >
              Adaugă prima imagine
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((img) => (
              <div
                key={img.id}
                className={`group relative bg-white border border-border overflow-hidden rounded-lg ${!img.isActive ? "opacity-50" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.alt}
                  className="w-full h-40 object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <button
                    onClick={() => openEdit(img)}
                    className="bg-white text-foreground text-xs font-semibold px-4 py-1.5 rounded-full hover:bg-white/90"
                  >
                    Editează
                  </button>
                  <button
                    onClick={() => toggleActive(img)}
                    className="bg-white/20 text-white text-xs font-semibold px-4 py-1.5 rounded-full hover:bg-white/30 border border-white/30"
                  >
                    {img.isActive ? "Dezactivează" : "Activează"}
                  </button>
                  <button
                    onClick={() => deleteImage(img.id)}
                    className="bg-red-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full hover:bg-red-700"
                  >
                    Șterge
                  </button>
                </div>
                <div className="p-3">
                  <p className="text-xs text-muted-foreground truncate">
                    {img.alt}
                  </p>
                  <span className="text-[10px] text-accent font-medium uppercase tracking-wider">
                    {img.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
