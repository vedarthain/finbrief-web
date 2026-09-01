"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

function toISO(y: number, m: number, d: number) {
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

export default function DatePicker({
  activeDate,
  availableDates,
}: {
  activeDate: string;
  availableDates: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const [y0, m0] = activeDate.split("-").map(Number);
  const [viewYear, setViewYear] = useState(y0);
  const [viewMonth, setViewMonth] = useState(m0 - 1); // 0-indexed

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const availSet = new Set(availableDates);
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthLabel = firstOfMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function go(deltaMonths: number) {
    let ny = viewYear;
    let nm = viewMonth + deltaMonths;
    if (nm < 0) { nm = 11; ny -= 1; }
    if (nm > 11) { nm = 0; ny += 1; }
    setViewYear(ny);
    setViewMonth(nm);
  }

  function pick(d: number) {
    const iso = toISO(viewYear, viewMonth, d);
    if (!availSet.has(iso)) return;
    setOpen(false);
    router.push(`/?date=${iso}`);
  }

  const activeLabel = new Date(`${activeDate}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

  const sortedDates = [...availableDates].sort();
  const activeIdx = sortedDates.indexOf(activeDate);
  const prevDate = activeIdx > 0 ? sortedDates[activeIdx - 1] : null;
  const nextDate = activeIdx !== -1 && activeIdx < sortedDates.length - 1 ? sortedDates[activeIdx + 1] : null;

  return (
    <div className="relative flex items-center gap-1" ref={ref}>
      <button
        onClick={() => prevDate && router.push(`/?date=${prevDate}`)}
        disabled={!prevDate}
        aria-label="Previous day"
        className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        ‹
      </button>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-full border bg-white border-gray-200 text-gray-700 hover:border-gray-300 transition-colors"
      >
        <span aria-hidden>📅</span>
        <span>{activeLabel}</span>
      </button>
      <button
        onClick={() => nextDate && router.push(`/?date=${nextDate}`)}
        disabled={!nextDate}
        aria-label="Next day"
        className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        ›
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-lg border border-gray-200 bg-white shadow-lg p-3 z-30">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => go(-1)}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500"
              aria-label="Previous month"
            >
              ‹
            </button>
            <span className="text-[13px] font-semibold text-gray-900">{monthLabel}</span>
            <button
              onClick={() => go(1)}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500"
              aria-label="Next month"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="text-[10px] text-gray-400 text-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const iso = toISO(viewYear, viewMonth, d);
              const available = availSet.has(iso);
              const isActive = iso === activeDate;
              return (
                <button
                  key={i}
                  disabled={!available}
                  onClick={() => pick(d)}
                  className={`h-8 w-8 rounded-full text-[12px] flex items-center justify-center transition-colors ${
                    isActive
                      ? "bg-gray-900 text-white font-semibold"
                      : available
                      ? "text-gray-700 hover:bg-amber-50 font-medium"
                      : "text-gray-300 cursor-not-allowed"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
