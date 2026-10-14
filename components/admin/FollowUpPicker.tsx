"use client";

/**
 * The day and hour to call a lead back.
 *
 * Minutes go in steps of ten: the reminders are checked about that often, so
 * 16:08 would ring at 16:10 anyway. The value goes out as a full ISO moment,
 * so the server cannot read it as UTC and move it by three hours.
 */

import { clinicParts, clinicToIso } from "@/lib/chisinau-time";

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
const MINUTES = ["00", "10", "20", "30", "40", "50"];

export default function FollowUpPicker({
  value,
  onChange,
  disabled = false,
  className = "",
}: {
  value: string | null | undefined;
  onChange: (iso: string | null) => void;
  disabled?: boolean;
  className?: string;
}) {
  const { date, hour, minute } = clinicParts(value);
  // A stored minute off the ten-minute grid still shows as itself.
  const minutes = MINUTES.includes(minute) ? MINUTES : [...MINUTES, minute].sort();

  const emit = (nextDate: string, nextHour: string, nextMinute: string) =>
    onChange(nextDate ? clinicToIso(nextDate, nextHour, nextMinute) : null);

  const select =
    "shrink-0 px-1.5 py-1 text-xs text-gray-900 border border-gray-300 rounded-lg bg-white font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none disabled:opacity-50";

  return (
    <div className={className}>
      <div className="flex items-center gap-1 flex-nowrap">
        <input
          type="date"
          value={date}
          disabled={disabled}
          onChange={(e) => emit(e.target.value, hour, minute)}
          className="min-w-0 flex-1 px-1.5 py-1 text-xs text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
          aria-label="Ziua"
        />
        <select
          value={hour}
          disabled={disabled || !date}
          onChange={(e) => emit(date, e.target.value, minute)}
          className={select}
          aria-label="Ora"
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span className="text-gray-400 font-bold shrink-0">:</span>
        <select
          value={minute}
          disabled={disabled || !date}
          onChange={(e) => emit(date, hour, e.target.value)}
          className={select}
          aria-label="Minutul"
        >
          {minutes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] text-gray-400">ora Chișinăului</span>
        {date && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(null)}
            className="text-[10px] text-gray-500 hover:text-red-600 disabled:opacity-50"
          >
            elimină
          </button>
        )}
      </div>
    </div>
  );
}
