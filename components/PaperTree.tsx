"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PaperStory, StockInFocus, TopStory, MarketImpactStory } from "@/lib/queries";
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

// Clause-introducing words that, when they follow a comma mid-sentence, mark
// a natural break point — a reporting verb picking up the main clause after
// an appositive ("AAHL, a subsidiary of X, entered agreements…") or a
// participial clause tacking on a further fact ("…$1bn, valuing AAHL at
// $18bn"). Curated from how the daily summaries are actually written, so a
// long single sentence still splits into separate, standalone points instead
// of one dense block.
//
// Extended (Sept 2026) with contrast/causal conjunctions — but, though, even
// as, since, after — after auditing every comma-introduced clause across the
// published corpus. Unlike relative pronouns (which/that/who, deliberately
// left out below since they introduce a clause describing the preceding
// noun, not a new standalone fact — "AAHL, which makes X, …" isn't complete
// on its own), every one of these conjunctions was consistently followed by
// a full subject+verb clause that reads fine as its own bullet, e.g. "…but
// the government reiterated no retreat on its nuclear stance…" or "…though
// FDI inflows rose to $6.1 billion from $5.2 billion." Splitting on them
// turns dense contrast/causal sentences into their two constituent facts
// instead of leaving them merged into one oversized bullet.
const CLAUSE_WORDS =
  "valuing|giving|taking|making|bringing|pushing|raising|adding|translating|" +
  "reflecting|marking|following|entered|said|saying|announced|agreed|reported|filed|" +
  "posted|clocked|registered|logged|stated|noted|flagged|warned|forecast|" +
  "projected|unveiled|launched|opened|closed|signed|inked|secured|clinched|" +
  "confirmed|plans|aims|expects|targets|but|though|even as|since|after";

// A piece left over after the primary split (below) that's still this long
// almost always bundles more than one fact — e.g. a subject clause plus a
// trailing detail with no semicolon/clause-word/"while" to hang a split off
// of. Give those a second pass rather than let them render as a paragraph
// pretending to be one point.
const LONG_PIECE_CHARS = 130;

// Secondary pass for oversized pieces: re-run the same clause-word test as
// the primary split (a comma directly followed by one of CLAUSE_WORDS).
//
// An earlier version of this pass instead split on a bare comma before any
// lowercase letter, on the theory that comma-joined proper-noun lists
// ("Alpha Wave Global, Premji Invest, Temasek…") would stay intact since
// each item starts with a capital. Auditing every published summary against
// that rule (Sept 2026) showed it fires just as readily on things that
// are *not* a new independent fact:
//   - appositives: "…Paradise Plastics, undergoing corporate insolvency at
//     its Ahmednagar plant, invited EOI…" → "undergoing corporate
//     insolvency…" has no subject and can't stand alone.
//   - citation/attribution clauses: "…share capital, according to a company
//     petition notice." → "according to…" is a source tag, not a fact.
//   - plain comma-lists of lowercase nouns: "…identify five human skills —
//     curiosity, courage, creativity, compassion…" → each item became its
//     own one-word bullet.
// All three read as abruptly broken fragments rather than crisp, standalone
// points — exactly the complaint a reader would have. A genuine new fact
// reliably announces itself with a clause-word (a reporting/result verb:
// "valuing…", "said…", "adding…") or a semicolon/"while" in the primary
// pass; a bare comma alone doesn't carry that signal. So the second pass now
// applies the identical clause-word rule instead of a separate, looser one.
// Net effect: a long sentence with no real second clause stays as a single
// (longer, but grammatically whole) bullet rather than getting cut apart at
// an arbitrary comma.
function secondarySplit(piece: string): string[] {
  if (piece.length <= LONG_PIECE_CHARS) return [piece];
  return piece
    .split(new RegExp(`,\\s+(?=(?:${CLAUSE_WORDS})\\b)`, "gi"))
    .map((s) => s.trim())
    .filter(Boolean);
}

