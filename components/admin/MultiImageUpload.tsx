"use client";

import { useRef, useState } from "react";
import { secureFetch } from "@/lib/csrf-client";

interface MultiImageUploadProps {
  value: string[];
  onChange: (images: string[]) => void;
  /** Meta caps carousels at 10. */
  max?: number;
}

/**
 * Ordered set of images for a carousel post.
 *
 * Order matters and is not cosmetic: the first image is the one that shows in
 * the feed and decides whether anyone swipes at all. Each is previewed square,
 * which is how both networks will render it.
 */
export default function MultiImageUpload({
  value,
  onChange,
  max = 10,
}: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const room = max - value.length;

  const upload = async (files: FileList) => {
    setError(null);
    setUploading(true);
    try {
      const picked = Array.from(files).slice(0, room);
      const urls: string[] = [];
      for (const file of picked) {
        const form = new FormData();
        form.append("file", file);
        form.append("folder", "social");
        const res = await secureFetch("/api/admin/upload", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Eroare la încărcare");
        urls.push(data.url);
      }
      onChange([...value, ...urls]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div>
      <label className="flex items-baseline justify-between text-sm font-medium text-foreground mb-2">
        <span>Imagini</span>
        <span className="text-xs text-muted-foreground">
          {value.length}/{max}
        </span>
      </label>

      {value.length > 0 && (
        <ul className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-3">
          {value.map((url, i) => (
            <li key={url} className="relative group">
              <div className="aspect-square bg-white border border-border overflow-hidden flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Imaginea ${i + 1}`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              {i === 0 && (
                <span className="absolute top-1 left-1 bg-foreground text-background text-[10px] font-semibold px-1.5 py-0.5">
                  Prima
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => move(i, i - 1)}
                  disabled={i === 0}
                  aria-label="Mută la stânga"
                  className="px-2 py-1 text-white text-xs disabled:opacity-30"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                  aria-label="Șterge"
                  className="px-2 py-1 text-white text-xs hover:text-red-400"
                >
                  ✕
                </button>
                <button
                  type="button"
                  onClick={() => move(i, i + 1)}
                  disabled={i === value.length - 1}
                  aria-label="Mută la dreapta"
                  className="px-2 py-1 text-white text-xs disabled:opacity-30"
                >
                  →
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={(e) => e.target.files?.length && upload(e.target.files)}
        className="hidden"
      />
      <button
        type="button"
        disabled={uploading || room <= 0}
        onClick={() => inputRef.current?.click()}
        className="w-full border-2 border-dashed border-border hover:border-foreground/40 py-4 text-sm text-muted-foreground transition-colors disabled:opacity-50"
      >
        {uploading
          ? "Se încarcă…"
          : room <= 0
            ? `Ai atins limita de ${max} imagini`
            : `+ Adaugă imagini (încă ${room})`}
      </button>

      <p className="mt-1.5 text-xs text-muted-foreground">
        Prima imagine apare în feed și decide dacă cineva derulează mai departe.
        Toate se publică pătrate, cu fundal alb dacă nu sunt deja.
      </p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
