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
  /** Whether the post invites the reader to the article. */
  linkToArticle?: boolean;
}

/**
 * Appended to every post rather than written per article, so the ask is
 * identical everywhere and one edit changes all future posts.
 *
 * Instagram deliberately points at WhatsApp instead of Direct: until Meta
 * grants Advanced Access for instagram_manage_messages, DMs from anyone
 * without a role on the app never reach the inbox, so inviting them would
 * send patients into silence.
 *
 * @param articleSlug article to send readers to, or null for a standalone post.
 */
function facebookCta(articleSlug: string | null): string {
  return [
    "———",
    // Photo posts carry no preview card, so the article link has to be spelled
    // out here. Facebook makes bare URLs in post text clickable.
    ...(articleSlug
      ? [`📖 Continuă să citești: ${articleUrl(articleSlug)}`]
      : []),
    `📅 Programează-te: ${SITE_URL}/ro/contact`,
    `💬 WhatsApp: https://wa.me/${CLINIC.telephone.replace("+", "")}`,
    `📍 ${CLINIC.streetAddress}, ${CLINIC.locality}`,
  ].join("\n");
}

/**
 * Instagram renders no clickable links, so exactly one line may point at the
 * bio — there is only one link up there, and two lines claiming it is where to
 * go tell the reader nothing. Whichever ask the post is really making gets it;
 * the other routes through WhatsApp, which is tappable from a caption.
 */
function instagramCta(articleSlug: string | null): string {
  return [
    "———",
    ...(articleSlug
      ? [
          "📖 Articolul complet — linkul e în bio",
          `💬 Programează-te pe WhatsApp: ${CLINIC.telephoneDisplay}`,
        ]
      : [
          "📅 Programează-te — linkul e în bio",
          `💬 Sau scrie-ne pe WhatsApp: ${CLINIC.telephoneDisplay}`,
        ]),
    `📍 ${CLINIC.streetAddress}, ${CLINIC.locality}`,
  ].join("\n");
}

/**
 * Drops Markdown emphasis from a caption.
 *
 * The site renders **bold**, so article text is allowed to use it — but neither
 * network does, and asterisks reach the reader as asterisks. Stripping here
 * rather than trusting the prompt means a slip never ships.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/(^|\s)\*([^*\n]+)\*(?=\s|$)/g, "$1$2")
    .replace(/(^|\n)#{1,6}\s+/g, "$1");
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

async function graphGet(
  path: string,
  params: Record<string, string>,
): Promise<Record<string, string>> {
  const url = new URL(`${GRAPH}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", PAGE_TOKEN);
  const res = await fetch(url);
  const body = await res.json();
  if (body.error) throw new Error(body.error.message);
  return body;
}

/**
 * Waits for an Instagram media container to finish processing.
 *
 * Meta downloads and transcodes the image after the container is created, and
 * publishing before that completes fails with "Media ID is not available" — a
 * race that only shows up once the image is large enough to take a moment.
 *
 * Polls for up to a minute, which is far longer than a photo needs.
 */