// Break a prose summary into standalone, crisp points so the reader panel can
// render it as a scannable bullet list instead of a dense paragraph. Splits
// (a) after sentence-ending punctuation followed by whitespace + a capital
// letter, a highlight marker, or a rupee sign — good enough to avoid breaking
// on decimals/abbreviations (e.g. "5.24%", "₹1,846.90") since those aren't
// followed by a capital/marker; (b) on semicolons, which the underlying
// summaries frequently use to chain multiple distinct facts into one
// sentence; (c) on a comma immediately before one of CLAUSE_WORDS, which
// catches the long compound sentences (appositive + main clause, or a
// trailing "valuing it at…"/"saying X…" clause) that would otherwise render
// as one oversized bullet; (d) on a standalone " while ", which the
// summaries use to contrast two distinct figures/facts in one sentence (e.g.
// "rose 14.8% in August while April-August collections rose 11%") — each
// side of "while" is its own fact and reads better as its own bullet; and
// (e) a secondarySplit pass on whatever's left that's still long, reusing
// the exact same clause-word rule as (c) rather than a looser one — see
// secondarySplit's comment for why. A piece with no genuine clause boundary
// stays whole even if long, rather than being fragmented at an arbitrary
// comma.
function splitSentences(text: string): string[] {
  const primary = text
    .split(new RegExp(`(?:(?<=[.!?])\\s+(?=[A-Z₹\\[]))|(?:;\\s+)|(?:,\\s+(?=(?:${CLAUSE_WORDS})\\b))|(?:\\s+while\\s+)`, "gi"))
    .map((s) => s.trim())
    .filter(Boolean);
  return primary.flatMap(secondarySplit);
}

// Always renders as a bullet list — even a single short point still gets a
// "•" so the reader panel never reads as a dense paragraph, keeping every
// story's presentation consistent regardless of how many points it has.
export function renderSummaryBullets(text: string, dimClass: string) {
  const sentences = splitSentences(text);
  return (
    <ul className="space-y-3.5">
      {sentences.map((s, i) => (
        <li key={i} className="flex gap-2 leading-relaxed">
          <span className="text-gray-300 shrink-0 select-none">•</span>
          <span>{renderSummary(s, dimClass)}</span>
        </li>
      ))}
    </ul>
  );
}

const STOCKS_TAB = "Stocks in Focus";
const TOP_TAB = "Top Stories";
const MARKET_TAB = "Market Impact";
const NOTICES_TAB = "Routine Notices";

const SECTION_STYLE: Record<string, string> = {
  [TOP_TAB]:               "text-red-700 bg-red-50",
  [MARKET_TAB]:            "text-yellow-700 bg-yellow-50",
  [NOTICES_TAB]:           "text-slate-600 bg-slate-100",
  "Economy":               "text-teal-600 bg-teal-50",
  "Policy":                "text-sky-600 bg-sky-50",
  "Regulatory":            "text-slate-600 bg-slate-100",
  "Sector":                "text-cyan-600 bg-cyan-50",
  [STOCKS_TAB]:            "text-emerald-700 bg-emerald-50",
  "Announcements":         "text-violet-600 bg-violet-50",
  "Events":                "text-fuchsia-600 bg-fuchsia-50",
  "Appointments":          "text-purple-600 bg-purple-50",
  "IPO":                   "text-orange-700 bg-orange-50",
  "Market":                "text-pink-600 bg-pink-50",
  "Trade":                 "text-indigo-600 bg-indigo-50",
  "Insurance":             "text-blue-600 bg-blue-50",
  "Growth & Development":  "text-amber-700 bg-amber-50",
  "International News":    "text-rose-600 bg-rose-50",
  "Others":                "text-gray-500 bg-gray-50",
};

