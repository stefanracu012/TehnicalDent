"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Button from "./Button";
import { secureFetch } from "@/lib/csrf-client";

interface Options {
  services: { id: string; title: string; duration: number }[];
  doctors: { id: string; name: string; role: string }[];
  /** date → doctor id → start times in minutes since midnight */
  days: Record<string, Record<string, number[]>>;
}

interface Booked {
  when: string;
  doctor: string;
  service: string;
}

const FIELD =
  "mt-2 block w-full border border-border bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground";
const LABEL = "block text-sm font-medium text-foreground";

const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

const KNOWN_ERRORS = ["invalid", "invalid_phone", "invalid_email", "slot_taken", "already_booked", "too_many"];

/**
 * Online booking: service, doctor, a free time from the doctors' calendars,
 * and the visitor's name and phone. What is offered comes from
 * /api/public/booking; the server checks it all again on booking.
 */
export default function BookingForm({
  defaultService,
  onNoHours,
}: {
  defaultService?: string;
  /** Switches to the message form when nothing is free. */
  onNoHours?: () => void;
}) {
  const t = useTranslations("Booking");
  const locale = useLocale();

  const [options, setOptions] = useState<Options | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [doctorId, setDoctorId] = useState("any");
  const [date, setDate] = useState("");
  const [time, setTime] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", note: "", company: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState("");
  const [booked, setBooked] = useState<Booked | null>(null);

  const load = useCallback(
    async (forService: string) => {
      try {
        const res = await fetch(`/api/public/booking?locale=${locale}&serviceId=${forService}`);
        if (!res.ok) throw new Error();
        const data: Options = await res.json();
        setOptions(data);
        setLoadFailed(false);
        return data;
      } catch {
        setLoadFailed(true);
        return null;
      }
    },
    [locale],
  );

  // First load: no service yet, so the page can show the list; then the
  // service picked (the one asked for in the link, or the first) decides the
  // length of the times offered.
  useEffect(() => {
    let alive = true;
    (async () => {
      const first = await load("");
      if (!alive || !first) return;
      const wanted = (defaultService ?? "").trim().toLowerCase();
      // The one in the link, else a consultation — what most people book, and
      // what the old form started on — else the first.
      const match =
        first.services.find((s) => wanted && s.title.toLowerCase() === wanted) ??
        first.services.find((s) => /consult|консультац|consulta/i.test(s.title)) ??
        first.services[0];
      if (match) setServiceId(match.id);
    })();
    return () => {
      alive = false;
    };
  }, [load, defaultService]);

  useEffect(() => {
    if (serviceId) load(serviceId);
  }, [serviceId, load]);

  const doctorsWithTimes = useMemo(() => {
    if (!options) return [];
    const have = new Set<string>();
    for (const perDoctor of Object.values(options.days)) for (const id of Object.keys(perDoctor)) have.add(id);
    return options.doctors.filter((d) => have.has(d.id));
  }, [options]);

  /** Days the chosen doctor (or any) has something free. */
  const dates = useMemo(() => {
    if (!options) return [];
    return Object.keys(options.days)
      .filter((d) => (doctorId === "any" ? true : Boolean(options.days[d][doctorId])))
      .sort();
  }, [options, doctorId]);

  const times = useMemo(() => {
    if (!options || !date) return [];
    const perDoctor = options.days[date] ?? {};
    const lists = doctorId === "any" ? Object.values(perDoctor) : [perDoctor[doctorId] ?? []];
    return [...new Set(lists.flat())].sort((a, b) => a - b);
  }, [options, date, doctorId]);

  // What was picked may no longer be offered after the doctor, the service or
  // the calendar changed.
  useEffect(() => {
    if (date && !dates.includes(date)) {
      setDate("");
      setTime(null);
    } else if (time !== null && !times.includes(time)) {
      setTime(null);
    }
  }, [dates, times, date, time]);

  const dayLabel = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!date || time === null) {
      setError(t("alegeOraMesaj"));
      return;
    }
    setStatus("loading");
    try {
      const res = await secureFetch("/api/public/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          doctorId,
          date,
          time,
          name: form.name,
          phone: form.phone,
          email: form.email,
          note: form.note,
          company: form.company,
          locale,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok !== false) {
        setBooked({ when: data.when, doctor: data.doctor, service: data.service });
        setStatus("done");
        return;
      }
      setStatus("idle");
      setError(
        res.status === 429 ? t("rate") : KNOWN_ERRORS.includes(data.code) ? t(data.code) : t("eroare"),
      );
      // Someone else took it: look at the calendar again.
      if (data.code === "slot_taken") {
        setTime(null);
        load(serviceId);
      }
    } catch {
      setStatus("idle");
      setError(t("eroare"));
    }
  };

  if (status === "done" && booked) {
    const when = new Date(booked.when).toLocaleString(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Chisinau",
    });
    return (
      <div className="bg-muted p-8 text-center">
        <h3 className="font-serif text-xl font-medium text-foreground">{t("multumim")}</h3>
        <p className="mt-3 font-medium text-foreground">
          {t("detalii", { service: booked.service, when, doctor: booked.doctor })}
        </p>
        <p className="mt-3 text-muted-foreground">{t("vaiConfirmare")}</p>
        <Button
          onClick={() => {
            setStatus("idle");
            setBooked(null);
            setTime(null);
            setDate("");
            setForm({ name: "", phone: "", email: "", note: "", company: "" });
            load(serviceId);
          }}
          variant="outline"
          className="mt-6"
        >
          {t("altaProgramare")}
        </Button>
      </div>
    );
  }

  if (loadFailed) {
    return <p className="text-sm text-red-600">{t("eroare")}</p>;
  }
  if (!options) {
    return <p className="text-muted-foreground">{t("seIncarca")}</p>;
  }

  const nothingFree = dates.length === 0 && Object.keys(options.days).length === 0;

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <label htmlFor="b-service" className={LABEL}>
          {t("serviciu")}
        </label>
        <select
          id="b-service"
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className={FIELD}
        >
          {options.services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>

      {nothingFree ? (
        <div className="bg-muted p-6">
          <p className="text-sm text-muted-foreground">{t("nuSuntOre")}</p>
          {onNoHours && (
            <Button type="button" variant="outline" className="mt-4" onClick={onNoHours}>
              {t("trimiteMesaj")}
            </Button>
          )}
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="b-doctor" className={LABEL}>
              {t("medic")}
            </label>
            <select id="b-doctor" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className={FIELD}>
              <option value="any">{t("oriceMedic")}</option>
              {doctorsWithTimes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.role ? ` — ${d.role}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className={LABEL}>{t("ziua")}</p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-2" role="group" aria-label={t("alegeZiua")}>
              {dates.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDate(d);
                    setTime(null);
                  }}
                  aria-pressed={date === d}
                  className={`shrink-0 border px-4 py-2.5 text-sm transition-colors ${
                    date === d
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-foreground hover:border-foreground/50"
                  }`}
                >
                  {dayLabel(d)}
                </button>
              ))}
            </div>
          </div>

          {date && (
            <div>
              <p className={LABEL}>{t("ora")}</p>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={t("alegeOra")}>
                {times.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTime(m)}
                    aria-pressed={time === m}
                    className={`border px-4 py-2.5 text-sm tabular-nums transition-colors ${
                      time === m
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-foreground hover:border-foreground/50"
                    }`}
                  >
                    {clock(m)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="b-name" className={LABEL}>
              {t("nume")}
            </label>
            <input
              id="b-name"
              type="text"
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={FIELD}
              placeholder={t("numePlaceholder")}
            />
          </div>

          <div>
            <label htmlFor="b-phone" className={LABEL}>
              {t("telefon")}
            </label>
            <input
              id="b-phone"
              type="tel"
              required
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={FIELD}
              placeholder={t("telefonPlaceholder")}
            />
          </div>

          <div>
            <label htmlFor="b-email" className={LABEL}>
              {t("email")}
            </label>
            <input
              id="b-email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={FIELD}
            />
          </div>

          <div>
            <label htmlFor="b-note" className={LABEL}>
              {t("nota")}
            </label>
            <textarea
              id="b-note"
              rows={3}
              maxLength={500}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className={`${FIELD} resize-none`}
              placeholder={t("notaPlaceholder")}
            />
          </div>

          {/* A field no person sees. A script fills it in, and is ignored. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label htmlFor="b-company">Company</label>
            <input
              id="b-company"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={status === "loading" || !serviceId} className="w-full">
            {status === "loading" ? t("seRezerva") : t("rezerva")}
          </Button>
          <p className="text-xs text-muted-foreground">{t("wa")}</p>
        </>
      )}
    </form>
  );
}
