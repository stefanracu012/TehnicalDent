// =============================================
// Publishing a blog article to the clinic's own Facebook Page and Instagram
// account (Meta Content Publishing APIs).
//
// Both channels use the same Page Access Token as lib/messenger.ts, but need
// scopes that token was not minted with — `pages_manage_posts` for the Page and
// `instagram_content_publish` for Instagram. Run `npm run check-meta` to see
// which are present. Until they are, every function here reports itself as
// unconfigured and the blog save proceeds untouched.
//
// Publishing to accounts we own needs Standard Access only, so no App Review
// is involved.
// =============================================

import { put } from "@vercel/blob";
import prisma from "@/lib/prisma";
import { CLINIC } from "@/lib/seo";

const GRAPH = "https://graph.facebook.com/v21.0";

const PAGE_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "";
const PAGE_ID = process.env.FACEBOOK_PAGE_ID || "";
const IG_USER_ID = process.env.INSTAGRAM_USER_ID || "";
const BLOB_TOKEN = process.env.TEHNICAL_READ_WRITE_TOKEN || "";
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://tehnicaldent.com"
).replace(/\/$/, "");

/** Instagram truncates at 2200 characters; leave room for the closing lines. */
const IG_CAPTION_LIMIT = 2200;

export function isFacebookPublishConfigured(): boolean {
  return Boolean(PAGE_TOKEN && PAGE_ID);
}

export function isInstagramPublishConfigured(): boolean {
  return Boolean(PAGE_TOKEN && IG_USER_ID && BLOB_TOKEN);
}

export interface ShareablePost {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  tags?: string[];
  /** Platform-tuned copy from the drafting assistant; falls back to the excerpt. */
  facebookCaption?: string | null;
  instagramCaption?: string | null;
}

/**
 * Appended to every post rather than written per article, so the ask is
 * identical everywhere and one edit changes all future posts.
 *
 * Instagram deliberately points at WhatsApp instead of Direct: until Meta
 * grants Advanced Access for instagram_manage_messages, DMs from anyone
 * without a role on the app never reach the inbox, so inviting them would
 * send patients into silence.
 */
function facebookCta(): string {
  return [
    "———",
    `📅 Programează-te: ${SITE_URL}/ro/contact`,
    `💬 WhatsApp: https://wa.me/${CLINIC.telephone.replace("+", "")}`,
    `📍 ${CLINIC.streetAddress}, ${CLINIC.locality}`,
  ].join("\n");
}

function instagramCta(): string {
  return [
    "———",
    "📅 Programează-te — linkul e în bio",
    `💬 Scrie-ne pe WhatsApp: ${CLINIC.telephone}`,
    `📍 ${CLINIC.streetAddress}, ${CLINIC.locality}`,
  ].join("\n");
}

export interface ShareResult {
  facebookPostId: string | null;
  instagramPostId: string | null;
  errors: string[];
}

/** Public URL of the Romanian version of an article. */
export function articleUrl(slug: string): string {
  return `${SITE_URL}/ro/recomandari/${slug}`;
}

async function graphPost(
  path: string,
  params: Record<string, string>,
): Promise<Record<string, string>> {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...params, access_token: PAGE_TOKEN }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    const message = body?.error?.message || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return body;
}

// ── Facebook ────────────────────────────────────────────────────────────────

/**
 * Posts the article as a link share. Facebook builds the preview card from the
 * page's OpenGraph tags, so the post stays clickable and drives traffic back to
 * the site — which a photo post would not.
 */
export async function publishToFacebook(post: ShareablePost): Promise<string> {
  if (!isFacebookPublishConfigured()) {
    throw new Error(
      "Facebook publishing not configured (FACEBOOK_PAGE_ACCESS_TOKEN, FACEBOOK_PAGE_ID)",
    );
  }

  const body = await graphPost(`${PAGE_ID}/feed`, {
    message: [
      post.facebookCaption?.trim() || [post.title, post.excerpt].join("\n\n"),
      "",
      facebookCta(),
    ].join("\n"),
    link: articleUrl(post.slug),
  });

  return body.id;
}

// ── Instagram ───────────────────────────────────────────────────────────────

/**
 * Instagram only accepts JPEG, and rejects anything outside a 4:5–1.91:1 aspect
 * ratio. Cover images are uploaded as PNG/WebP/AVIF at arbitrary sizes, so they
 * are normalised to a padded 1080×1080 JPEG — always a valid ratio, and padding
 * rather than cropping keeps the whole image visible.
 *
 * Meta fetches the image itself, so the result has to live at a public URL.
 */
