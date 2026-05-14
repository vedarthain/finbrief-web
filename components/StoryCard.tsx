import { Cluster, PriceHistory } from "@/lib/queries";
import TickerChip from "./TickerChip";
import SparklineWrapper from "./SparklineWrapper";

const CATEGORY_STYLE: Record<string, string> = {
  markets:   "text-blue-600 bg-blue-50 border-blue-200",
  economy:   "text-amber-700 bg-amber-50 border-amber-200",
  companies: "text-violet-600 bg-violet-50 border-violet-200",
  macro:     "text-teal-600 bg-teal-50 border-teal-200",
};

function accentBorder(score: number): string {
  if (score >= 88) return "border-l-amber-400";
  if (score >= 72) return "border-l-blue-300";
  return "border-l-gray-200";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function StoryCard({
  story,
  index,
  sparklines,
}: {
  story: Cluster;
  index: number;
  sparklines: Record<string, PriceHistory[]>;
}) {
  const catStyle = CATEGORY_STYLE[story.category] ?? "text-gray-500 bg-gray-50 border-gray-200";
  const accent   = accentBorder(story.importance_score);

  return (
    <article className={`
      group relative border-l-[3px] ${accent}
      bg-white hover:bg-gray-50/60
      border-b border-gray-100 last:border-b-0
      px-5 py-4 transition-colors duration-150
    `}>
      <div className="flex items-start gap-3">

        {/* Story number */}
        <span className="shrink-0 mt-1 w-5 text-right text-[13px] font-black text-gray-300 select-none tabular-nums">
          {index + 1}
        </span>

        <div className="flex-1 min-w-0">

          {/* Meta row */}
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className={`text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-full border ${catStyle}`}>
              {story.category}
            </span>
            <span className="text-[10px] text-gray-400 ml-auto font-medium tabular-nums">
              {timeAgo(story.published_at)}
            </span>
          </div>

          {/* Headline */}
          <h2 className="text-[14px] font-bold text-gray-900 leading-snug mb-1.5 tracking-tight">
            {story.headline}
          </h2>

          {/* Summary */}
          <p className="text-[12.5px] text-gray-500 leading-relaxed mb-2.5">
            {story.summary}
          </p>

          {/* Ticker chips + sparklines */}
          {story.entities.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              {story.entities.map((e) => (
                <div key={e.ticker} className="flex items-center gap-1">
                  <TickerChip entity={e} />
                  {sparklines[e.ticker]?.length > 1 && (
                    <SparklineWrapper
                      data={sparklines[e.ticker]}
                      positive={e.direction !== "down"}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Source links */}
          {story.sources?.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {story.sources.slice(0, 3).map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  {s.source.replace(/_/g, " ")}
                </a>
              ))}
            </div>
          )}

        </div>
      </div>
    </article>
  );
}
