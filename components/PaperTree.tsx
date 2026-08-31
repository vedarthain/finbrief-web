"use client";

import { useState } from "react";
import { PaperStory } from "@/lib/queries";

const SECTION_STYLE: Record<string, string> = {
  "Front Page":          "text-amber-700 bg-amber-50",
  "Markets":             "text-blue-600 bg-blue-50",
  "Economy":             "text-teal-600 bg-teal-50",
  "Companies":           "text-violet-600 bg-violet-50",
  "World":               "text-rose-600 bg-rose-50",
  "Personal Finance":    "text-emerald-600 bg-emerald-50",
  "Opinion":             "text-slate-600 bg-slate-100",
  "BrandWagon":          "text-fuchsia-600 bg-fuchsia-50",
  "IPO & Legal Notices": "text-orange-700 bg-orange-50",
};

const SECTION_BAR: Record<string, string> = {
  "Front Page":          "bg-amber-500",
  "Markets":             "bg-blue-500",
  "Economy":             "bg-teal-500",
  "Companies":           "bg-violet-500",
  "World":               "bg-rose-500",
  "Personal Finance":    "bg-emerald-500",
  "Opinion":             "bg-slate-500",
  "BrandWagon":          "bg-fuchsia-500",
  "IPO & Legal Notices": "bg-orange-500",
};

export default function PaperTree({
  bySection,
}: {
  bySection: Record<string, PaperStory[]>;
}) {
  const firstStory = Object.values(bySection)[0]?.[0] ?? null;
  const [selected, setSelected] = useState<PaperStory | null>(firstStory);

  return (
    <div className="flex gap-6 items-start">
      {/* ── Left: tree nav ─────────────────────────────────────────────── */}
      <aside className="w-full md:w-80 shrink-0 md:sticky md:top-20">
        <nav className="rounded-xl bg-white border border-gray-150 shadow-sm divide-y divide-gray-100 max-h-[calc(100vh-6rem)] overflow-y-auto">
          {Object.entries(bySection).map(([section, items]) => (
            <div key={section}>
              <div className="flex items-center gap-2 px-3 py-2.5 sticky top-0 bg-white">
                <span className={`w-1.5 h-1.5 rounded-full ${SECTION_BAR[section] ?? "bg-gray-400"}`} />
                <span className="text-[13px] font-bold text-gray-900 truncate">{section}</span>
                <span className="text-[11px] text-gray-400 ml-auto tabular-nums">{items.length}</span>
              </div>
              <ul className="pb-1.5">
                {items.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => setSelected(s)}
                      className={`w-full text-left pl-6 pr-3 py-2 text-[13.5px] leading-snug transition-colors ${
                        selected?.id === s.id
                          ? "bg-gray-900 text-white font-semibold"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <span className="line-clamp-2">{s.headline}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Right: selected story detail ──────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {selected ? (
          <article className="rounded-xl bg-white border border-gray-150 shadow-sm p-8">
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-[11px] font-bold tracking-widest uppercase px-2.5 py-1 rounded ${
                SECTION_STYLE[selected.section] ?? "text-gray-500 bg-gray-50"
              }`}>
                {selected.section}
              </span>
              {selected.page_number != null && (
                <span className="text-[13px] text-gray-400 tabular-nums">
                  Page {selected.page_number}
                </span>
              )}
            </div>
            <h2 className="text-[26px] font-black text-gray-900 leading-tight mb-4 tracking-tight">
              {selected.headline}
            </h2>
            <p className="text-[17px] text-gray-700 leading-relaxed">
              {selected.summary}
            </p>
          </article>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center shadow-sm">
            <p className="text-[15px] text-gray-400">Select a headline to read the story.</p>
          </div>
        )}
      </div>
    </div>
  );
}