async function toInstagramImage(coverImage: string): Promise<string> {
  const source = coverImage.startsWith("http")
    ? coverImage
    : `${SITE_URL}${coverImage}`;

  if (/\.jpe?g($|\?)/i.test(source)) return source;

  const res = await fetch(source);
  if (!res.ok) {
    throw new Error(`could not read cover image (HTTP ${res.status})`);
  }

  // Imported lazily so a missing native binary cannot break the Facebook path.
  const sharp = (await import("sharp")).default;
  const jpeg = await sharp(Buffer.from(await res.arrayBuffer()))
    .resize(1080, 1080, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255 },
    })
    .jpeg({ quality: 88 })
    .toBuffer();

  const { url } = await put(`instagram/${Date.now()}.jpg`, jpeg, {
    access: "public",
    contentType: "image/jpeg",
    token: BLOB_TOKEN,
  });
  return url;
}

/**
 * Body, then the standing call to action, then hashtags. The article URL is
 * left out on purpose: Instagram shows it as dead text, and a long unclickable
 * link reads as spam. "Link în bio" carries it instead.
 */
function buildInstagramCaption(post: ShareablePost): string {
  const hashtags = (post.tags ?? [])
    .slice(0, 8)
    .map((t) => `#${t.replace(/[^\p{L}\p{N}]/gu, "")}`)
    .filter((t) => t.length > 1)
    .join(" ");

  const tail = ["", instagramCta(), hashtags].filter(Boolean).join("\n");

  // The tail is fixed, so the body is what gets trimmed to fit.
  const room = IG_CAPTION_LIMIT - tail.length - 2;
  let head =
    post.instagramCaption?.trim() ||
    [post.title, post.excerpt].filter(Boolean).join("\n\n");
  if (head.length > room) head = `${head.slice(0, room - 1).trimEnd()}…`;

  return `${head}\n${tail}`;
}

/**
 * Two calls, as the API requires: build a media container, then publish it.
 * Instagram allows 25 published posts per rolling 24 hours.
 */
export async function publishToInstagram(post: ShareablePost): Promise<string> {
  if (!isInstagramPublishConfigured()) {
    throw new Error(
      "Instagram publishing not configured (FACEBOOK_PAGE_ACCESS_TOKEN, INSTAGRAM_USER_ID, TEHNICAL_READ_WRITE_TOKEN)",
    );
  }
  if (!post.coverImage) {
    throw new Error("the article has no cover image, and Instagram requires one");
  }

  const imageUrl = await toInstagramImage(post.coverImage);

  const container = await graphPost(`${IG_USER_ID}/media`, {
    image_url: imageUrl,
    caption: buildInstagramCaption(post),
  });

  const published = await graphPost(`${IG_USER_ID}/media_publish`, {
    creation_id: container.id,
  });

  return published.id;
}

// ── Orchestration ───────────────────────────────────────────────────────────

/**
 * Publishes to whichever channels are configured. Never throws: a blog article
 * that saved correctly must not be rolled back because Meta was unreachable,
 * so failures come back as messages for the admin UI to show.
 *
 * Pass `skipFacebook` / `skipInstagram` for channels this article already went
 * out on, so re-saving it does not post twice.
 */
export async function shareBlogPost(
  post: ShareablePost,
  opts: { skipFacebook?: boolean; skipInstagram?: boolean } = {},
): Promise<ShareResult> {
  const result: ShareResult = {
    facebookPostId: null,
    instagramPostId: null,
    errors: [],
  };

  if (!opts.skipFacebook && isFacebookPublishConfigured()) {
    try {
      result.facebookPostId = await publishToFacebook(post);
    } catch (error) {
      result.errors.push(`Facebook: ${(error as Error).message}`);
    }
  }

  if (!opts.skipInstagram && isInstagramPublishConfigured()) {
    try {
      result.instagramPostId = await publishToInstagram(post);
    } catch (error) {
      result.errors.push(`Instagram: ${(error as Error).message}`);
    }
  }

  return result;
}

/**
 * Shares an article by id and records the outcome, doing nothing unless the
 * article is published and marked for sharing. Channels it has already gone out
 * on are skipped, so this is safe to call on every save.
 *
 * Returns null when there was nothing to do.
 */
export async function shareBlogPostById(id: string): Promise<ShareResult | null> {
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post?.isPublished || !post.shareToSocial) return null;

  const alreadyEverywhere =
    (post.facebookPostId || !isFacebookPublishConfigured()) &&
    (post.instagramPostId || !isInstagramPublishConfigured());
  if (alreadyEverywhere) return null;

  const result = await shareBlogPost(
    {
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      coverImage: post.coverImage,
      tags: post.tags,
      facebookCaption: post.facebookCaption,
      instagramCaption: post.instagramCaption,
    },
    {
      skipFacebook: Boolean(post.facebookPostId),
      skipInstagram: Boolean(post.instagramPostId),
    },
  );

  await prisma.blogPost.update({
    where: { id },
    data: {
      facebookPostId: result.facebookPostId ?? post.facebookPostId,
      instagramPostId: result.instagramPostId ?? post.instagramPostId,
      socialError: result.errors.length ? result.errors.join(" · ") : null,
    },
  });

  return result;
}
