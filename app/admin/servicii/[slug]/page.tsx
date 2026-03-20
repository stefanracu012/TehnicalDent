"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { secureFetch } from "@/lib/csrf-client";
import ImageUpload from "@/components/admin/ImageUpload";

interface ServiceForm {
  title: string;
  slug: string;
  shortDesc: string;
  description: string;
  overview: string;
  process: string;
  recovery: string;
  benefits: string[];
  images: string[];
  category: string;
  order: number;
  isActive: boolean;
}

export default function EditServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [formData, setFormData] = useState<ServiceForm>({
    title: "",
    slug: "",
    shortDesc: "",
    description: "",
    overview: "",
    process: "",
    recovery: "",
    benefits: [""],
    images: [""],
    category: "",
    order: 0,
    isActive: true,
  });

  useEffect(() => {
    fetchService();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const fetchService = async () => {
    try {
      const res = await secureFetch("/api/admin/services");
      const services = await res.json();
      const service = services.find(
        (s: { slug: string }) => s.slug === slug,
      );
      if (!service) {
        alert("Serviciul nu a fost găsit");
        router.push("/admin/servicii");
        return;
      }
      setServiceId(service.id);
      setFormData({
        title: service.title,
        slug: service.slug,
        shortDesc: service.shortDesc,
        description: service.description,
        overview: service.overview || "",
        process: service.process || "",
        recovery: service.recovery || "",
        benefits: service.benefits?.length ? service.benefits : [""],
        images: service.images?.length ? service.images : [""],
        category: service.category,
        order: service.order,
        isActive: service.isActive,
      });
    } catch (error) {
      console.error("Error:", error);
      alert("Eroare la încărcarea serviciului");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleArrayChange = (
    field: "benefits" | "images",
    index: number,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  };

  const addArrayItem = (field: "benefits" | "images") => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], ""],
    }));
  };

  const removeArrayItem = (field: "benefits" | "images", index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await secureFetch(`/api/admin/services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          benefits: formData.benefits.filter((b) => b.trim()),
          images: formData.images.filter((i) => i.trim()),
        }),
      });

      if (response.ok) {
        router.push("/admin/servicii");
      } else {
        alert("Eroare la salvarea serviciului.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Eroare la salvarea serviciului.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted pt-24 flex items-center justify-center">
        <div className="text-muted-foreground">Se încarcă...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted pt-24">
      <div className="mx-auto max-w-4xl px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="font-serif text-3xl font-medium text-foreground">
            Editează serviciu
          </h1>
          <p className="mt-2 text-muted-foreground">
            Modifică informațiile pentru „{formData.title}"
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-border p-8"
        >
          <div className="space-y-8">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Titlu *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Slug (URL) *
                </label>
                <input
                  type="text"
                  name="slug"
                  required
                  value={formData.slug}
                  onChange={handleChange}
                  className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none bg-muted"
                  readOnly
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Categorie *
                </label>
                <select
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none"
                >
                  <option value="">Selectează categoria</option>
                  <option value="Chirurgie">Chirurgie</option>
                  <option value="Ortodonție">Ortodonție</option>
                  <option value="Estetică">Estetică</option>
                  <option value="Protetică">Protetică</option>
                  <option value="Tratamente">Tratamente</option>
                  <option value="Specialități">Specialități</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Ordine afișare
                </label>
                <input
                  type="number"
                  name="order"
                  value={formData.order}
                  onChange={handleChange}
                  className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Descriere scurtă *
              </label>
              <textarea
                name="shortDesc"
                required
                rows={2}
                value={formData.shortDesc}
                onChange={handleChange}
                className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Descriere completă *
              </label>
              <textarea
                name="description"
                required
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Prezentare generală
              </label>
              <textarea
                name="overview"
                rows={4}
                value={formData.overview}
                onChange={handleChange}
                className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Procesul de tratament
              </label>
              <textarea
                name="process"
                rows={4}
                value={formData.process}
                onChange={handleChange}
                className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Recuperare și îngrijire
              </label>
              <textarea
                name="recovery"
                rows={3}
                value={formData.recovery}
                onChange={handleChange}
                className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none resize-none"
              />
            </div>

            {/* Benefits */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Beneficii
              </label>
              {formData.benefits.map((benefit, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={benefit}
                    onChange={(e) =>
                      handleArrayChange("benefits", index, e.target.value)
                    }
                    className="flex-1 border border-border px-4 py-2 focus:border-foreground focus:outline-none"
                    placeholder="Beneficiu..."
                  />
                  <button
                    type="button"
                    onClick={() => removeArrayItem("benefits", index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem("benefits")}
                className="text-sm text-accent hover:text-accent/80"
              >
                + Adaugă beneficiu
              </button>
            </div>

            {/* Images with upload */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-4">
                Imagini serviciu
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="relative">
                    <ImageUpload
                      value={image}
                      onChange={(url) =>
                        handleArrayChange("images", index, url)
                      }
                      folder="services"
                      label=""
                    />
                    {formData.images.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem("images", index)}
                        className="absolute top-1 right-1 z-10 w-6 h-6 bg-red-600 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-700"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem("images")}
                  className="border-2 border-dashed border-border rounded-lg h-48 flex flex-col items-center justify-center hover:border-foreground/40 transition-colors"
                >
                  <span className="text-2xl text-muted-foreground/40">+</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Adaugă imagine
                  </span>
                </button>
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="w-4 h-4"
              />
              <label htmlFor="isActive" className="text-sm text-foreground">
                Serviciu activ (vizibil pe site)
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-6 border-t border-border">
              <Button href="/admin/servicii" variant="outline">
                Anulează
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Se salvează..." : "Salvează modificările"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
