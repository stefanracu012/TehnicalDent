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

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
      return NextResponse.json(
        { error: "Neautorizat. Vă rugăm autentificați-vă." },
        { status: 401 },
      );
    }
  }

  // For all other routes, use the intl middleware
  return intlMiddleware(request);
}

export const config = {
  matcher: "/((?!api/auth|trpc|_next|_vercel|.*\\..*).*)",
};
