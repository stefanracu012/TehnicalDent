// =============================================
// Signed admin session tokens.
//
// Runs in both the Edge middleware and Node API routes, so this file uses
// only Web Crypto and must never import node:crypto or Prisma.
//
// Permissions travel inside the signed token, which lets the middleware
// authorise a request without a database round-trip. The cost is that
// permission changes take effect on the user's next login — acceptable, and
// the reason SESSION_MAX_AGE is kept short-ish.
// =============================================

import { grantsPermission } from "./permissions";

export const SESSION_COOKIE = "admin_session";
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // seconds

export interface SessionPayload {
  sub: string; // AdminUser id, or "owner" for the env-var account
  email: string;
  name: string;
  perms: string[];
  doctorId?: string; // TeamMember id when this account is a doctor
  exp: number; // unix seconds
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Typed over an explicit ArrayBuffer rather than the default ArrayBufferLike:
// WebCrypto's BufferSource rejects a Uint8Array that might be backed by a
// SharedArrayBuffer.
function b64urlDecode(value: string): Uint8Array<ArrayBuffer> {
  const bin = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function secretOrThrow(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");
  return secret;
}

export async function signSession(
  payload: Omit<SessionPayload, "exp">,
): Promise<string> {
  const full: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };
  const body = b64urlEncode(new TextEncoder().encode(JSON.stringify(full)));
  const key = await hmacKey(secretOrThrow());
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return `${body}.${b64urlEncode(new Uint8Array(sig))}`;
}

export async function verifySession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  try {
    const key = await hmacKey(secretOrThrow());
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlDecode(sig),
      new TextEncoder().encode(body),
    );
    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(b64urlDecode(body)),
    ) as SessionPayload;

    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;

    // Cookies issued before per-page permissions existed carry no perms array.
    // They verify fine, so without this check the holder stays "logged in"
    // with an empty permission set — every nav link filtered out and every
    // permission test throwing. Rejecting them sends the user back to login,
    // where a current session is issued.
    if (!Array.isArray(payload.perms)) return null;

    return payload;
  } catch {
    return null;
  }
}

export function hasPermission(
  session: SessionPayload | null,
  permission: string | null,
): boolean {
  if (!session) return false;
  return grantsPermission(session.perms, permission);
}
