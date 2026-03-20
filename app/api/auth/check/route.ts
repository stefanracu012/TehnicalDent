import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");

  if (!session?.value) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const decoded = Buffer.from(session.value, "base64").toString("utf-8");
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
