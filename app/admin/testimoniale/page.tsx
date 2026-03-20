"use client";

import { useState, useEffect } from "react";

interface Testimonial {
  id: string;
  name: string;
  content: string;
  service: string | null;
  isActive: boolean;
  createdAt: string;
}

const emptyTestimonial = {
  name: "",
  content: "",
  service: "",
  isActive: true,
};

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [formData, setFormData] = useState(emptyTestimonial);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      const res = await fetch("/api/admin/testimonials");
      const data = await res.json();
      setTestimonials(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setEditing(null);
    setFormData(emptyTestimonial);
    setShowForm(true);
  };

  const openEdit = (t: Testimonial) => {
    setEditing(t);
    setFormData({
      name: t.name,
      content: t.content,
      service: t.service || "",
      isActive: t.isActive,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editing
        ? `/api/admin/testimonials/${editing.id}`
        : "/api/admin/testimonials";
      const method = editing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          service: formData.service || null,
        }),
      });

      if (res.ok) {
        setShowForm(false);
        setEditing(null);
        fetchTestimonials();
      } else {
        alert("Eroare la salvare");
      }
    } catch {
      alert("Eroare la salvare");
    } finally {
      setSaving(false);
    }
  };

  const deleteTestimonial = async (id: string) => {
    if (!confirm("Sigur doriți să ștergeți acest testimonial?")) return;
    try {
      await fetch(`/api/admin/testimonials/${id}`, { method: "DELETE" });
      fetchTestimonials();
    } catch {
      alert("Eroare la ștergere");
    }
  };

  const toggleActive = async (t: Testimonial) => {
    try {
      await fetch(`/api/admin/testimonials/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !t.isActive }),
      });
      fetchTestimonials();
    } catch {
      alert("Eroare");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ro-RO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-muted pt-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="font-serif text-3xl font-medium text-foreground">
              Testimoniale
            </h1>
            <p className="mt-2 text-muted-foreground">
              Administrați testimonialele pacienților
            </p>
          </div>
          <button
            onClick={openNew}
            className="bg-foreground text-white text-sm font-semibold px-6 py-3 hover:bg-foreground/90 transition-colors"
          >
            + Adaugă testimonial
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 rounded-lg">
              <h2 className="font-serif text-2xl font-medium text-foreground mb-6">
                {editing ? "Editează testimonial" : "Adaugă testimonial nou"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Numele pacientului *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, name: e.target.value }))
                    }
                    className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Testimonialul *
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formData.content}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, content: e.target.value }))
                    }
                    className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Serviciul asociat (opțional)
                  </label>
                  <select
                    value={formData.service}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, service: e.target.value }))
                    }
                    className="w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none"
                  >
                    <option value="">Fără serviciu asociat</option>
                    <option value="Implantologie">Implantologie</option>
                    <option value="Ortodonție">Ortodonție</option>
                    <option value="Estetică dentară">Estetică dentară</option>
                    <option value="Chirurgie orală">Chirurgie orală</option>
                    <option value="Protetică dentară">Protetică dentară</option>
                    <option value="Endodonție">Endodonție</option>
                    <option value="Parodontologie">Parodontologie</option>
                    <option value="Pedodonție">Pedodonție</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        isActive: e.target.checked,
                      }))
                    }
                    className="w-4 h-4"
                  />
                  <label htmlFor="isActive" className="text-sm text-foreground">
                    Activ (vizibil pe site)
                  </label>
                </div>

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

        {/* Testimonials List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Se încarcă...
          </div>
        ) : testimonials.length === 0 ? (
          <div className="text-center py-12 bg-white border border-border">
            <p className="text-muted-foreground mb-4">
              Nu există testimoniale.
            </p>
            <button
              onClick={openNew}
              className="text-accent hover:text-accent/80 text-sm font-semibold"
            >
              Adaugă primul testimonial
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {testimonials.map((t) => (
              <div
                key={t.id}
                className={`bg-white border border-border p-6 ${!t.isActive ? "opacity-50" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-serif text-lg font-medium text-foreground">
                        {t.name}
                      </h3>
                      {t.service && (
                        <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                          {t.service}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(t.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      &ldquo;{t.content}&rdquo;
                    </p>
                  </div>
                  <div className="flex gap-3 ml-6 flex-shrink-0">
                    <button
                      onClick={() => openEdit(t)}
                      className="text-xs text-accent hover:text-accent/80 font-semibold"
                    >
                      Editează
                    </button>
                    <button
                      onClick={() => toggleActive(t)}
                      className="text-xs text-muted-foreground hover:text-foreground font-semibold"
                    >
                      {t.isActive ? "Dezactivează" : "Activează"}
                    </button>
                    <button
                      onClick={() => deleteTestimonial(t.id)}
                      className="text-xs text-red-600 hover:text-red-800 font-semibold"
                    >
                      Șterge
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
