"use client";

import { useEffect } from "react";
import { Cluster, PriceHistory } from "@/lib/queries";
import SparklineWrapper from "./SparklineWrapper";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function PerfRow({ label, value }: { label: string; value: number | null | undefined }) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  const up = n > 0.1, dn = n < -0.1;
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-gray-400">{label}</span>
      <span className={`font-mono font-bold tabular-nums ${up ? "text-emerald-600" : dn ? "text-red-500" : "text-gray-400"}`}>
        {up ? "+" : ""}{n.toFixed(2)}%
      </span>
    </div>
  );
}

const CATEGORY_STYLE: Record<string, string> = {
  markets:   "text-blue-700 bg-blue-50",
  economy:   "text-amber-700 bg-amber-50",
  companies: "text-violet-700 bg-violet-50",
  macro:     "text-teal-700 bg-teal-50",
};

export default function StoryDrawer({
  story,
  sparklines,
  onClose,
}: {
  story: Cluster | null;
  sparklines: Record<string, PriceHistory[]>;
  onClose: () => void;
}) {
  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (story) document.body.style.overflow = "hidden";
    else        document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [story]);

  if (!story) return null;

  const cat = CATEGORY_STYLE[story.category] ?? "text-gray-600 bg-gray-50";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-30 bg-gray-900/30 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 bottom-0 z-40 w-full sm:w-[520px] bg-white shadow-2xl flex flex-col animate-[slideIn_0.2s_ease-out]">
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-200 sticky top-0 bg-white">
          <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded ${cat}`}>
            {story.category}
          </span>
          {story.importance_score >= 88 && (
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-amber-100 text-amber-700">
              ★ Top
            </span>
          )}
          <span className="text-[11px] text-gray-400 ml-auto">{timeAgo(story.published_at)}</span>
          <button
            onClick={onClose}
            className="ml-2 w-7 h-7 inline-flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <h1 className="text-[22px] font-black text-gray-900 leading-tight tracking-tight mb-3">
            {story.headline}
          </h1>
          <p className="text-[14.5px] text-gray-700 leading-relaxed mb-6 whitespace-pre-line">
            {story.summary}
          </p>

          {/* Entities + performance */}
          {story.entities.length > 0 && (
            <div className="mb-6">
              <h3 className="text-[10px] font-black tracking-[0.18em] uppercase text-gray-400 mb-3">
                Stocks impacted
              </h3>
              <div className="space-y-2">
                {story.entities.map((e) => {
                  const since = Number(e.price_change_pct ?? 0);
                  const w     = e.price_change_1w_pct;
                  const m     = e.price_change_1m_pct;
                  const up = e.direction === "up", dn = e.direction === "down";
                  return (
                    <div key={e.ticker} className="rounded-lg border border-gray-150 bg-gray-50/40 px-3 py-2.5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[13px] font-bold text-gray-900">{e.company_name}</span>
                        <span className="text-[10px] font-mono text-gray-400 uppercase">{e.ticker}</span>
                        {e.sector && (
                          <span className="ml-auto text-[10px] font-medium text-gray-500 bg-white border border-gray-200 px-1.5 py-0.5 rounded">
                            {e.sector}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-[10px] text-gray-400 mb-0.5">Since news</p>
                          <p className={`text-[13px] font-mono font-bold tabular-nums ${
                            up ? "text-emerald-600" : dn ? "text-red-500" : "text-gray-400"
                          }`}>
                            {since === 0 ? "0.0%" : `${up ? "+" : ""}${since.toFixed(2)}%`}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 mb-0.5">1 week</p>
                          {w !== null && w !== undefined ? (
                            <p className={`text-[13px] font-mono font-bold tabular-nums ${
                              Number(w) > 0.1 ? "text-emerald-600" : Number(w) < -0.1 ? "text-red-500" : "text-gray-400"
                            }`}>
                              {Number(w) > 0 ? "+" : ""}{Number(w).toFixed(2)}%
                            </p>
                          ) : (
                            <p className="text-[13px] font-mono text-gray-300">—</p>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 mb-0.5">1 month</p>
                          {m !== null && m !== undefined ? (
                            <p className={`text-[13px] font-mono font-bold tabular-nums ${
                              Number(m) > 0.1 ? "text-emerald-600" : Number(m) < -0.1 ? "text-red-500" : "text-gray-400"
                            }`}>
                              {Number(m) > 0 ? "+" : ""}{Number(m).toFixed(2)}%
                            </p>
                          ) : (
                            <p className="text-[13px] font-mono text-gray-300">—</p>
                          )}
                        </div>
                      </div>
                      {sparklines[e.ticker]?.length > 1 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">24h</span>
                            <SparklineWrapper data={sparklines[e.ticker]} positive={e.direction !== "down"} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sources */}
          {story.sources?.length > 0 && (
            <div>
              <h3 className="text-[10px] font-black tracking-[0.18em] uppercase text-gray-400 mb-2">
                Sources ({story.sources.length})
              </h3>
              <div className="space-y-1.5">
                {story.sources.map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[12.5px] text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded transition-colors"
                  >
                    <svg className="w-3 h-3 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    <span className="font-medium">{s.source.replace(/_/g, " ")}</span>
                    <span className="ml-auto text-[10px] text-gray-400 truncate max-w-[280px]">
                      {new URL(s.url).hostname.replace("www.", "")}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
