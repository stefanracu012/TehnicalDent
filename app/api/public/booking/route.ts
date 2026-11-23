import { NextResponse } from "next/server";
import { bookingOptions, createOnlineBooking } from "@/lib/online-booking";
import { checkRateLimit, sanitizeObject, validateNoInjection } from "@/lib/security";
import { LOCALES } from "@/lib/localize";

/**
 * Online booking, for the form on /contact.
 *
 * GET  ?locale=ro&serviceId=…  → services, doctors, and the free times of the
 *                                coming month. Only times: nothing about who
 *                                holds the others.
 * POST                         → books it. CSRF-checked in proxy.ts.
 */

const localeOf = (raw: string | null) => (LOCALES as readonly string[]).includes(raw ?? "") ? (raw as string) : "ro";

// The calendar is read from the database on every request; a form being
// filled in asks again each time the service changes. Held for a few seconds
// so a page open on many screens — or someone hammering it — does not reach
// the database each time. The booking itself re-checks everything.
const CACHE_MS = 15_000;
const cache = new Map<string, { at: number; body: unknown }>();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = localeOf(searchParams.get("locale"));
    const serviceId = (searchParams.get("serviceId") ?? "").slice(0, 40);

    const key = `${locale}|${serviceId}`;
    // Also held by the CDN for a few seconds, so repeated visits to /contact
    // do not each start a function. The booking itself re-checks everything.
    const headers = { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60" };
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) return NextResponse.json(hit.body, { headers });

    const body = await bookingOptions(locale, serviceId || undefined);
    cache.set(key, { at: Date.now(), body });
    if (cache.size > 100) cache.clear();
    return NextResponse.json(body, { headers });
  } catch (error) {
    console.error("booking options:", error);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Six attempts in a quarter of an hour: a person books once, maybe twice.
  const limited = checkRateLimit(request, { maxAttempts: 6, message: "Prea multe încercări. Încercați mai târziu sau sunați-ne." });
  if (limited) return limited;

  try {
    const raw = await request.json();
    if (!validateNoInjection(raw)) {
      return NextResponse.json({ ok: false, code: "invalid" }, { status: 400 });
    }
    const body = sanitizeObject(raw);

    // A field no person sees: filled in, it is a script. It is told it worked.
    if (body.company) return NextResponse.json({ ok: true }, { status: 201 });

    const result = await createOnlineBooking({
      serviceId: body.serviceId,
      doctorId: body.doctorId,
      date: body.date,
      time: body.time,
      name: body.name,
      phone: body.phone,
      email: body.email,
      note: body.note,
      locale: localeOf(typeof body.locale === "string" ? body.locale : null),
    });

    if (!result.ok) {
      // The calendar changed under whoever is looking at it.
      if (result.code === "slot_taken") cache.clear();
      return NextResponse.json({ ok: false, code: result.code }, { status: result.status });
    }

    cache.clear();
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("online booking:", error);
    return NextResponse.json({ ok: false, code: "server" }, { status: 500 });
  }
}
