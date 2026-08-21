"use client";

import { useEffect } from "react";

/**
 * Admin error boundary, with one job the generic one does not do: recovering
 * from a deploy that happened while the page was open.
 *
 * Next.js fingerprints its chunks, so a tab holding the previous build asks for
 * filenames the new one does not have and dies with a ChunkLoadError. The fix
 * is always the same — fetch the new HTML — so it does that itself instead of
 * showing a dead end and hoping the reader knows to hard-refresh.
 *
 * Guarded by a session flag: if reloading does not fix it, the second failure
 * shows the error rather than looping.
 */
const RELOAD_FLAG = "admin-chunk-reload";

function isStaleBuild(error: Error): boolean {
  return (
    error.name === "ChunkLoadError" ||
    /Loading chunk|Failed to load chunk|dynamically imported module/i.test(
      error.message,
    )
  );
}

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const stale = isStaleBuild(error);

  useEffect(() => {
    if (!stale) {
      console.error("Admin error:", error);
      return;
    }
    // No state flip before reloading: the page is about to be replaced, and
    // setting state synchronously in an effect only costs a wasted render.
    if (sessionStorage.getItem(RELOAD_FLAG)) return;
    sessionStorage.setItem(RELOAD_FLAG, "1");
    window.location.reload();
  }, [error, stale]);

  // Clear the guard once a page renders normally again.
  useEffect(() => {
    return () => sessionStorage.removeItem(RELOAD_FLAG);
  }, []);

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center px-6">
      <div className="bg-background border border-border p-8 max-w-md w-full">
        <h1 className="font-serif text-xl font-medium text-foreground">
          {stale ? "Pagina e dintr-o versiune veche" : "Ceva n-a mers"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {stale
            ? "Site-ul a fost actualizat cât timp aveai pagina deschisă. Reîncarc-o și continuă de unde ai rămas."
            : "Pagina nu s-a putut încărca. Încearcă din nou; dacă se repetă, spune-mi ce făceai."}
        </p>

        {error.digest && (
          <p className="mt-3 text-xs text-muted-foreground font-mono">
            cod: {error.digest}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-foreground text-white text-sm font-semibold px-5 py-2.5 hover:bg-foreground/90 transition-colors"
          >
            Reîncarcă
          </button>
          {!stale && (
            <button
              type="button"
              onClick={reset}
              className="border border-border text-sm font-semibold px-5 py-2.5 hover:bg-muted transition-colors"
            >
              Încearcă din nou
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
