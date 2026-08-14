// Reads the signed session inside Node API routes / server components.
// The middleware already enforces access; this is for routes that need to
// know *who* is asking (e.g. a doctor editing only their own calendar).

import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE, type SessionPayload } from "@/lib/session";

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}
