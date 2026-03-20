// =============================================
// Security utilities for TechnicalDent
// CSRF, XSS sanitization, input validation,
// rate limiting
// =============================================

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// ---- CSRF Token Management ----

const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";

export async function generateCsrfToken(): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
  return token;
}

export async function validateCsrfToken(request: Request): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get(CSRF_HEADER);

  if (!cookieToken || !headerToken) return false;

  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(headerToken),
    );
  } catch {
    return false;
  }
}

// ---- XSS / Input Sanitization ----

/**
 * Strips dangerous HTML/script tags from a string.
 * Allows basic text — no HTML whatsoever.
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") return "";

  return (
    input
      // Remove script tags and content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      // Remove on* event handlers
      .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, "")
      // Remove javascript: protocol
      .replace(/javascript\s*:/gi, "")
      // Remove data: protocol in URLs (potential XSS)
      .replace(/data\s*:[^,]*base64/gi, "")
      // Strip all HTML tags
      .replace(/<[^>]*>/g, "")
      // Remove null bytes
      .replace(/\0/g, "")
      .trim()
  );
}

/**
 * Sanitize a string but allow markdown content (for blog posts).
 * Strips actual HTML/script but keeps markdown syntax.
 */
export function sanitizeMarkdown(input: string): string {
  if (typeof input !== "string") return "";

  return (
    input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, "")
      .replace(/javascript\s*:/gi, "")
      .replace(/\0/g, "")
      .trim()
  );
}

/**
 * Sanitize an object recursively — all string values get sanitized.
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  markdownFields: string[] = [],
): T {
  const sanitized = { ...obj };
  for (const key in sanitized) {
    const value = sanitized[key];
    if (typeof value === "string") {
      (sanitized as Record<string, unknown>)[key] = markdownFields.includes(key)
        ? sanitizeMarkdown(value)
        : sanitizeString(value);
    } else if (Array.isArray(value)) {
      (sanitized as Record<string, unknown>)[key] = value.map((item) =>
        typeof item === "string" ? sanitizeString(item) : item,
      );
    } else if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      // Recurse into nested objects (e.g. translations JSON)
      (sanitized as Record<string, unknown>)[key] = sanitizeObject(
        value as Record<string, unknown>,
        markdownFields,
      );
    }
  }
  return sanitized;
}

// ---- NoSQL Injection Protection ----

/**
 * Validates that a value doesn't contain MongoDB operators
 * (prevents NoSQL injection via $gt, $ne, $regex, etc.)
 */
export function isSafeMongoInput(value: unknown): boolean {
  if (typeof value === "string") {
    // Block MongoDB operators in strings
    if (/^\$/.test(value)) return false;
    return true;
  }
  if (typeof value === "object" && value !== null) {
    // Block objects with $ keys (operator injection)
    for (const key of Object.keys(value as Record<string, unknown>)) {
      if (key.startsWith("$")) return false;
      if (
        !isSafeMongoInput((value as Record<string, unknown>)[key])
      )
        return false;
    }
  }
  return true;
}

/**
 * Validates all fields of an object for NoSQL injection
 */
export function validateNoInjection(body: Record<string, unknown>): boolean {
  for (const key of Object.keys(body)) {
    if (key.startsWith("$")) return false;
    if (!isSafeMongoInput(body[key])) return false;
  }
  return true;
}

// ---- Rate Limiting (in-memory) ----

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 60_000); // Cleanup every minute

/**
 * Rate limit by IP address.
 * @returns null if allowed, or a NextResponse if rate-limited
 */
export function checkRateLimit(
  request: NextRequest | Request,
  {
    maxAttempts = 5,
    windowMs = 15 * 60 * 1000, // 15 minutes
    message = "Prea multe încercări. Vă rugăm așteptați.",
  } = {},
): NextResponse | null {
  const forwarded =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const ip = forwarded.split(",")[0].trim();
  const key = `ratelimit:${ip}`;

  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;

  if (entry.count > maxAttempts) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: message },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
        },
      },
    );
  }

  return null;
}

// ---- Security Headers ----

export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: http:",
    "connect-src 'self' https: wss:",
    "frame-src 'self' https://www.google.com https://maps.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self)",
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );

  return response;
}
