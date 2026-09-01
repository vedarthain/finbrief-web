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

const SECTION_BAR: Record<string, string> = {
  "Economy":               "bg-teal-500",
  "Policy":                "bg-sky-500",
  "Regulatory":            "bg-slate-500",
  "Sector":                "bg-cyan-500",
  [STOCKS_TAB]:            "bg-emerald-500",
  "Corporate Events":      "bg-violet-500",
  "IPO":                   "bg-orange-500",
  "Market":                "bg-pink-500",
  "Trade":                 "bg-indigo-500",
  "Insurance":             "bg-blue-500",
  "Growth & Development":  "bg-amber-500",
  "International News":    "bg-rose-500",
  "Others":                "bg-gray-400",
};

// Sidebar tree definition. A node is either a standalone leaf section
// ("single") or a group with child leaves ("children"). Groups whose
// children all end up empty for the day are dropped at render time.
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

  const [activeLeaf, setActiveLeaf] = useState<string | null>(resolvedGroups[0]?.resolvedChildren[0] ?? null);
  const [openGroup, setOpenGroup] = useState<string | null>(
    resolvedGroups.find((g) => !g.single)?.label ?? resolvedGroups[0]?.label ?? null
  );
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const rows = activeLeaf && activeLeaf !== STOCKS_TAB ? bySection[activeLeaf] ?? [] : [];

  function selectLeaf(g: typeof resolvedGroups[number], leaf: string) {
    setActiveLeaf(leaf);
    setExpandedId(null);
    if (!g.single) setOpenGroup(g.label);
  }

  function toggleGroup(g: typeof resolvedGroups[number]) {
    if (g.single) {
      selectLeaf(g, g.single);
      return;
    }
    setOpenGroup((prev) => (prev === g.label ? null : g.label));
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 items-start">
      {/* ── Left: section tree ─────────────────────────────────────────── */}
      <aside className="w-full md:w-56 shrink-0 md:sticky md:top-20">
        <nav className="rounded-lg bg-white border border-gray-200 overflow-hidden">
          {resolvedGroups.map((g) => {
            const isGroup = !g.single;
            const isOpen = isGroup && openGroup === g.label;
            const isActiveLeafHere = g.resolvedChildren.includes(activeLeaf ?? "");
            return (
              <div key={g.label} className="border-b border-gray-100 last:border-b-0">
                <button
                  onClick={() => toggleGroup(g)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-[12px] md:text-[11.5px] transition-colors ${
                    !isGroup && activeLeaf === g.single
                      ? "bg-gray-900 text-white font-medium"
                      : isActiveLeafHere
                      ? "bg-gray-50 text-gray-900 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      !isGroup && activeLeaf === g.single ? "bg-white" : SECTION_BAR[g.resolvedChildren[0]] ?? "bg-gray-400"
                    }`}
                  />
                  <span className="truncate">{g.label}</span>
                  <span className={`ml-auto text-[10px] tabular-nums ${!isGroup && activeLeaf === g.single ? "text-gray-300" : "text-gray-400"}`}>
                    {g.resolvedChildren.reduce((sum, c) => sum + countOf(c), 0)}
                  </span>
                  {isGroup && (
                    <span className={`text-[9px] ${isOpen ? "rotate-180" : ""} transition-transform text-gray-400`}>▾</span>
                  )}
                </button>
                {isGroup && isOpen && (
                  <div className="bg-gray-50/60">
                    {g.resolvedChildren.map((leaf) => (
                      <button
                        key={leaf}
                        onClick={() => selectLeaf(g, leaf)}
                        className={`w-full flex items-center gap-2 pl-7 pr-3 py-1.5 text-[11.5px] md:text-[11px] transition-colors ${
                          activeLeaf === leaf
                            ? "bg-gray-900 text-white font-medium"
                            : "text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            activeLeaf === leaf ? "bg-white" : SECTION_BAR[leaf] ?? "bg-gray-400"
                          }`}
                        />
                        <span className="truncate">{leaf}</span>
                        <span className={`ml-auto text-[10px] tabular-nums ${activeLeaf === leaf ? "text-gray-300" : "text-gray-400"}`}>
                          {countOf(leaf)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ── Right: row list, expand on click ──────────────────────────── */}
      <div className="flex-1 min-w-0 rounded-lg bg-white border border-gray-200 divide-y divide-gray-100">
        {activeLeaf && (
          <div className="flex items-center gap-2 px-4 py-2">
            <span className={`text-[10px] md:text-[9.5px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded ${
              SECTION_STYLE[activeLeaf] ?? "text-gray-500 bg-gray-50"
            }`}>
              {activeLeaf}
            </span>
          </div>
        )}
        {activeLeaf === STOCKS_TAB && (
          <div className="px-4 py-3">
            <ul className="space-y-2.5">
              {stocksInFocus.map((s) => (
                <li key={s.name} className="text-[13px] md:text-[12.5px] leading-snug">
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
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <h3 className="flex-1 min-w-0 truncate text-[14px] md:text-[13px] font-semibold text-gray-900">
                    {s.headline}
                  </h3>
                  <span className="text-gray-300 text-[12px] shrink-0">
                    {open ? "–" : "+"}
                  </span>
                </div>
              </button>
              {open && (
                <div className="px-4 pb-3.5 -mt-0.5">
                  <p className="text-[13px] md:text-[12.5px] leading-relaxed">
                    {renderSummary(s.summary, "text-gray-500")}
                  </p>
                  {s.page_number != null && (
                    <p className="text-[11px] text-gray-400 mt-2">Page {s.page_number}</p>
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
