"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PaperStory, StockInFocus } from "@/lib/queries";
import PaperSectionTable, { TableRow } from "./PaperSectionTable";

export function renderSummary(text: string, dimClass: string) {
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

function EditionBadge({ edition }: { edition: string }) {
  return (
    <span className="shrink-0 text-[9px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded border border-gray-200 text-gray-400 bg-gray-50">
      {edition}
    </span>
  );
}

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

  // Flattened leaf order — drives ArrowLeft/ArrowRight navigation across sections.
  const resolvedGroupsKey = resolvedGroups.map((g) => g.label + g.resolvedChildren.join(",")).join("|");
  const flatLeaves = useMemo(
    () => resolvedGroups.flatMap((g) => g.resolvedChildren.map((leaf) => ({ leaf, group: g }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolvedGroupsKey]
  );

  // More than one distinct edition present anywhere → show source badges.
  const multiEdition = useMemo(() => {
    const editions = new Set<string>();
    Object.values(bySection).forEach((rows) => rows.forEach((r) => editions.add(r.edition)));
    stocksInFocus.forEach((s) => s.edition && editions.add(s.edition));
    return editions.size > 1;
  }, [bySection, stocksInFocus]);

  const [activeLeaf, setActiveLeaf] = useState<string | null>(resolvedGroups[0]?.resolvedChildren[0] ?? null);
  const [focusIndex, setFocusIndex] = useState(0);

  // ── Font-size control: user-adjustable scale, persisted across visits ──
  // Starts at the default step on both server and client (avoids a hydration
  // mismatch), then syncs from localStorage right after mount.
  const FONT_STEPS = [0.8, 0.9, 1, 1.1, 1.25, 1.4, 1.6];
  const [fontStepIdx, setFontStepIdx] = useState(2);
  useEffect(() => {
    const saved = Number(localStorage.getItem("paper-font-step"));
    if (!Number.isNaN(saved) && saved >= 0 && saved < FONT_STEPS.length && saved !== 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from localStorage after mount, not a render-triggered loop
      setFontStepIdx(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function bumpFont(delta: number) {
    setFontStepIdx((i) => {
      const next = Math.min(FONT_STEPS.length - 1, Math.max(0, i + delta));
      localStorage.setItem("paper-font-step", String(next));
      return next;
    });
  }
  const fontScale = FONT_STEPS[fontStepIdx];
  const px = (base: number) => `${Math.round(base * fontScale * 10) / 10}px`;

  const rows = activeLeaf && activeLeaf !== STOCKS_TAB ? bySection[activeLeaf] ?? [] : [];
  const itemCount = activeLeaf === STOCKS_TAB ? stocksInFocus.length : rows.length;

  // Every section — including Stocks in Focus — renders through the same
  // generic table component, so build a uniform row shape for whichever
  // data source is active.
  const tableRows: TableRow[] = activeLeaf === STOCKS_TAB
    ? stocksInFocus.map((s, i) => ({ key: `sif-${i}`, headline: s.name, edition: s.edition }))
    : rows.map((s) => ({ key: s.id, headline: s.headline, industry: s.industry, edition: s.edition }));

  const selIndex = Math.min(Math.max(focusIndex, 0), Math.max(tableRows.length - 1, 0));
  const selectedStory = activeLeaf !== STOCKS_TAB ? rows[selIndex] ?? null : null;
  const selectedStock = activeLeaf === STOCKS_TAB ? stocksInFocus[selIndex] ?? null : null;

  function selectLeaf(leaf: string, focusAt = 0) {
    setActiveLeaf(leaf);
    setFocusIndex(focusAt);
  }

  // Clicking a group in the left panel jumps to whichever of its tabs is
  // already active, or the first one — the right panel then shows tabs for
  // every child of that group so the user can switch without leaving it.
  function selectGroup(g: (typeof resolvedGroups)[number]) {
    const current = g.resolvedChildren.includes(activeLeaf ?? "") ? (activeLeaf as string) : g.resolvedChildren[0];
    selectLeaf(current);
  }

  const activeGroup = resolvedGroups.find((g) => g.resolvedChildren.includes(activeLeaf ?? "")) ?? null;

  // ── Arrow-key navigation: Up/Down move the selected headline (within the
  // current section's table, flipping pages automatically at page edges via
  // the table's own pageStart-based selection), Left/Right switch sections ──
  // Keep a ref mirror of everything the handler needs so the listener (attached
  // once, on mount) always reads fresh values instead of a stale closure.
  const liveRef = useRef({ activeLeaf, focusIndex, itemCount, flatLeaves });
  useEffect(() => {
    liveRef.current = { activeLeaf, focusIndex, itemCount, flatLeaves };
  });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const { activeLeaf, focusIndex, itemCount, flatLeaves } = liveRef.current;
      e.preventDefault();

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (itemCount === 0) return;
        const next = e.key === "ArrowDown"
          ? Math.min(focusIndex + 1, itemCount - 1)
          : Math.max(focusIndex - 1, 0);
        setFocusIndex(next);
        return;
      }

      // ArrowLeft / ArrowRight — move to previous/next leaf section, crossing group boundaries
      const curIdx = flatLeaves.findIndex((f) => f.leaf === activeLeaf);
      if (curIdx === -1) return;
      const nextIdx = e.key === "ArrowRight"
        ? Math.min(curIdx + 1, flatLeaves.length - 1)
        : Math.max(curIdx - 1, 0);
      if (nextIdx === curIdx) return;
      const { leaf } = flatLeaves[nextIdx];
      selectLeaf(leaf, 0);
    }
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
    // Mount-only: onKeyDown reads current values via liveRef, so it never goes stale.
  }, []);

  return (
    <div className="flex flex-col gap-1.5">
      {/* ── Font-size control ──────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-1">
        <span className="text-[10.5px] text-gray-400 mr-0.5">Text size</span>
        <button
          onClick={() => bumpFont(-1)}
          disabled={fontStepIdx === 0}
          aria-label="Decrease text size"
          className="w-5 h-5 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[10px] font-semibold"
        >
          A−
        </button>
        <button
          onClick={() => bumpFont(1)}
          disabled={fontStepIdx === FONT_STEPS.length - 1}
          aria-label="Increase text size"
          className="w-5 h-5 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[11px] font-semibold"
        >
          A+
        </button>
      </div>
      {/* items-stretch (not items-start) on mobile: in the flex-col layout this is
          the CROSS axis, so it's what makes the story-list column fill the full
          viewport width instead of shrinking to its content width. On md+ the
          layout switches to flex-row, where items-start is what we actually want
          (keeps the sticky sidebar top-aligned instead of stretched to match height). */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-start">
      {/* ── Left: section tree ─────────────────────────────────────────── */}
      <aside className="w-full md:w-56 shrink-0 md:sticky md:top-20">
        <nav className="rounded-lg bg-white border border-gray-200 overflow-hidden">
          {resolvedGroups.map((g) => {
            const isActiveGroup = g.resolvedChildren.includes(activeLeaf ?? "");
            return (
              <button
                key={g.label}
                onClick={() => selectGroup(g)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-[14.5px] transition-colors border-b border-gray-100 last:border-b-0 ${
                  isActiveGroup ? "bg-gray-900 text-white font-medium" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isActiveGroup ? "bg-white" : SECTION_BAR[g.resolvedChildren[0]] ?? "bg-gray-400"
                  }`}
                />
                <span className="truncate">{g.label}</span>
                <span className={`ml-auto text-[10px] tabular-nums ${isActiveGroup ? "text-gray-300" : "text-gray-400"}`}>
                  {g.resolvedChildren.reduce((sum, c) => sum + countOf(c), 0)}
                </span>
              </button>
            );
          })}
        </nav>
        <p className="hidden md:block mt-2 px-1 text-[10.5px] text-gray-400">
          ↑↓ move between stories · ←→ switch section
        </p>
      </aside>

      {/* ── Right: paginated headline table + separate detail box below ─── */}
      <div className="w-full flex-1 min-w-0 flex flex-col gap-3">
        <div className="rounded-lg bg-white border border-gray-200 divide-y divide-gray-100">
          {activeGroup && (
            <div className="flex items-center gap-1.5 px-4 py-2 border-b border-gray-100 flex-wrap">
              {activeGroup.resolvedChildren.map((leaf) => (
                <button
                  key={leaf}
                  onClick={() => selectLeaf(leaf)}
                  className={`flex items-center gap-1.5 text-[12px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded transition-colors ${
                    activeLeaf === leaf
                      ? SECTION_STYLE[leaf] ?? "text-gray-700 bg-gray-100"
                      : "text-gray-400 hover:bg-gray-50"
                  }`}
                >
                  {leaf}
                  <span className="text-[10px] font-normal normal-case tracking-normal tabular-nums opacity-70">
                    {countOf(leaf)}
                  </span>
                </button>
              ))}
            </div>
          )}
          <PaperSectionTable
            rows={tableRows}
            selectedIndex={selIndex}
            onSelectIndex={setFocusIndex}
            multiEdition={multiEdition}
            px={px}
          />
        </div>

        {(selectedStory || selectedStock) && (
          <div className="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
            {selectedStory && (
              <>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 style={{ fontSize: px(17) }} className="font-semibold text-gray-900 leading-snug">
                    {selectedStory.headline}
                  </h3>
                  {selectedStory.industry && (
                    <span className="shrink-0 text-[10.5px] font-medium px-1.5 py-0.5 rounded border border-cyan-200 text-cyan-700 bg-cyan-50">
                      {selectedStory.industry}
                    </span>
                  )}
                  {multiEdition && <EditionBadge edition={selectedStory.edition} />}
                </div>
                <p style={{ fontSize: px(15.5) }} className="leading-relaxed">
                  {renderSummary(selectedStory.summary, "text-gray-700")}
                </p>
                {selectedStory.page_number != null && (
                  <p className="text-[13px] text-gray-400 mt-2">Page {selectedStory.page_number}</p>
                )}
              </>
            )}
            {selectedStock && (
              <>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 className="text-emerald-700 font-semibold underline decoration-emerald-300 underline-offset-2" style={{ fontSize: px(17) }}>
                    {selectedStock.name}
                  </h3>
                  {multiEdition && selectedStock.edition && <EditionBadge edition={selectedStock.edition} />}
                </div>
                <p style={{ fontSize: px(15.5) }} className="leading-relaxed text-gray-700">
                  {selectedStock.note}
                </p>
              </>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
