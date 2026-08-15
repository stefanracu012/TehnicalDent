// =============================================
// The owner account. Identified by the ADMIN_EMAIL env var rather than a
// database flag, so it can't be demoted, deactivated or deleted by editing
// rows — including by itself.
//
// Node-only (uses node:crypto): never import from the Edge proxy.
// =============================================

import { timingSafeEqual } from "crypto";

export function ownerEmail(): string | null {
  const value = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  return value || null;
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  const owner = ownerEmail();
  return Boolean(owner && email && email.toLowerCase().trim() === owner);
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * The env-var credential pair. It only ever creates the owner's row on first
 * login — once that row exists its stored password is the only one accepted,
 * so changing the password in the admin UI actually means something.
 */
export function ownerCredentialsMatch(email: string, password: string): boolean {
  const owner = ownerEmail();
  const ownerPassword = process.env.ADMIN_PASSWORD;
  if (!owner || !ownerPassword) return false;
  return (
    email.toLowerCase().trim() === owner && constantTimeEquals(password, ownerPassword)
  );
}