const SECTION_BAR: Record<string, string> = {
  [TOP_TAB]:               "bg-red-500",
  [MARKET_TAB]:            "bg-yellow-500",
  "Economy":               "bg-teal-500",
  "Policy":                "bg-sky-500",
  "Regulatory":            "bg-slate-500",
  "Sector":                "bg-cyan-500",
  [STOCKS_TAB]:            "bg-emerald-500",
  "Announcements":         "bg-violet-500",
  "Events":                "bg-fuchsia-500",
  "Appointments":          "bg-purple-500",
  "IPO":                   "bg-orange-500",
  "Market":                "bg-pink-500",
  "Trade":                 "bg-indigo-500",
  "Insurance":             "bg-blue-500",
  "Growth & Development":  "bg-amber-500",
  "International News":    "bg-rose-500",
  "Others":                "bg-gray-400",
};

// Display-only label overrides — the underlying `section` value (used as the
// bySection/SECTION_STYLE/SECTION_BAR key, and for onClick/countOf lookups)
// stays the short taxonomy leaf name; only what's shown to the reader changes.
const LEAF_LABEL: Record<string, string> = {
  "Announcements": "Corporate Announcements",
  "Events": "Corporate Events",
  "Appointments": "Corporate Appointments",
};
const leafLabel = (leaf: string) => LEAF_LABEL[leaf] ?? leaf;

// Sidebar tree definition. A node is either a standalone leaf section
// ("single") or a group with child leaves ("children"). Groups whose
// children all end up empty for the day are dropped at render time.
// Top Stories / Market Impact / Stocks in Focus live as their own tabs in
// the top ribbon (next to the calendar/text-size controls), not in this
// sidebar tree.
const GROUPS: { label: string; single?: string; children?: string[] }[] = [
  { label: "Economy", single: "Economy" },
  { label: "Policy", single: "Policy" },
  { label: "Regulatory", single: "Regulatory" },
  { label: "Sector", single: "Sector" },
  { label: "IPO", single: "IPO" },
  { label: "Market", single: "Market" },
  { label: "Trade", single: "Trade" },
  { label: "Insurance", single: "Insurance" },
  { label: "Corporate Announcements", single: "Announcements" },
  { label: "Corporate Events", single: "Events" },
  { label: "Corporate Appointments", single: "Appointments" },
  { label: "Growth & Development", single: "Growth & Development" },
  { label: "International News", single: "International News" },
  { label: "Others", single: "Others" },
];

function EditionBadge({ edition }: { edition: string }) {
  const isBS = edition === "Business Standard";
  const label = isBS ? "BS" : "FX";
  const colorClasses = isBS
    ? "border-orange-200 text-orange-600 bg-orange-50"
    : "border-blue-200 text-blue-600 bg-blue-50";
  return (
    <span
      title={edition}
      className={`shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${colorClasses}`}
    >
      {label}
    </span>
  );
}

