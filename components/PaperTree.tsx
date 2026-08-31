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
  "Technology":          "text-cyan-600 bg-cyan-50",
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
  "Technology":          "bg-cyan-500",
  "IPO & Legal Notices": "bg-orange-500",
};

export default function PaperTree({
  bySection,
}: {
  bySection: Record<string, PaperStory[]>;
}) {
  const sections = Object.keys(bySection);
  const [activeSection, setActiveSection] = useState<string | null>(sections[0] ?? null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const rows = activeSection ? bySection[activeSection] ?? [] : [];

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
                {bySection[section].length}
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
                      <p className="text-[14px] text-gray-500 leading-snug mt-1 line-clamp-1">
                        {s.summary}
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
                  <p className="text-[15px] text-gray-700 leading-relaxed">
                    {s.summary}
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
