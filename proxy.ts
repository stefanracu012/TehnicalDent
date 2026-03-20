import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

function isValidAdminSession(request: NextRequest): boolean {
  const session = request.cookies.get("admin_session");
  if (!session?.value) return false;

  try {
    const decoded = Buffer.from(session.value, "base64").toString("utf-8");
    const [email, timestamp, secret] = decoded.split(":");

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminSecret = process.env.ADMIN_SESSION_SECRET || "fallback-secret";

    if (email !== adminEmail || secret !== adminSecret) return false;

    // Check if token is not older than 7 days
    const tokenAge = Date.now() - parseInt(timestamp);
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (tokenAge > sevenDays) return false;

    return true;
  } catch {
    return false;
  }
}

function addSecurityHeaders(response: NextResponse): NextResponse {
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

// ---- Rate Limiting (in-memory, Edge-compatible) ----

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const loginRateLimit = new Map<string, RateLimitEntry>();

function checkLoginRateLimit(request: NextRequest): NextResponse | null {
  const forwarded =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const ip = forwarded.split(",")[0].trim();
  const key = `login:${ip}`;

  const now = Date.now();
  const maxAttempts = 5;
  const windowMs = 15 * 60 * 1000; // 15 minutes

  const entry = loginRateLimit.get(key);

  if (!entry || now > entry.resetAt) {
    loginRateLimit.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;

  if (entry.count > maxAttempts) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      {
        error: `Prea multe încercări de autentificare. Încercați din nou în ${Math.ceil(retryAfter / 60)} minute.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      },
    );
  }

  return null;
}

// ---- CSRF validation in middleware (for mutating requests) ----

function validateCsrf(request: NextRequest): boolean {
  const cookieToken = request.cookies.get("csrf_token")?.value;
  const headerToken = request.headers.get("x-csrf-token");

  if (!cookieToken || !headerToken) return false;
  return cookieToken === headerToken;
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Rate limit login attempts
  if (pathname === "/api/auth/login" && method === "POST") {
    const rateLimitResponse = checkLoginRateLimit(request);
    if (rateLimitResponse) {
      return addSecurityHeaders(rateLimitResponse);
    }
  }

  // Protect /admin routes (except /admin/login)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!isValidAdminSession(request)) {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect /api/admin routes
  if (pathname.startsWith("/api/admin")) {
    if (!isValidAdminSession(request)) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: "Neautorizat. Vă rugăm autentificați-vă." },
          { status: 401 },
        ),
      );
    }

    // CSRF check on mutating requests to /api/admin
    if (["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
      if (!validateCsrf(request)) {
        return addSecurityHeaders(
          NextResponse.json(
            { error: "Token CSRF invalid. Reîncărcați pagina." },
            { status: 403 },
          ),
        );
      }
    }
  }

  // CSRF check on public POST endpoints (/api/contact, /api/auth/login)
  if (
    (pathname === "/api/contact" || pathname === "/api/auth/login") &&
    method === "POST"
  ) {
    if (!validateCsrf(request)) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: "Token CSRF invalid. Reîncărcați pagina." },
          { status: 403 },
        ),
      );
    }
  }

  // For all other routes, use the intl middleware and add security headers
  const response = intlMiddleware(request);
  return addSecurityHeaders(response as NextResponse);
}

export const config = {
  matcher: "/((?!api/auth/csrf|trpc|_next|_vercel|.*\\..*).*)",
};
