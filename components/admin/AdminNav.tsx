"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import LogoutButton from "@/components/admin/LogoutButton";

const navLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/programari", label: "Programări" },
  { href: "/admin/pacienti", label: "Pacienți" },
  { href: "/admin/servicii", label: "Servicii" },
  { href: "/admin/echipa", label: "Echipa" },
  { href: "/admin/testimoniale", label: "Testimoniale" },
  { href: "/admin/galerie", label: "Galerie" },
  { href: "/admin/blog", label: "Blog" },
  { href: "/admin/mesaje", label: "Mesaje" },
  { href: "/admin/setari", label: "Setări" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Hide nav on login page
  if (pathname === "/admin/login") {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 bg-foreground text-white shadow-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
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

          {/* Mobile: hamburger + logo */}
          <div className="flex md:hidden items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
              aria-label="Meniu"
            >
              <div className="w-5 h-4 relative flex flex-col justify-between">
                <span
                  className={`block h-[2px] w-full bg-white rounded-full transition-all duration-300 origin-center ${
                    mobileOpen ? "translate-y-[7px] rotate-45" : ""
                  }`}
                />
                <span
                  className={`block h-[2px] w-full bg-white rounded-full transition-all duration-200 ${
                    mobileOpen ? "opacity-0 scale-x-0" : ""
                  }`}
                />
                <span
                  className={`block h-[2px] w-full bg-white rounded-full transition-all duration-300 origin-center ${
                    mobileOpen ? "-translate-y-[7px] -rotate-45" : ""
                  }`}
                />
              </div>
            </button>
            <span className="text-sm font-semibold">Admin</span>
          </div>

          {/* Right side */}
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

      {/* Mobile dropdown */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileOpen ? "max-h-[400px] border-t border-white/10" : "max-h-0"
        }`}
      >
        <div className="px-4 py-3 space-y-1">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block text-sm px-3 py-2.5 rounded-md transition-colors ${
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
      </div>
    </div>
  );
}
