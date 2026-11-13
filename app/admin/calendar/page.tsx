"use client";

import { useState, useEffect, useCallback } from "react";
import { secureFetch } from "@/lib/csrf-client";

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 8:00 – 23:00
const DAY_NAMES = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];

interface TeamMember {
  id: string;
  name: string;
  role: string;
  isDoctor?: boolean | null;
}

interface Availability {
  teamMemberId: string;
  date: string;
  hours: number[];
  /** Custom start times as minutes since midnight: 11:15 is 675. */
  times?: number[];
}

/** What a day holds: ticked whole hours, and custom times such as 11:15. */
interface Day {
  hours: number[];
  times: number[];
}

const NONE: Day = { hours: [], times: [] };

/** 675 → "11:15". */
function clock(minutes: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** "YYYY-MM-DD" for a date, in Moldova time. */
function dateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Chisinau" }).format(d);
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Monday of the week containing `d`. */
function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const dow = copy.getDay();
  copy.setDate(copy.getDate() - (dow === 0 ? 6 : dow - 1));
  return copy;
}

export default function AdminCalendarPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [lockedToDoctor, setLockedToDoctor] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [availability, setAvailability] = useState<Record<string, Day>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The time typed in each day's "add a time" field.
  const [typed, setTyped] = useState<Record<string, string>>({});

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const from = dateKey(days[0]);
  const to = dateKey(days[6]);

  useEffect(() => {
    (async () => {
      try {
        const [meRes, teamRes] = await Promise.all([
          fetch("/api/auth/check"),
          secureFetch("/api/admin/team"),
        ]);
        const me = await meRes.json();
        const teamData = await teamRes.json();
        // Only people who see patients have a calendar — not the dental technician.
        const list: TeamMember[] = (Array.isArray(teamData) ? teamData : []).filter(
          (m: TeamMember) => m.isDoctor !== false,
        );
        setTeam(list);

        if (me.doctorId) {
          setDoctorId(me.doctorId);
          setLockedToDoctor(true);
        } else if (list.length > 0) {
          setDoctorId(list[0].id);
        }
      } catch (err) {
        console.error("Error loading calendar context:", err);
      }
    })();
  }, []);

  const fetchAvailability = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    try {
      const res = await secureFetch(
        `/api/admin/availability?from=${from}&to=${to}&teamMemberId=${doctorId}`,
      );
      const rows: Availability[] = await res.json();
      const map: Record<string, Day> = {};
      for (const row of Array.isArray(rows) ? rows : []) {
        map[row.date] = { hours: row.hours ?? [], times: row.times ?? [] };
      }
      setAvailability(map);
    } catch (err) {
      console.error("Error fetching availability:", err);
    } finally {
      setLoading(false);
    }
  }, [doctorId, from, to]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const persist = async (date: string, next: Day) => {
    setSaving(date);
    setError(null);
    const previous = availability[date] ?? NONE;
    setAvailability((a) => ({ ...a, [date]: next }));

    try {
      const res = await secureFetch("/api/admin/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamMemberId: doctorId, date, hours: next.hours, times: next.times }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Salvarea a eșuat.");
      }
    } catch (err) {
      setAvailability((a) => ({ ...a, [date]: previous }));
      setError(err instanceof Error ? err.message : "Eroare necunoscută.");
    } finally {
      setSaving(null);
    }
  };

  const toggleHour = (date: string, hour: number) => {
    const current = availability[date] ?? NONE;
    const hours = current.hours.includes(hour)
      ? current.hours.filter((h) => h !== hour)
      : [...current.hours, hour].sort((a, b) => a - b);
    persist(date, { ...current, hours });
  };

  /** Adds a custom start time, "11:15". A whole hour is the same as ticking it. */
  const addTime = (date: string) => {
    const value = typed[date] ?? "";
    const m = value.match(/^(\d{2}):(\d{2})$/);
    if (!m) return;
    const minutes = Number(m[1]) * 60 + Number(m[2]);
    if (minutes < HOURS[0] * 60 || minutes >= (HOURS[HOURS.length - 1] + 1) * 60) {
      setError(`Alegeți o oră între ${clock(HOURS[0] * 60)} și ${clock((HOURS[HOURS.length - 1] + 1) * 60 - 1)}.`);
      return;
    }
    const current = availability[date] ?? NONE;
    setTyped((t) => ({ ...t, [date]: "" }));
    if (minutes % 60 === 0) {
      const hour = minutes / 60;
      if (!current.hours.includes(hour)) {
        persist(date, { ...current, hours: [...current.hours, hour].sort((a, b) => a - b) });
      }
      return;
    }
    if (!current.times.includes(minutes)) {
      persist(date, { ...current, times: [...current.times, minutes].sort((a, b) => a - b) });
    }
  };

  const removeTime = (date: string, minutes: number) => {
    const current = availability[date] ?? NONE;
    persist(date, { ...current, times: current.times.filter((t) => t !== minutes) });
  };

  const toggleDay = (date: string) => {
    const current = availability[date] ?? NONE;
    const allTicked = current.hours.length === HOURS.length;
    // "Golește" clears the custom times too; "Toate" ticks the hours and keeps them.
    persist(date, allTicked ? NONE : { hours: [...HOURS], times: current.times });
  };

  const todayKey = dateKey(new Date());

  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="mb-6">
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground">
            Calendar disponibilitate
          </h1>
          <p className="mt-2 text-muted-foreground">
            Bifați orele în care sunteți disponibil. Pentru o oră care nu e
            întreagă (11:15, 16:40), scrieți-o în câmpul din ziua respectivă.
            Asistentul programează pacienții doar la orele marcate.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          {!lockedToDoctor && (
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="border border-border px-3 py-2 bg-background text-sm"
            >
              {team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.role}
                </option>
              ))}
            </select>
          )}

          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              className="px-3 py-2 border border-border text-sm"
            >
              ← Săptămâna trecută
            </button>
            <button
              onClick={() => setWeekStart(startOfWeek(new Date()))}
              className="px-3 py-2 border border-border text-sm"
            >
              Azi
            </button>
            <button
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              className="px-3 py-2 border border-border text-sm"
            >
              Săptămâna viitoare →
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 mb-4 bg-background border border-red-200 p-3">
            {error}
          </p>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Se încarcă...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {days.map((day) => {
              const key = dateKey(day);
              const { hours, times } = availability[key] ?? NONE;
              const count = hours.length + times.length;
              return (
                <div
                  key={key}
                  className={`bg-background border p-4 ${
                    key === todayKey ? "border-foreground" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-foreground">
                        {DAY_NAMES[day.getDay()]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {day.toLocaleDateString("ro-RO", {
                          day: "numeric",
                          month: "long",
                          timeZone: "Europe/Chisinau",
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleDay(key)}
                      disabled={saving === key}
                      className="text-xs border border-border px-2 py-1 disabled:opacity-50"
                    >
                      {hours.length === HOURS.length ? "Golește" : "Toate"}
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-1">
                    {HOURS.map((h) => {
                      const active = hours.includes(h);
                      return (
                        <button
                          key={h}
                          onClick={() => toggleHour(key, h)}
                          disabled={saving === key}
                          className={`text-xs py-1.5 border transition-colors disabled:opacity-50 ${
                            active
                              ? "bg-foreground text-background border-foreground"
                              : "bg-background text-muted-foreground border-border hover:border-foreground/50"
                          }`}
                        >
                          {h}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom start times — 11:15, 16:40 — beside the whole hours.
                      Pressing one removes it. */}
                  {times.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {times.map((t) => (
                        <button
                          key={t}
                          onClick={() => removeTime(key, t)}
                          disabled={saving === key}
                          title="Apăsați pentru a scoate ora"
                          className="text-xs py-1 px-2 border bg-foreground text-background border-foreground disabled:opacity-50 tabular-nums"
                        >
                          {clock(t)} ×
                        </button>
                      ))}
                    </div>
                  )}

                  <form
                    className="flex items-center gap-1 mt-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      addTime(key);
                    }}
                  >
                    <input
                      type="time"
                      step={60}
                      aria-label={`Altă oră pentru ${key}`}
                      value={typed[key] ?? ""}
                      onChange={(e) => setTyped((t) => ({ ...t, [key]: e.target.value }))}
                      className="flex-1 min-w-0 px-2 py-1 border border-border bg-background text-xs tabular-nums"
                    />
                    <button
                      type="submit"
                      disabled={saving === key || !typed[key]}
                      className="text-xs border border-border px-2 py-1 disabled:opacity-50"
                    >
                      + Adaugă
                    </button>
                  </form>

                  <p className="text-xs text-muted-foreground mt-2">
                    {count === 0
                      ? "Zi liberă"
                      : `${count} ${count === 1 ? "oră" : "ore"} disponibile`}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
