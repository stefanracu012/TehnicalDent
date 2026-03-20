"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";

export default function NewServicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
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

  const generateSlug = () => {
    const slug = formData.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    setFormData((prev) => ({ ...prev, slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/admin/services", {
        method: "POST",
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
        alert("A apărut o eroare la salvarea serviciului.");
      }
    } catch (error) {
      console.error("Error creating service:", error);
      alert("A apărut o eroare la salvarea serviciului.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted pt-24">
      <div className="mx-auto max-w-4xl px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="font-serif text-3xl font-medium text-foreground">
            Adaugă serviciu nou
          </h1>
          <p className="mt-2 text-muted-foreground">
            Completați informațiile pentru noul serviciu
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
                  onBlur={generateSlug}
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
                  className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none"
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
                Prezentare generală *
              </label>
              <textarea
                name="overview"
                required
                rows={4}
                value={formData.overview}
                onChange={handleChange}
                className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Procesul de tratament *
              </label>
              <textarea
                name="process"
                required
                rows={4}
                value={formData.process}
                onChange={handleChange}
                className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Recuperare și îngrijire *
              </label>
              <textarea
                name="recovery"
                required
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

            {/* Images */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Imagini (URL-uri)
              </label>
              {formData.images.map((image, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={image}
                    onChange={(e) =>
                      handleArrayChange("images", index, e.target.value)
                    }
                    className="flex-1 border border-border px-4 py-2 focus:border-foreground focus:outline-none"
                    placeholder="/images/services/..."
                  />
                  <button
                    type="button"
                    onClick={() => removeArrayItem("images", index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem("images")}
                className="text-sm text-accent hover:text-accent/80"
              >
                + Adaugă imagine
              </button>
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
              <Button type="submit" disabled={loading}>
                {loading ? "Se salvează..." : "Salvează serviciu"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