async function waitForContainer(containerId: string): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const { status_code: status } = await graphGet(containerId, {
      fields: "status_code",
    });
    if (status === "FINISHED") return;
    if (status === "ERROR" || status === "EXPIRED") {
      throw new Error(`Instagram could not process the image (${status})`);
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new Error("Instagram is still processing the image; try again shortly");
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
      stripMarkdown(
        post.facebookCaption?.trim() || [post.title, post.excerpt].join("\n\n"),
      ),
      "",
      facebookCta(post.linkToArticle === false ? null : post.slug),
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
/** Stripping here covers every Instagram path by construction. */
function buildCaption(raw: string, cta: string, tags: string[]): string {
  const body = stripMarkdown(raw);
  const hashtags = tags
    .slice(0, 8)
    .map((t) => `#${t.replace(/[^\p{L}\p{N}]/gu, "")}`)
    .filter((t) => t.length > 1)
    .join(" ");

  const tail = ["", cta, hashtags].filter(Boolean).join("\n");

  // The tail is fixed, so the body is what gets trimmed to fit.
  const room = IG_CAPTION_LIMIT - tail.length - 2;
  const head =
    body.length > room ? `${body.slice(0, room - 1).trimEnd()}…` : body;

  return `${head}\n${tail}`;
}

function buildInstagramCaption(post: ShareablePost): string {
  return buildCaption(
    post.instagramCaption?.trim() ||
      [post.title, post.excerpt].filter(Boolean).join("\n\n"),
    instagramCta(post.linkToArticle === false ? null : post.slug),
    post.tags ?? [],
  );
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

  await waitForContainer(container.id);
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

// ── Standalone social posts (no article behind them) ────────────────────────

/** Meta's ceiling for a carousel, and the reason the editor is capped at 10. */
const MAX_CAROUSEL = 10;

interface PublishableSocialPost {
  images: string[];
  facebookCaption: string;
  instagramCaption: string;
  tags: string[];
  articleSlug: string | null;
}

/**
 * Posts up to ten photos to the Page as one album.
 *
 * Each photo is uploaded unpublished first — that returns an id without putting
 * anything on the page — and the ids are then attached to a single feed post.
 * Uploading them published would scatter ten separate posts across the page.
 */
async function publishAlbumToFacebook(
  post: PublishableSocialPost,
): Promise<string> {
  const images = post.images.slice(0, MAX_CAROUSEL);
  const caption = [stripMarkdown(post.facebookCaption.trim()), "", facebookCta(post.articleSlug)]
    .join("\n")
    .trim();

  if (images.length === 1) {
    const body = await graphPost(`${PAGE_ID}/photos`, {
      url: await toSquareImage(images[0], 1440),
      caption,
    });
    return body.post_id || body.id;
  }

  const ids = await Promise.all(
    images.map(async (image) => {
      const body = await graphPost(`${PAGE_ID}/photos`, {
        url: await toSquareImage(image, 1440),
        published: "false",
      });
      return body.id;
    }),
  );

  const body = await graphPost(`${PAGE_ID}/feed`, {
    message: caption,
    attached_media: JSON.stringify(ids.map((id) => ({ media_fbid: id }))),
  });
  return body.id;
}

/**
 * Publishes one photo, or a carousel of up to ten.
 *
 * A carousel takes three rounds of calls: a container per image flagged as a
 * carousel item, a parent container listing those children, then the publish.
 * Instagram rejects a carousel of one, so a single image takes the plain path.
 */
async function publishCarouselToInstagram(
  post: PublishableSocialPost,
): Promise<string> {
  const images = post.images.slice(0, MAX_CAROUSEL);

  const caption = buildCaption(
    post.instagramCaption,
    instagramCta(post.articleSlug),
    post.tags,
  );

  let containerId: string;
  if (images.length === 1) {
    const container = await graphPost(`${IG_USER_ID}/media`, {
      image_url: await toSquareImage(images[0], 1080),
      caption,
    });
    containerId = container.id;
  } else {
    const children = await Promise.all(
      images.map(async (image) => {
        const child = await graphPost(`${IG_USER_ID}/media`, {
          image_url: await toSquareImage(image, 1080),
          is_carousel_item: "true",
        });
        // The parent rejects children Meta has not finished downloading yet.
        await waitForContainer(child.id);
        return child.id;
      }),
    );

    const parent = await graphPost(`${IG_USER_ID}/media`, {
      media_type: "CAROUSEL",
      children: children.join(","),
      caption,
    });
    containerId = parent.id;
  }

  await waitForContainer(containerId);
  const published = await graphPost(`${IG_USER_ID}/media_publish`, {
    creation_id: containerId,
  });
  return published.id;
}

/**
 * Publishes a social post to both networks and records the outcome. Mirrors
 * shareBlogPostById: never throws, and skips whatever already went out.
 */
export async function publishSocialPostById(
  id: string,
): Promise<ShareResult | null> {
  const post = await prisma.socialPost.findUnique({ where: { id } });
  if (!post?.isPublished || post.images.length === 0) return null;

  const payload: PublishableSocialPost = {
    images: post.images,
    facebookCaption: post.facebookCaption,
    instagramCaption: post.instagramCaption,
    tags: post.tags,
    articleSlug: post.articleSlug,
  };

  const result: ShareResult = {
    facebookPostId: null,
    instagramPostId: null,
    errors: [],
  };

  if (!post.facebookPostId && isFacebookPublishConfigured()) {
    try {
      result.facebookPostId = await publishAlbumToFacebook(payload);
    } catch (error) {
      result.errors.push(`Facebook: ${(error as Error).message}`);
    }
  }

  if (!post.instagramPostId && isInstagramPublishConfigured()) {
    try {
      result.instagramPostId = await publishCarouselToInstagram(payload);
    } catch (error) {
      result.errors.push(`Instagram: ${(error as Error).message}`);
    }
  }

  await prisma.socialPost.update({
    where: { id },
    data: {
      facebookPostId: result.facebookPostId ?? post.facebookPostId,
      instagramPostId: result.instagramPostId ?? post.instagramPostId,
      socialError: result.errors.length ? result.errors.join(" · ") : null,
    },
  });

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
      linkToArticle: post.linkToArticle,
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
