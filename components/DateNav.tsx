"use client";

import Link from "next/link";
import { ArchiveDay } from "@/lib/queries";

export default function DateNav({ days, activeDate }: { days: ArchiveDay[]; activeDate: string }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
      {days.map((d) => {
        const isActive = d.date === activeDate;
        return (
          <Link
            key={d.date}
            href={d.date === days[0]?.date ? "/" : `/?date=${d.date}`}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold border transition-all duration-150 ${
              isActive
                ? "bg-gray-900 border-gray-900 text-white shadow-sm"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900"
            }`}
          >
            {d.label}
            <span className={`ml-1.5 text-[10px] font-medium ${isActive ? "text-white/60" : "text-gray-400"}`}>
              {d.story_count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
