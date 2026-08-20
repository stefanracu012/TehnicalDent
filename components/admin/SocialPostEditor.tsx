"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { secureFetch } from "@/lib/csrf-client";
import MultiImageUpload from "./MultiImageUpload";
import SocialAiPanel, { type SocialPostDraft } from "./SocialAiPanel";

interface SocialPostEditorProps {
  /** Omitted when creating. */
  postId?: string;
}

interface Form {
  title: string;
  images: string[];
  facebookCaption: string;
  instagramCaption: string;
  tags: string;
  articleSlug: string;
  isPublished: boolean;
}

const EMPTY: Form = {
  title: "",
  images: [],
  facebookCaption: "",
  instagramCaption: "",
  tags: "",
  articleSlug: "",
  isPublished: false,
};

/**
 * Editor for a post that exists only on Facebook and Instagram.
 *
 * Serves both creating and editing, because the two differ only in where the
 * form is saved — everything the editor sees and does is identical.
 */
export default function SocialPostEditor({ postId }: SocialPostEditorProps) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(Boolean(postId));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    facebookPostId: string | null;
    instagramPostId: string | null;
    socialError: string | null;
  }>({ facebookPostId: null, instagramPostId: null, socialError: null });

  useEffect(() => {
    if (!postId) return;
    (async () => {
      try {
        const res = await secureFetch(`/api/admin/blog/posts/${postId}`);
        if (!res.ok) {
          alert("Postarea nu a fost găsită");
          router.push("/admin/blog");
          return;
        }
        const post = await res.json();
        setForm({
          title: post.title ?? "",
          images: post.images ?? [],
          facebookCaption: post.facebookCaption ?? "",
          instagramCaption: post.instagramCaption ?? "",
          tags: (post.tags ?? []).join(", "),
          articleSlug: post.articleSlug ?? "",
          isPublished: post.isPublished ?? false,
        });
        setStatus({
          facebookPostId: post.facebookPostId ?? null,
          instagramPostId: post.instagramPostId ?? null,
          socialError: post.socialError ?? null,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [postId, router]);

  const applyDraft = (draft: SocialPostDraft) =>
    setForm((p) => ({
      ...p,
      title: draft.title,
      facebookCaption: draft.facebookCaption,
      instagramCaption: draft.instagramCaption,
      tags: draft.tags.join(", "),
    }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.images.length === 0) {
      alert("Adăugați cel puțin o imagine.");
      return;
    }
    if (!form.facebookCaption.trim() && !form.instagramCaption.trim()) {
      alert("Scrieți textul pentru cel puțin o rețea.");
      return;
    }

    setSaving(true);
    try {
      const res = await secureFetch(
        postId ? `/api/admin/blog/posts/${postId}` : "/api/admin/blog/posts",
        {
          method: postId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            tags: form.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
            articleSlug: form.articleSlug.trim() || null,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Eroare la salvare");
        return;
      }
      if (data.social?.errors?.length) {
        alert(`Salvat, dar publicarea a eșuat:\n${data.social.errors.join("\n")}`);
      }
      router.push("/admin/blog");
    } catch {
      alert("Eroare la salvare");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Se încarcă…</p>
      </div>
    );
  }

  const field = (key: keyof Form) => ({
    value: form[key] as string,
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => setForm((p) => ({ ...p, [key]: e.target.value })),
    className:
      "w-full border border-border px-4 py-3 focus:border-foreground focus:outline-none",
  });

  const alreadyOut = Boolean(status.facebookPostId || status.instagramPostId);

  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="mb-6 sm:mb-8">
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground">
            {postId ? "Editează postarea" : "Postare nouă"}
          </h1>
          <p className="mt-1 sm:mt-2 text-sm text-muted-foreground">
            Se publică pe Facebook și Instagram. Nu creează pagină pe site.
          </p>
        </div>

        <div className="bg-background border border-border p-4 sm:p-8 space-y-6">
          <SocialAiPanel onDraft={applyDraft} slideCount={form.images.length || 1} />

          <form onSubmit={submit} className="space-y-6">
            <MultiImageUpload
              value={form.images}
              onChange={(images) => setForm((p) => ({ ...p, images }))}
            />

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Etichetă internă
              </label>
              <input
                type="text"
                placeholder="Cum o recunoști în listă"
                {...field("title")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Text pentru Facebook
              </label>
              <textarea rows={6} {...field("facebookCaption")} />
              <p className="mt-1 text-xs text-muted-foreground">
                Programarea, WhatsApp-ul și adresa se adaugă automat la final.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Text pentru Instagram
              </label>
              <textarea rows={6} {...field("instagramCaption")} />
              <p className="mt-1 text-xs text-muted-foreground">
                Prima propoziție e singura vizibilă fără „mai mult”.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Etichete
              </label>
              <input
                type="text"
                placeholder="albire, estetica, sfaturi"
                {...field("tags")}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Devin hashtag-uri pe Instagram.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Trimite către un articol{" "}
                <span className="text-muted-foreground">(opțional)</span>
              </label>
              <input
                type="text"
                placeholder="mentine-ti-zambetul-alb-dupa-tratamente-dentare"
                {...field("articleSlug")}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Slug-ul unui articol existent. Lasă gol dacă postarea se susține
                singură.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="isPublished"
                checked={form.isPublished}
                onChange={(e) =>
                  setForm((p) => ({ ...p, isPublished: e.target.checked }))
                }
                className="w-4 h-4 mt-0.5"
              />
              <label htmlFor="isPublished" className="text-sm text-foreground">
                Publică pe Facebook și Instagram
                <span className="block text-xs text-foreground/50 mt-0.5">
                  Se trimite o singură dată. Editările ulterioare nu repostează.
                </span>
              </label>
            </div>

            {(alreadyOut || status.socialError) && (
              <div className="border border-border bg-muted/40 px-4 py-3 text-xs space-y-1">
                {status.facebookPostId && (
                  <p className="text-foreground/70">✓ Publicat pe Facebook</p>
                )}
                {status.instagramPostId && (
                  <p className="text-foreground/70">✓ Publicat pe Instagram</p>
                )}
                {status.socialError && (
                  <p className="text-red-600">Nereușit: {status.socialError}</p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-4 pt-6 border-t border-border">
              <button
                type="button"
                onClick={() => router.push("/admin/blog")}
                className="px-6 py-3 text-sm font-semibold border border-border hover:bg-muted transition-colors"
              >
                Anulează
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-foreground text-white px-6 py-3 text-sm font-semibold hover:bg-foreground/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Se salvează…" : postId ? "Actualizează" : "Creează"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
