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

const STOCKS_TAB = "Stocks in Focus";

const SECTION_STYLE: Record<string, string> = {
  "Economy":               "text-teal-600 bg-teal-50",
  "Policy":                "text-sky-600 bg-sky-50",
  "Regulatory":            "text-slate-600 bg-slate-100",
  "Sector":                "text-cyan-600 bg-cyan-50",
  [STOCKS_TAB]:            "text-emerald-700 bg-emerald-50",
  "Corporate Events":      "text-violet-600 bg-violet-50",
  "IPO":                   "text-orange-700 bg-orange-50",
  "Market":                "text-pink-600 bg-pink-50",
  "Trade":                 "text-indigo-600 bg-indigo-50",
  "Insurance":             "text-blue-600 bg-blue-50",
  "Growth & Development":  "text-amber-700 bg-amber-50",
  "International News":    "text-rose-600 bg-rose-50",
  "Others":                "text-gray-500 bg-gray-50",
};

// Top-level tab bar definition. A tab is either a standalone section
// ("single") or a group with sub-tabs ("children"). Groups whose children
// all end up empty for the day are dropped at render time.
const GROUPS: { label: string; single?: string; children?: string[] }[] = [
  { label: "Economy", single: "Economy" },
  { label: "Policy & Regulatory", children: ["Policy", "Regulatory"] },
  { label: "In Focus", children: ["Sector", STOCKS_TAB] },
  { label: "Stocks", children: ["Corporate Events", "IPO", "Market", "Trade", "Insurance"] },
  { label: "Growth & Development", single: "Growth & Development" },
  { label: "International News", single: "International News" },
  { label: "Others", single: "Others" },
];

export default function PaperTree({
  bySection,
  stocksInFocus,
}: {
  bySection: Record<string, PaperStory[]>;
  stocksInFocus: StockInFocus[];
}) {
  const countOf = (key: string) => (key === STOCKS_TAB ? stocksInFocus.length : bySection[key]?.length ?? 0);

  const resolvedGroups = GROUPS
    .map((g) => {
      if (g.single) {
        return countOf(g.single) > 0 ? { ...g, resolvedChildren: [g.single] } : null;
      }
      const children = (g.children ?? []).filter((c) => countOf(c) > 0);
      return children.length > 0 ? { ...g, resolvedChildren: children } : null;
    })
    .filter((g): g is { label: string; single?: string; children?: string[]; resolvedChildren: string[] } => g !== null);

  const [activeGroupLabel, setActiveGroupLabel] = useState<string | null>(resolvedGroups[0]?.label ?? null);
  const [activeChild, setActiveChild] = useState<string | null>(resolvedGroups[0]?.resolvedChildren[0] ?? null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const activeGroup = resolvedGroups.find((g) => g.label === activeGroupLabel) ?? null;
  const rows = activeChild && activeChild !== STOCKS_TAB ? bySection[activeChild] ?? [] : [];

  function selectGroup(g: typeof resolvedGroups[number]) {
    setActiveGroupLabel(g.label);
    setActiveChild(g.resolvedChildren[0]);
    setExpandedId(null);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── Top-level tab bar ─────────────────────────────────────────── */}
      <nav className="flex flex-wrap gap-1.5">
        {resolvedGroups.map((g) => (
          <button
            key={g.label}
            onClick={() => selectGroup(g)}
            className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
              activeGroupLabel === g.label
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {g.label}
          </button>
        ))}
      </nav>

      {/* ── Sub-tab row (only for multi-child groups) ────────────────── */}
      {activeGroup && activeGroup.resolvedChildren.length > 1 && (
        <nav className="flex flex-wrap gap-1.5 pl-1">
          {activeGroup.resolvedChildren.map((child) => (
            <button
              key={child}
              onClick={() => { setActiveChild(child); setExpandedId(null); }}
              className={`px-3 py-1 rounded-full text-[12px] font-medium border transition-colors ${
                activeChild === child
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
              }`}
            >
              {child}
              <span className="ml-1.5 tabular-nums opacity-70">{countOf(child)}</span>
            </button>
          ))}
        </nav>
      )}

      {/* ── Content panel ─────────────────────────────────────────────── */}
      <div className="rounded-lg bg-white border border-gray-200 divide-y divide-gray-100">
        {activeChild && (
          <div className="flex items-center gap-2 px-4 py-2.5">
            <span className={`text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded ${
              SECTION_STYLE[activeChild] ?? "text-gray-500 bg-gray-50"
            }`}>
              {activeChild}
            </span>
          </div>
        )}
        {activeChild === STOCKS_TAB && (
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
