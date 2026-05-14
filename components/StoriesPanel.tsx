"use client";

import { useState } from "react";
import StoryCard from "./StoryCard";
import { Cluster, PriceHistory } from "@/lib/queries";

const TABS = [
  { id: "top",       label: "⭐ Top 5" },
  { id: "all",       label: "All" },
  { id: "markets",   label: "📈 Markets" },
  { id: "companies", label: "🏢 Companies" },
  { id: "economy",   label: "🏛 Economy" },
  { id: "macro",     label: "🌐 Macro" },
] as const;

type TabId = typeof TABS[number]["id"];

export default function StoriesPanel({
  stories,
  sparklines,
  totalCount,
}: {
  stories: Cluster[];
  sparklines: Record<string, PriceHistory[]>;
  totalCount: number;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("top");

  // Filter + sort
  let displayed: Cluster[];
  if (activeTab === "top") {
    // Exactly top 5 by importance — most impactful stories only
    displayed = [...stories]
      .sort((a, b) => b.importance_score - a.importance_score)
      .slice(0, 5);
  } else {
    const filtered = activeTab === "all"
      ? stories
      : stories.filter((s) => s.category === activeTab);
    // Chronological — newest first
    displayed = [...filtered].sort(
      (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );
  }

  // Tab counts
  const counts: Record<TabId, number> = {
    top:       Math.min(5, stories.length),
    all:       stories.length,
    markets:   stories.filter((s) => s.category === "markets").length,
    companies: stories.filter((s) => s.category === "companies").length,
    economy:   stories.filter((s) => s.category === "economy").length,
    macro:     stories.filter((s) => s.category === "macro").length,
  };

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-0.5 mb-3">
        {TABS.map((tab) => {
          const count = counts[tab.id];
          if (count === 0) return null;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all duration-150 ${
                active
                  ? "bg-gray-900 border-gray-900 text-white shadow-sm"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900"
              }`}
            >
              {tab.label}
              <span className={`text-[9px] font-bold tabular-nums ${active ? "text-white/60" : "text-gray-400"}`}>
                {count}
              </span>
            </button>
          );
        })}
        <div className="ml-auto shrink-0 text-[10px] text-gray-400 font-medium">
          {totalCount} stories today
        </div>
      </div>

      {/* Stories */}
      {displayed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white py-12 text-center">
          <p className="text-[12px] text-gray-400">No stories in this category today.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
          {displayed.map((story, i) => (
            <StoryCard key={story.id} story={story} index={i} sparklines={sparklines} />
          ))}
        </div>
      )}
    </div>
  );
}
