"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import { secureFetch } from "@/lib/csrf-client";

interface Service {
  id: string;
  slug: string;
  title: string;
  shortDesc: string;
  category: string;
  isActive: boolean;
  order: number;
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await secureFetch("/api/admin/services");
      const data = await response.json();
      setServices(data);
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await secureFetch(`/api/admin/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      fetchServices();
    } catch (error) {
      console.error("Error updating service:", error);
    }
  };

  const deleteService = async (id: string) => {
    if (!confirm("Sigur doriți să ștergeți acest serviciu?")) return;

    try {
      await secureFetch(`/api/admin/services/${id}`, { method: "DELETE" });
      fetchServices();
    } catch (error) {
      console.error("Error deleting service:", error);
    }
  };

  return (
    <div className="min-h-screen bg-muted pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 sm:mb-12">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground">
              Servicii
            </h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">
              Gestionați serviciile afișate pe site
            </p>
          </div>
          <Button href="/admin/servicii/nou" className="self-start sm:self-auto">Adaugă serviciu</Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Se încarcă...
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-12 bg-white border border-border">
            <p className="text-muted-foreground mb-4">
              Nu există servicii înregistrate.
            </p>
            <Button href="/admin/servicii/nou">Adaugă primul serviciu</Button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white border border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                    Titlu
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                    Categorie
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                    Ordine
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                    Status
                  </th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">
                    Acțiuni
                  </th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr
                    key={service.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium text-foreground">
                          {service.title}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {service.shortDesc}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-muted-foreground">
                      {service.category}
                    </td>
                    <td className="py-4 px-6 text-sm text-muted-foreground">
                      {service.order}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium ${
                          service.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {service.isActive ? "Activ" : "Inactiv"}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() =>
                            toggleActive(service.id, service.isActive)
                          }
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {service.isActive ? "Dezactivează" : "Activează"}
                        </button>
                        <Link
                          href={`/admin/servicii/${service.slug}`}
                          className="text-sm text-accent hover:text-accent/80 transition-colors"
                        >
                          Editează
                        </Link>
                        <button
                          onClick={() => deleteService(service.id)}
                          className="text-sm text-red-600 hover:text-red-800 transition-colors"
                        >
                          Șterge
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="bg-white border border-border p-4 rounded-lg"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {service.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {service.shortDesc}
                      </p>
                    </div>
                    <span
                      className={`flex-shrink-0 inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                        service.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {service.isActive ? "Activ" : "Inactiv"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span>{service.category}</span>
                    <span>•</span>
                    <span>Ordine: {service.order}</span>
                  </div>
                  <div className="flex gap-3 pt-3 border-t border-border">
                    <button
                      onClick={() =>
                        toggleActive(service.id, service.isActive)
                      }
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {service.isActive ? "Dezactivează" : "Activează"}
                    </button>
                    <Link
                      href={`/admin/servicii/${service.slug}`}
                      className="text-xs font-semibold text-accent hover:text-accent/80 transition-colors"
                    >
                      Editează
                    </Link>
                    <button
                      onClick={() => deleteService(service.id)}
                      className="text-xs font-semibold text-red-600 hover:text-red-800 transition-colors"
                    >
                      Șterge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
