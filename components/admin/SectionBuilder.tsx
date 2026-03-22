"use client";

import ImageUpload from "./ImageUpload";

export interface BlogSection {
  id: string;
  title?: string;
  text?: string;
  imageUrl?: string;
  imageAlt?: string;
  youtubeUrl?: string;
}

export function createEmptySection(): BlogSection {
  return { id: Math.random().toString(36).substring(2, 10) };
}

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return match ? match[1] : null;
}

interface SectionBuilderProps {
  sections: BlogSection[];
  onChange: (sections: BlogSection[]) => void;
}

export default function SectionBuilder({
  sections,
  onChange,
}: SectionBuilderProps) {
  const addSection = () => {
    onChange([...sections, createEmptySection()]);
  };

  const removeSection = (id: string) => {
    if (sections.length <= 1) return;
    onChange(sections.filter((s) => s.id !== id));
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    const newSections = [...sections];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= newSections.length) return;
    [newSections[index], newSections[target]] = [
      newSections[target],
      newSections[index],
    ];
    onChange(newSections);
  };

  const updateSection = (id: string, updates: Partial<BlogSection>) => {
    onChange(sections.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">
        Secțiuni de conținut *
      </label>
      <p className="text-xs text-muted-foreground mb-4">
        Construiți articolul din secțiuni. Fiecare secțiune poate conține titlu,
        text, imagine sau video YouTube — toate opționale.
      </p>

      <div className="space-y-4">
        {sections.map((section, index) => {
          const ytId = section.youtubeUrl
            ? getYouTubeId(section.youtubeUrl)
            : null;

          return (
            <div
              key={section.id}
              className="border border-border rounded-lg overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/60 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-white text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    Secțiune
                  </span>
                  {/* Content indicators */}
                  <div className="flex items-center gap-1.5 ml-1">
                    {section.title && (
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                        Titlu
                      </span>
                    )}
                    {section.text && (
                      <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-medium">
                        Text
                      </span>
                    )}
                    {section.imageUrl && (
                      <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-medium">
                        Imagine
                      </span>
                    )}
                    {ytId && (
                      <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-medium">
                        Video
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveSection(index, "up")}
                    disabled={index === 0}
                    className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors"
                    title="Mută sus"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 15.75l7.5-7.5 7.5 7.5"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(index, "down")}
                    disabled={index === sections.length - 1}
                    className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors"
                    title="Mută jos"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSection(section.id)}
                    disabled={sections.length <= 1}
                    className="p-1.5 text-red-400 hover:text-red-600 disabled:opacity-25 transition-colors ml-1"
                    title="Șterge secțiunea"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Fields */}
              <div className="p-4 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Titlu secțiune
                  </label>
                  <input
                    type="text"
                    value={section.title || ""}
                    onChange={(e) =>
                      updateSection(section.id, {
                        title: e.target.value || undefined,
                      })
                    }
                    placeholder="Ex: De ce este important periajul corect?"
                    className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none"
                  />
                </div>

                {/* Text */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Text paragraf
                  </label>
                  <textarea
                    value={section.text || ""}
                    onChange={(e) =>
                      updateSection(section.id, {
                        text: e.target.value || undefined,
                      })
                    }
                    rows={4}
                    placeholder="Textul secțiunii..."
                    className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none resize-vertical"
                  />
                </div>

                {/* Image */}
                <ImageUpload
                  value={section.imageUrl || ""}
                  onChange={(url) =>
                    updateSection(section.id, {
                      imageUrl: url || undefined,
                    })
                  }
                  folder="blog"
                  label="Imagine"
                />
                {section.imageUrl && (
                  <input
                    type="text"
                    value={section.imageAlt || ""}
                    onChange={(e) =>
                      updateSection(section.id, {
                        imageAlt: e.target.value || undefined,
                      })
                    }
                    placeholder="Descriere imagine (alt text)"
                    className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none -mt-2"
                  />
                )}

                {/* YouTube */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Video YouTube
                  </label>
                  <input
                    type="url"
                    value={section.youtubeUrl || ""}
                    onChange={(e) =>
                      updateSection(section.id, {
                        youtubeUrl: e.target.value || undefined,
                      })
                    }
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none"
                  />
                  {ytId && (
                    <div className="mt-2 relative aspect-video rounded-lg overflow-hidden bg-black">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${ytId}`}
                        title={section.title || "YouTube video"}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add section button */}
      <button
        type="button"
        onClick={addSection}
        className="mt-4 w-full border-2 border-dashed border-border hover:border-foreground/40 rounded-lg py-3.5 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
        Adaugă secțiune
      </button>
    </div>
  );
}
