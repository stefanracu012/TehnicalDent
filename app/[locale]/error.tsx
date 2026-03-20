"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.27 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h2 className="font-serif text-2xl font-medium text-foreground mb-3">
          A apărut o eroare
        </h2>
        <p className="text-muted-foreground mb-6">
          Ne cerem scuze pentru inconveniență. Vă rugăm încercați din nou.
        </p>
        <button
          onClick={reset}
          className="bg-foreground text-white text-sm font-semibold px-6 py-3 rounded-sm hover:bg-foreground/90 transition-colors"
        >
          Încercați din nou
        </button>
      </div>
    </section>
  );
}
