"use client";

import { useState, useEffect, useCallback } from "react";
import { secureFetch } from "@/lib/csrf-client";

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 8:00 – 23:00
const DAY_NAMES = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];

interface TeamMember {
  id: string;
  name: string;
  role: string;
}

interface Availability {
  teamMemberId: string;
  date: string;
  hours: number[];
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
  const [availability, setAvailability] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        const list: TeamMember[] = Array.isArray(teamData) ? teamData : [];
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
      const map: Record<string, number[]> = {};
      for (const row of Array.isArray(rows) ? rows : []) {
        map[row.date] = row.hours;
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

  const persist = async (date: string, hours: number[]) => {
    setSaving(date);
    setError(null);
    const previous = availability[date] ?? [];
    setAvailability((a) => ({ ...a, [date]: hours }));

    try {
      const res = await secureFetch("/api/admin/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamMemberId: doctorId, date, hours }),
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
    const current = availability[date] ?? [];
    const next = current.includes(hour)
      ? current.filter((h) => h !== hour)
      : [...current, hour].sort((a, b) => a - b);
    persist(date, next);
  };

  const toggleDay = (date: string) => {
    const current = availability[date] ?? [];
    persist(date, current.length === HOURS.length ? [] : [...HOURS]);
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
            Bifați orele în care sunteți disponibil. Pacienții vor putea fi
            programați doar în intervalele marcate.
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
              const hours = availability[key] ?? [];
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

                  <p className="text-xs text-muted-foreground mt-2">
                    {hours.length === 0
                      ? "Zi liberă"
                      : `${hours.length} ${hours.length === 1 ? "oră" : "ore"} disponibile`}
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
