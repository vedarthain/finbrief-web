"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArchiveDay } from "@/lib/queries";

export default function CalendarPicker({
  days,
  activeDate,
}: {
  days: ArchiveDay[];                 // dates that have stories, w/ counts
  activeDate: string;                  // "YYYY-MM-DD"
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date(activeDate + "T12:00:00");
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const popoverRef = useRef<HTMLDivElement>(null);

  // Story count lookup
  const countMap = new Map(days.map((d) => [d.date, d.story_count]));
  const datesWithStories = new Set(days.map((d) => d.date));

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    setTimeout(() => document.addEventListener("mousedown", onClick), 0);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Build the month grid
  const year  = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();        // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = viewMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  function navigate(d: string) {
    setOpen(false);
    router.push(d === todayIST ? "/" : `/?date=${d}`);
  }

  function dateStr(d: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  // Active date display
  const activeDateObj = new Date(activeDate + "T12:00:00");
  const isToday = activeDate === todayIST;
  const yesterdayIST = new Date(Date.now() - 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const isYesterday = activeDate === yesterdayIST;
  let displayLabel: string;
  if (isToday) displayLabel = "Today";
  else if (isYesterday) displayLabel = "Yesterday";
  else displayLabel = activeDateObj.toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[14px] sm:text-[13px] font-semibold bg-white border border-gray-200 hover:border-gray-400 transition-colors"
      >
        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-gray-900">{displayLabel}</span>
        <span className="text-[12px] text-gray-400 tabular-nums">
          {countMap.get(activeDate) ? `${countMap.get(activeDate)} stories` : ""}
        </span>
        <svg className={`w-3 h-3 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Quick chips */}
      {!open && (
        <div className="hidden sm:inline-flex items-center gap-1.5 ml-2">
          <button
            onClick={() => navigate(todayIST)}
            className={`px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${
              isToday
                ? "bg-gray-900 border-gray-900 text-white"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => navigate(yesterdayIST)}
            className={`px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${
              isYesterday
                ? "bg-gray-900 border-gray-900 text-white"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
            }`}
          >
            Yesterday
          </button>
        </div>
      )}

      {/* Popover calendar — opens DOWN and aligned to the right (extends leftward) */}
      {open && (
        <div className="absolute top-full right-0 mt-2 z-30 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-[300px]">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setViewMonth(new Date(year, month - 1, 1))}
              className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-[14px] font-bold text-gray-900">{monthLabel}</span>
            <button
              onClick={() => setViewMonth(new Date(year, month + 1, 1))}
              className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="text-center text-[11px] font-bold text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const ds = dateStr(d);
              const hasStories = datesWithStories.has(ds);
              const isActive   = ds === activeDate;
              const isCurrent  = ds === todayIST;
              const count      = countMap.get(ds) ?? 0;
              return (
                <button
                  key={i}
                  onClick={() => hasStories && navigate(ds)}
                  disabled={!hasStories}
                  className={`relative h-10 rounded-md text-[13px] font-medium transition-colors ${
                    isActive
                      ? "bg-gray-900 text-white"
                      : hasStories
                        ? "hover:bg-amber-50 text-gray-900"
                        : "text-gray-300 cursor-not-allowed"
                  } ${isCurrent && !isActive ? "ring-1 ring-amber-300" : ""}`}
                  title={hasStories ? `${count} stories` : ""}
                >
                  {d}
                  {hasStories && !isActive && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-400 flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>has stories</span>
            <span className="ml-auto">{days.length} days with coverage</span>
          </div>
        </div>
      )}
    </div>
  );
}
