"use client";

import { useState } from "react";
import { secureFetch } from "@/lib/csrf-client";

interface AutoTranslateButtonProps {
  formData: Record<string, unknown>;
  translatableFields: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onTranslationsReady: (translations: any) => void;
}

export default function AutoTranslateButton({
  formData,
  translatableFields,
  onTranslationsReady,
}: AutoTranslateButtonProps) {
  const [translating, setTranslating] = useState(false);

  const handleTranslate = async () => {
    const fields: Record<string, string | string[]> = {};
    for (const field of translatableFields) {
      const value = formData[field];
      if (typeof value === "string" && value.trim()) {
        fields[field] = value;
      } else if (Array.isArray(value)) {
        const arr = value.filter((v) => typeof v === "string") as string[];
        if (arr.some((v) => v.trim())) fields[field] = arr;
      }
    }

    if (Object.keys(fields).length === 0) {
      alert("Completați mai întâi câmpurile în română!");
      return;
    }

    setTranslating(true);
    try {
      const res = await secureFetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      });

      if (!res.ok) throw new Error("Translation failed");

      const data = await res.json();
      onTranslationsReady(data.translations);
    } catch (error) {
      console.error("Translation error:", error);
      alert("Eroare la traducere automată. Încercați din nou.");
    } finally {
      setTranslating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleTranslate}
      disabled={translating}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm"
    >
      {translating ? (
        <>
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Se traduce...
        </>
      ) : (
        <>
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
            />
          </svg>
          Traducere automată
        </>
      )}
    </button>
  );
}
