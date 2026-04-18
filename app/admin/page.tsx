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
  {
    title: "Setări",
    description: "Modificați imaginea Hero și alte setări ale site-ului",
    href: "/admin/setari",
  },
];

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-muted pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8 sm:mb-12">
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground">
            Panou de administrare
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">
            Gestionați conținutul site-ului TechnicalDent
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group block bg-white p-5 sm:p-8 border border-border hover:border-foreground transition-colors"
            >
              <h2 className="font-serif text-lg sm:text-xl font-medium text-foreground group-hover:text-accent transition-colors">
                {link.title}
              </h2>
              <p className="mt-1 sm:mt-2 text-sm text-muted-foreground">
                {link.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
