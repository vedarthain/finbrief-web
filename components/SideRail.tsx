import { TopStory, MarketImpactStory, StockInFocus } from "@/lib/queries";

// The three arrays here are already fetched by app/page.tsx for the main
// PaperTree tabs — these rails just give them a second, glanceable home in
// the flat #F2F3F8 gutters that otherwise sit empty outside the max-w-7xl
// column on wide (2xl+) monitors. Deliberately read-only (no click-through
// into PaperTree's activeLeaf state, which lives in a separate client
// component) — a quick-glance digest, not a duplicate interactive nav.

function RailCard({
  title,
  colorClass,
  children,
}: {
  title: string;
  colorClass: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-white border border-gray-200 overflow-hidden">
      <div className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-wide border-b border-gray-100 ${colorClass}`}>
        {title}
      </div>
      <div className="divide-y divide-gray-100 max-h-[calc(100vh-11rem)] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

function RailRow({ headline, meta }: { headline: string; meta?: string }) {
  return (
    <div className="px-3 py-2.5">
      <p className="text-[12px] font-medium text-gray-800 leading-snug">{headline}</p>
      {meta && <p className="text-[10.5px] text-gray-400 mt-0.5">{meta}</p>}
    </div>
  );
}

export function TopStoriesRail({ stories }: { stories: TopStory[] }) {
  if (stories.length === 0) return null;
  return (
    <RailCard title="Top Stories" colorClass="text-red-700 bg-red-50">
      {stories.slice(0, 12).map((s, i) => (
        <RailRow key={i} headline={s.headline} meta={s.section} />
      ))}
    </RailCard>
  );
}

export function MarketImpactRail({ stories }: { stories: MarketImpactStory[] }) {
  if (stories.length === 0) return null;
  return (
    <RailCard title="Market Impact" colorClass="text-yellow-700 bg-yellow-50">
      {stories.slice(0, 8).map((s, i) => (
        <RailRow key={i} headline={s.headline} meta={s.section} />
      ))}
    </RailCard>
  );
}

export function StocksInFocusRail({ stocks }: { stocks: StockInFocus[] }) {
  if (stocks.length === 0) return null;
  return (
    <RailCard title="Stocks in Focus" colorClass="text-emerald-700 bg-emerald-50">
      {stocks.slice(0, 8).map((s, i) => (
        <RailRow key={i} headline={s.name} meta={s.note} />
      ))}
    </RailCard>
  );
}
