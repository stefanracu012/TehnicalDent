"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/admin/LogoutButton";

const navLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/servicii", label: "Servicii" },
  { href: "/admin/echipa", label: "Echipa" },
  { href: "/admin/testimoniale", label: "Testimoniale" },
  { href: "/admin/galerie", label: "Galerie" },
  { href: "/admin/blog", label: "Blog" },
  { href: "/admin/mesaje", label: "Mesaje" },
];

export default function AdminNav() {
  const pathname = usePathname();

  // Hide nav on login page
  if (pathname === "/admin/login") {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 bg-foreground text-white shadow-lg">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm px-3 py-2 rounded-md transition-colors ${
                    isActive
                      ? "bg-white/15 text-white font-medium"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              ← Site
            </Link>
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
