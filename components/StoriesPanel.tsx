"use client";

import { useState, useMemo } from "react";
import { Cluster, PriceHistory } from "@/lib/queries";
import { SUPER_GROUPS, SECTOR_TO_GROUP, GROUP_EMOJI, NON_COMPANY } from "@/lib/sectors";
import SparklineWrapper from "./SparklineWrapper";

const CATEGORY_TABS = [
  { id: "all",       label: "All" },
  { id: "markets",   label: "📈 Markets" },
  { id: "companies", label: "🏢 Companies" },
  { id: "economy",   label: "🏛 Economy" },
  { id: "macro",     label: "🌐 Macro" },
] as const;

type CategoryTabId = typeof CATEGORY_TABS[number]["id"];

function timeStr(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit",
  });
}
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const CAT_COLOR: Record<string, string> = {
  markets:   "bg-blue-400",
  economy:   "bg-amber-400",
  companies: "bg-violet-400",
  macro:     "bg-teal-400",
};

export default function StoriesPanel({
  stories,
  sparklines,
}: {
  stories: Cluster[];
  sparklines: Record<string, PriceHistory[]>;
}) {
  const [activeCat, setActiveCat]   = useState<CategoryTabId>("all");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Super-group counts (each story counted once per group, even if multi-sector)
  const groupCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of stories) {
      if (s.category !== "companies") continue;
      const seen = new Set<string>();
      for (const e of s.entities) {
        const sec = e.sector;
        if (!sec || NON_COMPANY.has(sec)) continue;
        const g = SECTOR_TO_GROUP[sec];
        if (!g || seen.has(g)) continue;
        seen.add(g);
        m[g] = (m[g] ?? 0) + 1;
      }
    }
    return m;
  }, [stories]);

  // Apply category filter — strict category match, counts always add up
  let filtered: Cluster[];
  if (activeCat === "all") {
    filtered = stories;
  } else {
    filtered = stories.filter((s) => s.category === activeCat);
  }
  if (activeGroup) {
    const groupSectors = new Set(SUPER_GROUPS[activeGroup] ?? []);
    filtered = filtered.filter((s) => s.entities.some((e) => e.sector && groupSectors.has(e.sector)));
  }
  // Always newest-first
  filtered = [...filtered].sort(
    (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );

  // Counts add up exactly to total
  const catCounts: Record<CategoryTabId, number> = {
    all:       stories.length,
    markets:   stories.filter((s) => s.category === "markets").length,
    companies: stories.filter((s) => s.category === "companies").length,
    economy:   stories.filter((s) => s.category === "economy").length,
    macro:     stories.filter((s) => s.category === "macro").length,
  };

  // Split into 2 columns for at-a-glance view (chronological, alternating)
  const colA: Cluster[] = [];
  const colB: Cluster[] = [];
  filtered.forEach((s, i) => (i % 2 === 0 ? colA : colB).push(s));

  return (
    <div>
      {/* Sticky tab bar — fully opaque so news doesn't show through */}
      <div className="sticky top-[60px] z-10 bg-[#F2F2F7] pt-2 pb-3 -mx-4 px-4 mb-3 border-b border-gray-200 shadow-[0_4px_8px_-4px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide mb-2">
          {CATEGORY_TABS.map((tab) => {
            const count = catCounts[tab.id];
            const active = activeCat === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveCat(tab.id); setActiveGroup(null); setExpandedId(null); }}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[14px] sm:text-[13px] font-semibold border transition-all duration-150 ${
                  active
                    ? "bg-gray-900 border-gray-900 text-white shadow-sm"
                    : "bg-white border-gray-200 text-gray-700 hover:border-gray-400 hover:text-gray-900"
                }`}
              >
                {tab.label}
                <span className={`text-[12px] sm:text-[11px] font-bold tabular-nums ${active ? "text-white/60" : "text-gray-400"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {activeCat === "companies" && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            <span className="shrink-0 text-[11px] font-black tracking-[0.15em] text-gray-400 uppercase mr-1">
              Group
            </span>
            <button
              onClick={() => setActiveGroup(null)}
              className={`shrink-0 px-3 py-1 rounded-full text-[13px] sm:text-[12px] font-medium border transition-colors ${
                activeGroup === null
                  ? "bg-gray-900 border-gray-900 text-white"
                  : "bg-white border-gray-200 text-gray-600 hover:text-gray-900"
              }`}
            >
              All
            </button>
            {Object.keys(SUPER_GROUPS).map((group) => {
              const n = groupCounts[group] ?? 0;
              if (n === 0) return null;
              const active = activeGroup === group;
              return (
                <button
                  key={group}
                  onClick={() => setActiveGroup(active ? null : group)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] sm:text-[12px] font-medium border transition-colors ${
                    active
                      ? "bg-gray-900 border-gray-900 text-white"
                      : "bg-white border-gray-200 text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <span>{GROUP_EMOJI[group]}</span>
                  <span>{group}</span>
                  <span className={`text-[11px] font-bold tabular-nums ${active ? "text-white/60" : "text-gray-400"}`}>{n}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white py-12 text-center">
          <p className="text-[14px] text-gray-400">No stories match these filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl bg-white border border-gray-200 overflow-hidden divide-y divide-gray-100">
            {colA.map((s) => (
              <StoryRow key={s.id} story={s} sparklines={sparklines}
                expanded={expandedId === s.id}
                onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)} />
            ))}
          </div>
          <div className="rounded-xl bg-white border border-gray-200 overflow-hidden divide-y divide-gray-100">
            {colB.map((s) => (
              <StoryRow key={s.id} story={s} sparklines={sparklines}
                expanded={expandedId === s.id}
                onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Story row with inline expansion ─────────────────────────────────── */
function StoryRow({
  story,
  sparklines,
  expanded,
  onToggle,
}: {
  story: Cluster;
  sparklines: Record<string, PriceHistory[]>;
  expanded: boolean;
  onToggle: () => void;
}) {
  const lead = story.entities[0];
  const since = lead ? Number(lead.price_change_pct ?? 0) : 0;
  const sup = lead?.direction === "up", sdn = lead?.direction === "down";

  return (
    <div>
      <button
        onClick={onToggle}
        className={`group w-full text-left px-4 py-3 sm:py-2.5 transition-colors flex items-start gap-2.5 ${
          expanded ? "bg-amber-50/40" : "hover:bg-gray-50 active:bg-gray-100"
        }`}
      >
        <span className={`mt-2 shrink-0 w-2.5 h-2.5 rounded-full ${CAT_COLOR[story.category] ?? "bg-gray-300"}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <h3 className={`flex-1 text-[16px] sm:text-[15px] font-semibold leading-snug tracking-tight transition-colors ${
              expanded ? "text-blue-700" : "text-gray-900 group-hover:text-blue-700"
            }`}>
              {story.headline}
            </h3>
            <span className="shrink-0 text-[12px] sm:text-[11px] text-gray-400 font-medium tabular-nums whitespace-nowrap pt-1">
              {timeStr(story.published_at)} · {timeAgo(story.published_at)}
            </span>
          </div>

          {lead && (
            <div className="flex items-center gap-2 flex-wrap mt-1.5">
              <span className={`inline-flex items-center gap-1.5 text-[12px] sm:text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                sup ? "bg-emerald-50 text-emerald-700"
                    : sdn ? "bg-red-50 text-red-600"
                          : "bg-gray-50 text-gray-500"
              }`}>
                {lead.company_name}
                {since !== 0 && (
                  <span className="font-bold">{sup ? "▲" : "▼"}{Math.abs(since).toFixed(1)}%</span>
                )}
                {lead.price_change_1w_pct !== null && lead.price_change_1w_pct !== undefined && (
                  <span className="text-gray-400 font-normal ml-0.5">
                    1W{" "}
                    <span className={`font-bold ${
                      Number(lead.price_change_1w_pct) > 0.1 ? "text-emerald-600"
                      : Number(lead.price_change_1w_pct) < -0.1 ? "text-red-500"
                      : "text-gray-400"
                    }`}>
                      {Number(lead.price_change_1w_pct) > 0 ? "+" : ""}
                      {Number(lead.price_change_1w_pct).toFixed(1)}%
                    </span>
                  </span>
                )}
              </span>
              {story.entities.length > 1 && (
                <span className="text-[12px] sm:text-[11px] text-gray-400 font-medium">+{story.entities.length - 1}</span>
              )}
            </div>
          )}
        </div>
        <svg className={`shrink-0 w-4 h-4 text-gray-300 mt-1 transition-transform ${expanded ? "rotate-90" : ""}`}
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 bg-amber-50/20 border-t border-amber-100">
          <p className="text-[15px] sm:text-[14px] text-gray-700 leading-relaxed mb-4">{story.summary}</p>

          {story.entities.length > 0 && (
            <div className="space-y-2 mb-4">
              {story.entities.map((e) => {
                const sn = Number(e.price_change_pct ?? 0);
                const u = e.direction === "up", d = e.direction === "down";
                return (
                  <div key={e.ticker} className="flex items-center gap-2 text-[13px] sm:text-[12px] flex-wrap">
                    <span className="font-bold text-gray-800 min-w-[120px]">{e.company_name}</span>
                    {e.sector && !NON_COMPANY.has(e.sector) && (
                      <span className="text-[11px] font-medium text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded">
                        {e.sector}
                      </span>
                    )}
                    <span className="flex items-center gap-2 ml-auto font-mono tabular-nums">
                      <span className={`${u ? "text-emerald-600" : d ? "text-red-500" : "text-gray-400"} font-bold`}>
                        {sn === 0 ? "0.0%" : `${u ? "+" : ""}${sn.toFixed(2)}%`}
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-400">1W</span>
                      <span className={`font-bold ${
                        e.price_change_1w_pct == null ? "text-gray-300"
                        : Number(e.price_change_1w_pct) > 0.1 ? "text-emerald-600"
                        : Number(e.price_change_1w_pct) < -0.1 ? "text-red-500"
                        : "text-gray-400"
                      }`}>
                        {e.price_change_1w_pct == null ? "—"
                         : `${Number(e.price_change_1w_pct) > 0 ? "+" : ""}${Number(e.price_change_1w_pct).toFixed(1)}%`}
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-400">1M</span>
                      <span className={`font-bold ${
                        e.price_change_1m_pct == null ? "text-gray-300"
                        : Number(e.price_change_1m_pct) > 0.1 ? "text-emerald-600"
                        : Number(e.price_change_1m_pct) < -0.1 ? "text-red-500"
                        : "text-gray-400"
                      }`}>
                        {e.price_change_1m_pct == null ? "—"
                         : `${Number(e.price_change_1m_pct) > 0 ? "+" : ""}${Number(e.price_change_1m_pct).toFixed(1)}%`}
                      </span>
                      {sparklines[e.ticker]?.length > 1 && (
                        <SparklineWrapper data={sparklines[e.ticker]} positive={e.direction !== "down"} />
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {story.sources?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {story.sources.slice(0, 5).map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[12px] text-gray-500 hover:text-blue-600 transition-colors"
                >
                  {s.source.replace(/_/g, " ")}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