export default function PaperTree({
  bySection,
  stocksInFocus,
  topStories,
  marketImpactStories,
}: {
  bySection: Record<string, PaperStory[]>;
  stocksInFocus: StockInFocus[];
  topStories: TopStory[];
  marketImpactStories: MarketImpactStory[];
}) {
  // Routine compliance filings (AGM/postal-ballot/SARFAESI/lost-share-cert notices,
  // etc.) are real content but not "news" — every section's default view
  // filters them out. They surface only via the dedicated "Routine Notices"
  // ribbon tab, which is a peer of Top Stories / Market Impact / Stocks in
  // Focus (see NOTICES_TAB below): selecting it, like selecting any of the
  // other three, is just setting activeLeaf, so exactly one of the four (or
  // one sidebar section) is ever the active selection at a time — no
  // separate on/off toggle state needed anymore.
  const visibleOf = (key: string) => (bySection[key] ?? []).filter((s) => !s.is_notice);
  const allNotices = useMemo(
    () => Object.values(bySection).flat().filter((s) => s.is_notice),
    [bySection]
  );
  const totalNoticeCount = allNotices.length;
  const countOf = (key: string) =>
    key === STOCKS_TAB
      ? stocksInFocus.length
      : key === TOP_TAB
      ? topStories.length
      : key === MARKET_TAB
      ? marketImpactStories.length
      : visibleOf(key).length;

  // Top Stories / Market Impact entries carry a short curation note, but once
  // selected the reader wants the full story detail, not just that one-liner.
  // The publish pipeline keeps each digest entry's headline in sync with its
  // underlying story's headline (see the publish-epaper skill's headline-match
  // convention), so look the full story up by exact headline match and prefer
  // it over the note whenever found.
  const storyByHeadline = useMemo(() => {
    const map = new Map<string, PaperStory>();
    Object.values(bySection).forEach((rows) => rows.forEach((s) => map.set(s.headline, s)));
    return map;
  }, [bySection]);

  // ── Global search across every story in every section (and Stocks in Focus) ──
  const [query, setQuery] = useState("");
  const searchActive = query.trim().length >= 2;
  const searchResults = useMemo(() => {
    if (!searchActive) return [];
    const q = query.trim().toLowerCase();
    const matches: (PaperStory & { key: string })[] = [];
    Object.values(bySection).forEach((rows) => {
      rows.forEach((s) => {
        if (s.headline.toLowerCase().includes(q) || s.summary.toLowerCase().includes(q)) {
          matches.push({ ...s, key: `search-${s.id}` });
        }
      });
    });
    return matches;
  }, [query, searchActive, bySection]);

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
    topStories.forEach((s) => s.edition && editions.add(s.edition));
    marketImpactStories.forEach((s) => s.edition && editions.add(s.edition));
    return editions.size > 1;
  }, [bySection, stocksInFocus, topStories, marketImpactStories]);

  // Land on Top Stories by default (falling back to Market Impact, then the
  // first sidebar section) — same "most important first" precedence as
  // before, just no longer sourced from the sidebar's GROUPS list.
  const defaultLeaf =
    topStories.length > 0 ? TOP_TAB : marketImpactStories.length > 0 ? MARKET_TAB : resolvedGroups[0]?.resolvedChildren[0] ?? null;
  const [activeLeaf, setActiveLeaf] = useState<string | null>(defaultLeaf);
  const [focusIndex, setFocusIndex] = useState(0);

  // ── Ribbon (search / tabs / text-size) is portaled into the header's
  // #paper-toolbar-slot so it shares one line with the FinBrief logo, nav
  // tabs and date picker instead of sitting in its own row below. The slot
  // only exists once the header has mounted, so this starts null (SSR-safe)
  // and picks up the real node on the client.
  const [toolbarSlot, setToolbarSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time DOM lookup after mount
    setToolbarSlot(document.getElementById("paper-toolbar-slot"));
  }, []);

  // Collapsible section sidebar (Economy / Policy & Regulatory / …) —
  // expanded by default, persisted across visits like the active-leaf/font prefs.
  const [sidebarOpen, setSidebarOpen] = useState(true);
  useEffect(() => {
    const saved = localStorage.getItem("paper-sidebar-open");
    if (saved === "0") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from localStorage after mount
      setSidebarOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function toggleSidebar() {
    setSidebarOpen((o) => {
      const next = !o;
      localStorage.setItem("paper-sidebar-open", next ? "1" : "0");
      return next;
    });
  }

  // ── Persist the active section tab across refreshes ──
  // Starts on the first leaf (same on server and client, avoiding a hydration
  // mismatch), then — right after mount — swaps in whatever the user was last
  // viewing, provided that section still exists for this day's paper.
  useEffect(() => {
    const saved = localStorage.getItem("paper-active-leaf");
    if (saved && flatLeaves.some((f) => f.leaf === saved)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from localStorage after mount, not a render-triggered loop
      setActiveLeaf(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  // Reserve at least ~3.5 lines of height for the description body so every
  // story's detail panel reads as a consistent block regardless of how short
  // the summary is (rather than short items collapsing to one thin line).
  const descMinHeight = `${Math.round(15.5 * fontScale * 1.6 * 3.5)}px`;

  const isSpecialTab = activeLeaf === STOCKS_TAB || activeLeaf === TOP_TAB || activeLeaf === MARKET_TAB;
  // NOTICES_TAB isn't a sidebar leaf (not in bySection), so its own rows come
  // from the flattened allNotices list rather than visibleOf. It's still a
  // plain PaperStory[] like any sidebar section, though, so it flows through
  // the same "not special" branch below and needs no other special-casing.
  const rows =
    !searchActive && activeLeaf && !isSpecialTab
      ? activeLeaf === NOTICES_TAB
        ? allNotices
        : visibleOf(activeLeaf)
      : [];
  const itemCount = searchActive
    ? searchResults.length
    : activeLeaf === STOCKS_TAB
    ? stocksInFocus.length
    : activeLeaf === TOP_TAB
    ? topStories.length
    : activeLeaf === MARKET_TAB
    ? marketImpactStories.length
    : rows.length;

  // Every section — including Stocks in Focus, Top Stories, Market Impact and
  // search results — renders through the same generic table component, so
  // build a uniform row shape for whichever data source is active. `importance`
  // flows through so the table can badge must-read stories (>= 4) regardless
  // of which tab they're being viewed in.
  const tableRows: TableRow[] = searchActive
    ? searchResults.map((s) => ({ key: s.key, headline: s.headline, industry: s.industry, edition: s.edition, section: s.section, isNotice: s.is_notice, importance: s.importance }))
    : activeLeaf === STOCKS_TAB
    ? stocksInFocus.map((s, i) => ({ key: `sif-${i}`, headline: s.name, edition: s.edition }))
    : activeLeaf === TOP_TAB
    ? topStories.map((s, i) => ({ key: `top-${i}`, headline: s.headline, edition: s.edition, section: s.section }))
    : activeLeaf === MARKET_TAB
    ? marketImpactStories.map((s, i) => ({ key: `mkt-${i}`, headline: s.headline, edition: s.edition, section: s.section }))
    : rows.map((s) => ({ key: s.id, headline: s.headline, industry: s.industry, edition: s.edition, section: s.section, isNotice: s.is_notice, importance: s.importance }));

  const selIndex = Math.min(Math.max(focusIndex, 0), Math.max(tableRows.length - 1, 0));
  const selectedStory = searchActive
    ? searchResults[selIndex] ?? null
    : !isSpecialTab
    ? rows[selIndex] ?? null
    : null;
  const selectedStock = !searchActive && activeLeaf === STOCKS_TAB ? stocksInFocus[selIndex] ?? null : null;
  const selectedTop = !searchActive && activeLeaf === TOP_TAB ? topStories[selIndex] ?? null : null;
  const selectedMarket = !searchActive && activeLeaf === MARKET_TAB ? marketImpactStories[selIndex] ?? null : null;
  const selectedTopFull = selectedTop ? storyByHeadline.get(selectedTop.headline) ?? null : null;
  const selectedMarketFull = selectedMarket ? storyByHeadline.get(selectedMarket.headline) ?? null : null;

  function selectLeaf(leaf: string, focusAt = 0) {
    setActiveLeaf(leaf);
    setFocusIndex(focusAt);
    localStorage.setItem("paper-active-leaf", leaf);
  }

  // Double-clicking one of the four ribbon tabs (Top Stories / Market Impact /
  // Stocks in Focus / Routine Notices) unchecks it — falls back to the first
  // sidebar section instead of leaving a special tab "stuck" selected.
  function deselectRibbonTab() {
    const fallback = resolvedGroups[0]?.resolvedChildren[0] ?? null;
    if (!fallback) return;
    selectLeaf(fallback);
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

  // ── Ribbon: search, ribbon tabs, font-size — portaled into the header's
  // #paper-toolbar-slot (see toolbarSlot above) so it shares one line with
  // the FinBrief logo / nav tabs / date picker instead of its own row below.
  // No "Today's Paper" title here: the active NavTabs pill already says that.
  const ribbon = (
      <>
        {/* Top Stories / Market Impact / Stocks in Focus / Routine Notices are four
            peer selections that all just set activeLeaf, so exactly one of them
            (or one sidebar section) is ever "on" at a time — never more than one
            lit up simultaneously. All four share the same dark #182131 active
            style used everywhere else a selection needs to read as unambiguous
            (sidebar groups, IPO status pills), instead of each tab's own pale
            color tint, which was easy to miss at a glance. */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => selectLeaf(TOP_TAB)}
            onDoubleClick={() => deselectRibbonTab()}
            className={`flex items-center gap-1 text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
              !searchActive && activeLeaf === TOP_TAB
                ? "bg-[#182131] border-[#182131] text-white"
                : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            Top Stories
            <span className="text-[10px] font-normal tabular-nums opacity-70">{topStories.length}</span>
          </button>
          <button
            onClick={() => selectLeaf(MARKET_TAB)}
            onDoubleClick={() => deselectRibbonTab()}
            className={`flex items-center gap-1 text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
              !searchActive && activeLeaf === MARKET_TAB
                ? "bg-[#182131] border-[#182131] text-white"
                : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            Market Impact
            <span className="text-[10px] font-normal tabular-nums opacity-70">{marketImpactStories.length}</span>
          </button>
          <button
            onClick={() => selectLeaf(STOCKS_TAB)}
            onDoubleClick={() => deselectRibbonTab()}
            className={`flex items-center gap-1 text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
              !searchActive && activeLeaf === STOCKS_TAB
                ? "bg-[#182131] border-[#182131] text-white"
                : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            Stocks in Focus
            <span className="text-[10px] font-normal tabular-nums opacity-70">{stocksInFocus.length}</span>
          </button>
          {totalNoticeCount > 0 && (
            <button
              onClick={() => selectLeaf(NOTICES_TAB)}
              onDoubleClick={() => deselectRibbonTab()}
              className={`flex items-center gap-1 text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                !searchActive && activeLeaf === NOTICES_TAB
                  ? "bg-[#182131] border-[#182131] text-white"
                  : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              Routine Notices
              <span className="text-[10px] font-normal tabular-nums opacity-70">{totalNoticeCount}</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
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
        {/* Pushed to the far right (where the IST clock used to sit) via ml-auto. */}
        <div className="relative flex-1 min-w-[120px] max-w-[220px] ml-auto">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all stories…"
            className="w-full text-[13px] pl-3 pr-7 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-[13px]"
            >
              ✕
            </button>
          )}
        </div>
      </>
  );

  return (
    <div className="flex flex-col gap-1.5">
      {toolbarSlot && createPortal(ribbon, toolbarSlot)}
      {/* items-stretch (not items-start) on mobile: in the flex-col layout this is
          the CROSS axis, so it's what makes the story-list column fill the full
          viewport width instead of shrinking to its content width. On md+ the
          layout switches to flex-row, where items-start is what we actually want
          (keeps the sticky sidebar top-aligned instead of stretched to match height). */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-start">
      {/* ── Left: collapsible section tree (Top Stories / Market Impact / …) ── */}
      <aside className={`w-full ${sidebarOpen ? "md:w-56" : "md:w-11"} shrink-0 md:sticky md:top-20 transition-[width] duration-150`}>
        <div className="rounded-lg bg-white border border-gray-200 overflow-hidden">
          <button
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? "Collapse sections panel" : "Expand sections panel"}
            className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 hover:bg-gray-50 transition-colors ${
              sidebarOpen ? "border-b border-gray-100 justify-between" : "justify-center"
            }`}
          >
            {sidebarOpen && <span>Sections</span>}
            <span aria-hidden className="text-gray-400">{sidebarOpen ? "«" : "»"}</span>
          </button>
          {sidebarOpen && (
            <nav>
              {resolvedGroups.map((g) => {
                const isActiveGroup = g.resolvedChildren.includes(activeLeaf ?? "");
                return (
                  <button
                    key={g.label}
                    onClick={() => selectGroup(g)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-[14.5px] transition-colors border-b border-gray-100 last:border-b-0 ${
                      isActiveGroup ? "bg-[#182131] text-white font-medium" : "text-gray-600 hover:bg-gray-50"
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
          )}
        </div>
        {sidebarOpen && (
          <p className="hidden md:block mt-2 px-1 text-[10.5px] text-gray-400">
            ↑↓ move between stories · ←→ switch section
          </p>
        )}
      </aside>

      {/* ── Right: headline list (left column) + description panel (right column) ── */}
      <div className="w-full flex-1 min-w-0 flex flex-col lg:flex-row gap-3 items-stretch lg:items-start">
        <div className="w-full lg:w-[400px] shrink-0 rounded-lg bg-white border border-gray-200 divide-y divide-gray-100">
          {searchActive ? (
            <div className="flex items-center gap-1.5 px-4 py-2 border-b border-gray-100">
              <span className="text-[12px] font-semibold tracking-wide uppercase text-gray-700">
                Search results
              </span>
              <span className="text-[10px] font-normal normal-case tracking-normal tabular-nums opacity-70 text-gray-400">
                {searchResults.length}
              </span>
            </div>
          ) : activeLeaf === TOP_TAB || activeLeaf === MARKET_TAB || activeLeaf === STOCKS_TAB || activeLeaf === NOTICES_TAB ? (
            <div className="flex items-center gap-1.5 px-4 py-2 border-b border-gray-100 flex-wrap">
              <span
                className={`flex items-center gap-1.5 text-[12px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded ${
                  SECTION_STYLE[activeLeaf] ?? "text-gray-700 bg-gray-100"
                }`}
              >
                {activeLeaf}
                <span className="text-[10px] font-normal normal-case tracking-normal tabular-nums opacity-70">
                  {activeLeaf === TOP_TAB
                    ? topStories.length
                    : activeLeaf === MARKET_TAB
                    ? marketImpactStories.length
                    : activeLeaf === STOCKS_TAB
                    ? stocksInFocus.length
                    : allNotices.length}
                </span>
              </span>
            </div>
          ) : (
            activeGroup && activeGroup.resolvedChildren.length > 1 && (
              <div className="flex items-center gap-1.5 px-4 py-2 border-b border-gray-100 flex-wrap">
                {activeGroup.resolvedChildren.map((leaf) => (
                  <button
                    key={leaf}
                    onClick={() => selectLeaf(leaf)}
                    className={`flex items-center gap-1.5 text-[12px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded transition-colors ${
                      activeLeaf === leaf
                        ? "text-white bg-[#182131]"
                        : "text-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    {leafLabel(leaf)}
                    <span className="text-[10px] font-normal normal-case tracking-normal tabular-nums opacity-70">
                      {countOf(leaf)}
                    </span>
                  </button>
                ))}
              </div>
            )
          )}
          <PaperSectionTable
            rows={tableRows}
            selectedIndex={selIndex}
            onSelectIndex={setFocusIndex}
            multiEdition={multiEdition}
            px={px}
          />
        </div>

        {/* ── Description panel — always present on the right, sticky on desktop ── */}
        <div className="w-full flex-1 min-w-0 lg:sticky lg:top-20 rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
          {!(selectedStory || selectedStock || selectedTop || selectedMarket) ? (
            <div className="py-10 text-center text-[13px] text-gray-400">
              Select a story from the list to read its summary.
            </div>
          ) : (
            <>
              {selectedStory && (
                <>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 style={{ fontSize: px(17) }} className="font-semibold text-gray-900 leading-snug">
                      {selectedStory.headline}
                    </h3>
                    {(searchActive || activeLeaf === NOTICES_TAB) && (
                      <span className="shrink-0 text-[10.5px] font-medium px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 bg-gray-50">
                        {leafLabel(selectedStory.section)}
                      </span>
                    )}
                    {selectedStory.industry && (
                      <span className="shrink-0 text-[10.5px] font-medium px-1.5 py-0.5 rounded border border-cyan-200 text-cyan-700 bg-cyan-50">
                        {selectedStory.industry}
                      </span>
                    )}
                    {multiEdition && <EditionBadge edition={selectedStory.edition} />}
                  </div>
                  <div style={{ fontSize: px(15.5), minHeight: descMinHeight }} className="text-gray-700">
                    {renderSummaryBullets(selectedStory.summary, "text-gray-700")}
                  </div>
                  {selectedStory.page_number != null && (
                    <p className="text-[13px] text-gray-400 mt-2">Page {selectedStory.page_number}</p>
                  )}
                </>
              )}
              {selectedTop && (
                <>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 style={{ fontSize: px(17) }} className="font-semibold text-gray-900 leading-snug">
                      {selectedTop.headline}
                    </h3>
                    <span className="shrink-0 text-[10.5px] font-medium px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 bg-gray-50">
                      {leafLabel(selectedTop.section)}
                    </span>
                    {multiEdition && selectedTop.edition && <EditionBadge edition={selectedTop.edition} />}
                  </div>
                  {selectedTopFull ? (
                    <>
                      <div style={{ fontSize: px(15.5), minHeight: descMinHeight }} className="text-gray-700">
                        {renderSummaryBullets(selectedTopFull.summary, "text-gray-700")}
                      </div>
                      {selectedTopFull.page_number != null && (
                        <p className="text-[13px] text-gray-400 mt-2">Page {selectedTopFull.page_number}</p>
                      )}
                    </>
                  ) : (
                    selectedTop.note && (
                      <div style={{ fontSize: px(15.5), minHeight: descMinHeight }} className="text-gray-700">
                        {renderSummaryBullets(selectedTop.note, "text-gray-700")}
                      </div>
                    )
                  )}
                </>
              )}
              {selectedMarket && (
                <>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 style={{ fontSize: px(17) }} className="font-semibold text-gray-900 leading-snug">
                      {selectedMarket.headline}
                    </h3>
                    <span className="shrink-0 text-[10.5px] font-medium px-1.5 py-0.5 rounded border border-yellow-200 text-yellow-700 bg-yellow-50">
                      {leafLabel(selectedMarket.section)}
                    </span>
                    {multiEdition && selectedMarket.edition && <EditionBadge edition={selectedMarket.edition} />}
                  </div>
                  {selectedMarketFull ? (
                    <>
                      <div style={{ fontSize: px(15.5), minHeight: descMinHeight }} className="text-gray-700">
                        {renderSummaryBullets(selectedMarketFull.summary, "text-gray-700")}
                      </div>
                      {selectedMarketFull.page_number != null && (
                        <p className="text-[13px] text-gray-400 mt-2">Page {selectedMarketFull.page_number}</p>
                      )}
                    </>
                  ) : (
                    selectedMarket.note && (
                      <div style={{ fontSize: px(15.5), minHeight: descMinHeight }} className="text-gray-700">
                        {renderSummaryBullets(selectedMarket.note, "text-gray-700")}
                      </div>
                    )
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
                  <div style={{ fontSize: px(15.5), minHeight: descMinHeight }} className="text-gray-700">
                    {renderSummaryBullets(selectedStock.note, "text-gray-700")}
                  </div>
                </>
              )}

              {/* Mobile-only prev/next — on lg+ the Up/Down arrow-key hint above
                  the section tree already covers this, but on touch devices
                  there's no keyboard, so give readers a thumb-reachable way to
                  move between headlines without scrolling back up to the list. */}
              <div className="lg:hidden flex items-center justify-between gap-2 mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={() => setFocusIndex(Math.max(0, selIndex - 1))}
                  disabled={selIndex === 0}
                  className="flex-1 text-[13px] font-medium px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed active:bg-gray-50 transition-colors"
                >
                  ‹ Previous
                </button>
                <span className="shrink-0 text-[11px] text-gray-400 tabular-nums">
                  {selIndex + 1} / {itemCount}
                </span>
                <button
                  onClick={() => setFocusIndex(Math.min(itemCount - 1, selIndex + 1))}
                  disabled={selIndex >= itemCount - 1}
                  className="flex-1 text-[13px] font-medium px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed active:bg-gray-50 transition-colors"
                >
                  Next ›
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
