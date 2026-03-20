import { ReactNode } from "react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Admin Navigation Bar */}
      <div className="fixed top-20 left-0 right-0 z-40 bg-foreground text-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex h-12 items-center justify-between">
            <div className="flex items-center gap-6">
              <Link
                href="/admin"
                className="text-sm font-medium hover:text-white/80 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/servicii"
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                Servicii
              </Link>
              <Link
                href="/admin/echipa"
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                Echipa
              </Link>
              <Link
                href="/admin/testimoniale"
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                Testimoniale
              </Link>
              <Link
                href="/admin/galerie"
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                Galerie
              </Link>
              <Link
                href="/admin/blog"
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                Blog
              </Link>
              <Link
                href="/admin/mesaje"
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                Mesaje
              </Link>
            </div>
            <Link
              href="/"
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              ← Înapoi la site
            </Link>
          </div>
        </div>
      </div>
      <div className="pt-12">{children}</div>
    </>
  );
}
