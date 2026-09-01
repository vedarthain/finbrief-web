"use client";

import { useState } from "react";
import { PaperStory, StockInFocus } from "@/lib/queries";

function renderSummary(text: string, dimClass: string) {
  return text.split(/(\[\[[^\]]+\]\])/g).map((part, i) => {
    const match = part.match(/^\[\[([^\]]+)\]\]$/);
    if (match) {
      return (
        <span key={i} className="text-emerald-700 font-semibold underline decoration-emerald-300 underline-offset-2">
          {match[1]}
        </span>
      );
    }
    return (
      <span key={i} className={dimClass}>
        {part}
      </span>
    );
  });
}

const SECTION_STYLE: Record<string, string> = {
  "Economy & Policy":      "text-teal-600 bg-teal-50",
  "IPO & Market":          "text-orange-700 bg-orange-50",
  "Sectors in Focus":      "text-cyan-600 bg-cyan-50",
  "Environment & Resources": "text-lime-700 bg-lime-50",
  "Growth & Development":  "text-amber-700 bg-amber-50",
  "International News":    "text-rose-600 bg-rose-50",
  "Regulatory":            "text-slate-600 bg-slate-100",
  "Trade":                 "text-indigo-600 bg-indigo-50",
  "Insurance":             "text-blue-600 bg-blue-50",
  "Corporate Events":      "text-violet-600 bg-violet-50",
  "Others":                "text-gray-500 bg-gray-50",
  "Stocks in Focus":       "text-emerald-700 bg-emerald-50",
};

const SECTION_BAR: Record<string, string> = {
  "Economy & Policy":      "bg-teal-500",
  "IPO & Market":          "bg-orange-500",
  "Sectors in Focus":      "bg-cyan-500",
  "Environment & Resources": "bg-lime-500",
  "Growth & Development":  "bg-amber-500",
  "International News":    "bg-rose-500",
  "Regulatory":            "bg-slate-500",
  "Trade":                 "bg-indigo-500",
  "Insurance":             "bg-blue-500",
  "Corporate Events":      "bg-violet-500",
  "Others":                "bg-gray-400",
  "Stocks in Focus":       "bg-emerald-500",
};

const STOCKS_TAB = "Stocks in Focus";

export default function PaperTree({
  bySection,
  stocksInFocus,
}: {
  bySection: Record<string, PaperStory[]>;
  stocksInFocus: StockInFocus[];
}) {
  const storySections = Object.keys(bySection);
  const sections = [...storySections];
  if (stocksInFocus.length > 0) {
    const ipoIdx = sections.indexOf("IPO & Market");
    const insertAt = ipoIdx === -1 ? sections.length : ipoIdx + 1;
    sections.splice(insertAt, 0, STOCKS_TAB);
  }
  const [activeSection, setActiveSection] = useState<string | null>(sections[0] ?? null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const rows = activeSection && activeSection !== STOCKS_TAB ? bySection[activeSection] ?? [] : [];

  return (
    <div className="flex flex-col md:flex-row gap-5 items-start">
      {/* ── Left: section tree ─────────────────────────────────────────── */}
      <aside className="w-full md:w-64 shrink-0 md:sticky md:top-20">
        <nav className="rounded-lg bg-white border border-gray-200 overflow-hidden">
          {sections.map((section) => (
            <button
              key={section}
              onClick={() => { setActiveSection(section); setExpandedId(null); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] border-b border-gray-100 last:border-b-0 transition-colors ${
                activeSection === section
                  ? "bg-gray-900 text-white font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  activeSection === section ? "bg-white" : SECTION_BAR[section] ?? "bg-gray-400"
                }`}
              />
              <span className="truncate">{section}</span>
              <span className={`ml-auto text-[11px] tabular-nums ${activeSection === section ? "text-gray-300" : "text-gray-400"}`}>
                {section === STOCKS_TAB ? stocksInFocus.length : bySection[section].length}
              </span>
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Right: row list, expand on click ──────────────────────────── */}
      <div className="flex-1 min-w-0 rounded-lg bg-white border border-gray-200 divide-y divide-gray-100">
        {activeSection && (
          <div className="flex items-center gap-2 px-4 py-2.5">
            <span className={`text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded ${
              SECTION_STYLE[activeSection] ?? "text-gray-500 bg-gray-50"
            }`}>
              {activeSection}
            </span>
          </div>
        )}
        {activeSection === STOCKS_TAB && (
          <div className="px-4 py-3.5">
            <ul className="space-y-3">
              {stocksInFocus.map((s) => (
                <li key={s.name} className="text-[14px] leading-snug">
                  <span className="text-emerald-700 font-semibold underline decoration-emerald-300 underline-offset-2">{s.name}</span>
                  <span className="text-gray-500"> — {s.note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {rows.map((s) => {
          const open = expandedId === s.id;
          return (
            <div key={s.id}>
              <button
                onClick={() => setExpandedId(open ? null : s.id)}
                className="w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[16px] font-semibold text-gray-900 leading-snug">
                      {s.headline}
                    </h3>
                    {!open && (
                      <p className="text-[14px] leading-snug mt-1 line-clamp-1">
                        {renderSummary(s.summary, "text-gray-400")}
                      </p>
                    )}
                  </div>
                  <span className="text-gray-300 text-[13px] shrink-0 mt-0.5">
                    {open ? "–" : "+"}
                  </span>
                </div>
              </button>
              {open && (
                <div className="px-4 pb-4 -mt-1">
                  <p className="text-[15px] leading-relaxed">
                    {renderSummary(s.summary, "text-gray-500")}
                  </p>
                  {s.page_number != null && (
                    <p className="text-[12px] text-gray-400 mt-2">Page {s.page_number}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
