import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = request.cookies.get("admin_session");

  if (!session?.value) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const decoded = atob(session.value);
    const [email, timestamp, secret] = decoded.split(":");

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminSecret = process.env.ADMIN_SESSION_SECRET || "fallback-secret";

    if (email !== adminEmail || secret !== adminSecret) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Check if token is not older than 7 days
    const tokenAge = Date.now() - parseInt(timestamp);
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (tokenAge > sevenDays) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true, email });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
