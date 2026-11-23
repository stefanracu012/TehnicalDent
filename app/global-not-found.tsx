// The 404 for an address that matches no page at all: /ro/foo, /api/foo,
// scanners asking for /wp-login.php.
//
// The site's real root layout is app/[locale]/layout.tsx — a dynamic segment —
// so for these addresses there is no layout to wrap a not-found page in, and
// Next answered them with a 500 instead (an error and a failed function call
// for every bot that probed the site). This page is returned directly, without
// rendering the layouts, so it brings its own <html> and stays static: no
// translations, no data, one small page in the three languages most visitors
// read.
import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "404 — TehnicalDent",
  robots: { index: false },
};

export default function GlobalNotFound() {
  return (
    <html lang="ro">
      <body>
        <main className="min-h-screen flex items-center justify-center bg-muted px-6">
          <div className="text-center max-w-md">
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground mb-4">
              404
            </p>
            <h1 className="font-serif text-4xl font-medium tracking-tight text-foreground">
              Pagina nu a fost găsită
            </h1>
            <p className="mt-4 text-muted-foreground">
              Страница не найдена · Page not found
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-3">
              <Link
                href="/ro"
                className="inline-flex items-center justify-center bg-foreground px-6 py-3 text-sm font-medium text-white hover:bg-foreground/90"
              >
                TehnicalDent
              </Link>
              <Link
                href="/ro/contact"
                className="inline-flex items-center justify-center border border-border bg-background px-6 py-3 text-sm font-medium text-foreground hover:bg-muted"
              >
                Contact
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
