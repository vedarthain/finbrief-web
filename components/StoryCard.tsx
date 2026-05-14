import { Cluster, PriceHistory } from "@/lib/queries";
import SparklineWrapper from "./SparklineWrapper";

const CATEGORY_STYLE: Record<string, string> = {
  markets:   "text-blue-600 bg-blue-50",
  economy:   "text-amber-700 bg-amber-50",
  companies: "text-violet-600 bg-violet-50",
  macro:     "text-teal-600 bg-teal-50",
};

function accent(score: number): string {
  if (score >= 88) return "before:bg-amber-400";
  if (score >= 72) return "before:bg-blue-400";
  return "before:bg-gray-200";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function PctBadge({ label, pct }: { label: string; pct: number | null | undefined }) {
  if (pct === null || pct === undefined) return null;
  const n = Number(pct);
  if (Number.isNaN(n)) return null;
  const up = n > 0.1, dn = n < -0.1;
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-mono tabular-nums">
      <span className="text-gray-400">{label}</span>
      <span className={`font-bold ${up ? "text-emerald-600" : dn ? "text-red-500" : "text-gray-400"}`}>
        {up ? "+" : ""}{n.toFixed(1)}%
      </span>
    </span>
  );
}

export default function StoryCard({
  story,
  sparklines,
}: {
  story: Cluster;
  sparklines: Record<string, PriceHistory[]>;
  variant?: "compact" | "hero";
}) {
  const cat = CATEGORY_STYLE[story.category] ?? "text-gray-500 bg-gray-50";
  const topEntity = story.entities[0];
  const firstSource = story.sources?.[0];

  return (
    <article className={`
      relative rounded-xl bg-white border border-gray-150
      hover:border-gray-300 hover:shadow-md
      p-4 transition-all duration-150 overflow-hidden h-full flex flex-col
      before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] ${accent(story.importance_score)}
    `}>
      {/* Meta */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded ${cat}`}>
          {story.category}
        </span>
        {story.importance_score >= 88 && (
          <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
            ★
          </span>
        )}
        <span className="text-[11px] text-gray-400 ml-auto tabular-nums shrink-0">
          {timeAgo(story.published_at)} ago
        </span>
      </div>

      {/* Headline */}
      <h3 className="text-[15px] font-bold text-gray-900 leading-snug mb-2 tracking-tight line-clamp-3">
        {story.headline}
      </h3>

      {/* Summary */}
      <p className="text-[13px] text-gray-600 leading-relaxed mb-3 line-clamp-3 flex-1">
        {story.summary}
      </p>

      {/* Top entity — name, since-news %, 1W %, sparkline */}
      {topEntity && (
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
            topEntity.direction === "up"   ? "bg-emerald-50 text-emerald-700"
              : topEntity.direction === "down" ? "bg-red-50 text-red-600"
                : "bg-gray-50 text-gray-500"
          }`}>
            {topEntity.company_name}
            {Number(topEntity.price_change_pct) !== 0 && (
              <span className="font-bold">
                {topEntity.direction === "up" ? "▲" : "▼"}
                {Math.abs(Number(topEntity.price_change_pct)).toFixed(1)}%
              </span>
            )}
          </span>
          <PctBadge label="1W" pct={topEntity.price_change_1w_pct} />
          {sparklines[topEntity.ticker]?.length > 1 && (
            <SparklineWrapper data={sparklines[topEntity.ticker]} positive={topEntity.direction !== "down"} />
          )}
        </div>
      )}

      {/* More entities (compact) */}
      {story.entities.length > 1 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {story.entities.slice(1, 4).map((e) => {
            const pct = Number(e.price_change_pct ?? 0);
            const up = e.direction === "up", dn = e.direction === "down";
            return (
              <span key={e.ticker} className={`inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded ${
                up ? "bg-emerald-50 text-emerald-700"
                   : dn ? "bg-red-50 text-red-600"
                        : "bg-gray-50 text-gray-500"
              }`}>
                {e.company_name}
                {pct !== 0 && (
                  <span className="font-bold">{up ? "▲" : "▼"}{Math.abs(pct).toFixed(1)}%</span>
                )}
              </span>
            );
          })}
          {story.entities.length > 4 && (
            <span className="text-[10px] text-gray-400 font-medium px-1">+{story.entities.length - 4}</span>
          )}
        </div>
      )}

      {/* Source */}
      {firstSource && (
        <a
          href={firstSource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10.5px] text-gray-400 hover:text-blue-600 transition-colors mt-auto"
        >
          {firstSource.source.replace(/_/g, " ")}
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </a>
      )}
    </article>
  );
}
