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
  // Blob storage included: the cover is re-rendered square before posting.
  return Boolean(PAGE_TOKEN && PAGE_ID && BLOB_TOKEN);
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
function facebookCta(slug: string): string {
  return [
    "———",
    // Photo posts carry no preview card, so the article link has to be spelled
    // out here. Facebook makes bare URLs in post text clickable.
    `📖 Articolul complet: ${articleUrl(slug)}`,
    `📅 Programează-te: ${SITE_URL}/ro/contact`,
    `💬 WhatsApp: https://wa.me/${CLINIC.telephone.replace("+", "")}`,
    `📍 ${CLINIC.streetAddress}, ${CLINIC.locality}`,
  ].join("\n");
}

function instagramCta(): string {
  return [
    "———",
    "📅 Programează-te — linkul e în bio",
    `💬 Scrie-ne pe WhatsApp: ${CLINIC.telephoneDisplay}`,
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
 * Posts the article as a square photo.
 *
 * A link share would be more clickable, but Facebook crops preview cards to
 * 1.91:1 and the covers are designed square — the crop cut the headline off the
 * top and the logo off the bottom. A photo post shows the image whole, matching
 * Instagram, and the links live in the caption instead.
 */
export async function publishToFacebook(post: ShareablePost): Promise<string> {
  if (!isFacebookPublishConfigured()) {
    throw new Error(
      "Facebook publishing not configured (FACEBOOK_PAGE_ACCESS_TOKEN, FACEBOOK_PAGE_ID)",
    );
  }
  if (!post.coverImage) {
    throw new Error("the article has no cover image to post");
  }

  const body = await graphPost(`${PAGE_ID}/photos`, {
    // Larger than Instagram's 1080 because Facebook renders photos bigger on
    // desktop and will downscale, never upscale.
    url: await toSquareImage(post.coverImage, 1440),
    caption: [
      post.facebookCaption?.trim() || [post.title, post.excerpt].join("\n\n"),
      "",
      facebookCta(post.slug),
    ].join("\n"),
  });

  // /photos returns the photo id plus the id of the post wrapping it; the post
  // id is what identifies the thing on the page.
  return body.post_id || body.id;
}

// ── Instagram ───────────────────────────────────────────────────────────────

/**
 * Normalises a cover to a square JPEG for both networks.
 *
 * Instagram accepts JPEG only and rejects anything outside 4:5–1.91:1, while
 * covers arrive as PNG/WebP/AVIF at whatever size the designer exported. Padding
 * rather than cropping means a cover that is not quite square still shows whole.
 *
 * Meta fetches the image itself, so the result has to live at a public URL.
 */
async function toSquareImage(coverImage: string, size: number): Promise<string> {
  const source = coverImage.startsWith("http")
    ? coverImage
    : `${SITE_URL}${coverImage}`;

  const res = await fetch(source);
  if (!res.ok) {
    throw new Error(`could not read cover image (HTTP ${res.status})`);
  }

  // Imported lazily so a missing native binary cannot break everything else.
  const sharp = (await import("sharp")).default;
  const jpeg = await sharp(Buffer.from(await res.arrayBuffer()))
    .resize(size, size, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255 },
    })
    .jpeg({ quality: 90 })
    .toBuffer();

  const { url } = await put(`social/${Date.now()}-${size}.jpg`, jpeg, {
    access: "public",
    contentType: "image/jpeg",
    token: BLOB_TOKEN,
  });
  return url;
}

/**
 * Renders a cover into the 1200x630 that link previews expect.
 *
 * Facebook crops whatever it is given to 1.91:1, which decapitates a square
 * cover — text at the top and a logo at the bottom simply disappear. So the
 * cover is contained at full height in the middle, and the gap on either side
 * is filled with a blurred, zoomed copy of the same image. Nothing is lost and
 * the result reads as deliberate rather than letterboxed.
 */
export async function toOpenGraphImage(coverImage: string): Promise<string> {
  if (!BLOB_TOKEN) throw new Error("blob storage is not configured");

  const source = coverImage.startsWith("http")
    ? coverImage
    : `${SITE_URL}${coverImage}`;
  const res = await fetch(source);
  if (!res.ok) {
    throw new Error(`could not read cover image (HTTP ${res.status})`);
  }
  const input = Buffer.from(await res.arrayBuffer());

  const sharp = (await import("sharp")).default;
  const [background, foreground] = await Promise.all([
    sharp(input).resize(1200, 630, { fit: "cover" }).blur(40).toBuffer(),
    sharp(input).resize(630, 630, { fit: "contain" }).toBuffer(),
  ]);

  const jpeg = await sharp(background)
    .composite([{ input: foreground, gravity: "center" }])
    .jpeg({ quality: 90 })
    .toBuffer();

  const { url } = await put(`og/${Date.now()}.jpg`, jpeg, {
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

  const imageUrl = await toSquareImage(post.coverImage, 1080);

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
 * Makes sure the article has a link-preview image matching its current cover.
 *
 * Runs on save rather than at share time because the OpenGraph tag has to be
 * right for anyone who pastes the URL into WhatsApp or a chat, not only for the
 * automatic posts. Cheap after the first call: it exits unless the cover changed.
 *
 * Never throws — a cover that cannot be rendered must not block saving an article.
 */
export async function ensureOgImage(id: string): Promise<void> {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { id },
      select: { coverImage: true, ogImage: true, ogImageFor: true },
    });
    if (!post?.coverImage) return;
    if (post.ogImage && post.ogImageFor === post.coverImage) return;

    const ogImage = await toOpenGraphImage(post.coverImage);
    await prisma.blogPost.update({
      where: { id },
      data: { ogImage, ogImageFor: post.coverImage },
    });
  } catch (error) {
    console.error("OpenGraph image generation failed:", error);
  }
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
