"use client";

import { useState, useRef } from "react";
import { secureFetch } from "@/lib/csrf-client";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder: string;
  label?: string;
  className?: string;
}

export default function ImageUpload({
  value,
  onChange,
  folder,
  label = "Imagine",
  className = "",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [imgError, setImgError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const res = await secureFetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Eroare la încărcare");
        return;
      }

      const data = await res.json();
      setImgError(false);
      onChange(data.url);
    } catch {
      alert("Eroare la încărcarea imaginii");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-2">
          {label}
        </label>
      )}

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          dragOver
            ? "border-accent bg-accent/5"
            : "border-border hover:border-foreground/40"
        } ${value ? "p-2" : "p-8"}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={handleFileChange}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center py-4">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground mt-3">Se încarcă...</p>
          </div>
        ) : value && !imgError ? (
          <div className="relative group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Preview"
              className="w-full h-48 object-cover rounded-md"
              onError={() => setImgError(true)}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
                className="bg-white text-foreground text-xs font-semibold px-4 py-2 rounded-full hover:bg-white/90"
              >
                Schimbă
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                className="bg-red-600 text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-red-700"
              >
                Șterge
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <svg
              className="w-10 h-10 text-muted-foreground/40 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm font-medium text-muted-foreground">
              Click sau trage o imagine aici
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              JPG, PNG, WebP — max 10MB
            </p>
          </div>
        )}
      </div>

      {/* Manual URL input */}
      <div className="mt-2">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setImgError(false);
            onChange(e.target.value);
          }}
          placeholder="Sau introdu URL-ul imaginii manual..."
          className="w-full text-xs border border-border px-3 py-2 focus:border-foreground focus:outline-none text-muted-foreground"
        />
      </div>
    </div>
  );
}
