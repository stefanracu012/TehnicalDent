import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: "noindex, nofollow",
};

const adminLinks = [
  {
    title: "Servicii",
    description: "Adaugă, editează sau șterge serviciile clinicii",
    href: "/admin/servicii",
  },
  {
    title: "Echipa",
    description: "Gestionează membrii echipei și profilurile acestora",
    href: "/admin/echipa",
  },
  {
    title: "Testimoniale",
    description: "Administrează testimonialele pacienților",
    href: "/admin/testimoniale",
  },
  {
    title: "Galerie",
    description: "Încarcă și organizează imaginile din galerie",
    href: "/admin/galerie",
  },
  {
    title: "Blog",
    description: "Creați și gestionați articolele de pe blog (Recomandări)",
    href: "/admin/blog",
  },
  {
    title: "Mesaje",
    description: "Vezi mesajele primite prin formularul de contact",
    href: "/admin/mesaje",
  },
];

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-muted pt-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="font-serif text-3xl font-medium text-foreground">
            Panou de administrare
          </h1>
          <p className="mt-2 text-muted-foreground">
            Gestionați conținutul site-ului TechnicalDent
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group block bg-white p-8 border border-border hover:border-foreground transition-colors"
            >
              <h2 className="font-serif text-xl font-medium text-foreground group-hover:text-accent transition-colors">
                {link.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {link.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
