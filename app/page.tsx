import {
  getTopIndiaStories,
  getTopGlobalStories,
  getMarketStrip,
  getPriceHistory,
  getArchiveDays,
  PriceHistory,
} from "@/lib/queries";
import MarketStrip from "@/components/MarketStrip";
import StoriesPanel from "@/components/StoriesPanel";
import DateNav from "@/components/DateNav";

export const revalidate = 300;

function marketStatus(): { label: string; live: boolean } {
  const ist = new Date(Date.now() + 5.5 * 3600000);
  const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  const open = 9 * 60 + 15, close = 15 * 60 + 30;
  if (mins >= open && mins < close) return { label: "Market Open", live: true };
  if (mins < open) {
    const d = open - mins;
    return { label: `Opens in ${Math.floor(d / 60)}h ${d % 60}m`, live: false };
  }
  return { label: "Market Closed", live: false };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const activeDate = params.date ?? todayIST;

  const [indiaStrip, globalStrip, indiaStories, globalStories, archiveDays] =
    await Promise.all([
      getMarketStrip("india"),
      getMarketStrip("global"),
      getTopIndiaStories(50, activeDate),
      getTopGlobalStories(20, activeDate),
      getArchiveDays(),
    ]);

  const allTickers = Array.from(new Set([
    ...indiaStories.flatMap((s) => s.entities.map((e) => e.ticker)),
    ...globalStories.flatMap((s) => s.entities.map((e) => e.ticker)),
  ]));
  const sparklineData: Record<string, PriceHistory[]> = {};
  await Promise.all(allTickers.map(async (t) => { sparklineData[t] = await getPriceHistory(t); }));

  const status = marketStatus();
  const istTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata", weekday: "short",
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-[#F2F2F7] overflow-x-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center shadow-sm">
                <span className="text-white text-[11px] font-black tracking-tight">FB</span>
              </div>
              <div>
                <span className="text-[17px] font-black tracking-tight text-gray-900">
                  Fin<span className="text-amber-500">Brief</span>
                </span>
              </div>
            </div>
            <div className="hidden md:block w-px h-5 bg-gray-200" />
            <span className="hidden md:block text-[11px] text-gray-400 font-medium">
              India Financial Intelligence
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-gray-400 hidden sm:block">{istTime} IST</span>
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border ${
              status.live
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-gray-50 border-gray-200 text-gray-500"
            }`}>
              {status.live && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
              {status.label}
            </span>
          </div>
        </div>
      </header>

      {/* ── India market strip ───────────────────────────────────────────────── */}
      <MarketStrip tickers={indiaStrip} label="🇮🇳 India" />

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="xl:grid xl:grid-cols-[1fr_300px] xl:gap-6 lg:grid lg:grid-cols-[1fr_260px] lg:gap-4 min-w-0">

          {/* ── LEFT: India stories ─────────────────────────────────────────── */}
          <section className="min-w-0">
            {/* Header + date nav */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-[11px] font-black tracking-[0.18em] uppercase text-gray-900">
                  🇮🇳 Before the Bell
                </h1>
                <span className="text-[11px] text-gray-400 font-medium">
                  {activeDate === todayIST ? "Today" : activeDate}
                </span>
              </div>
              <DateNav days={archiveDays} activeDate={activeDate} />
            </div>

            {indiaStories.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center shadow-sm">
                <p className="text-3xl mb-3">📰</p>
                <p className="text-[13px] text-gray-400">
                  {activeDate === todayIST
                    ? "No stories yet — run python main.py to populate."
                    : `No India stories on ${activeDate}.`}
                </p>
              </div>
            ) : (
              <StoriesPanel
                stories={indiaStories}
                sparklines={sparklineData}
                totalCount={indiaStories.length}
              />
            )}
          </section>

          {/* ── RIGHT: Global sidebar ─────────────────────────────────────── */}
          <aside className="mt-8 lg:mt-0 space-y-5 min-w-0">

            {/* Global market numbers */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <span className="text-[11px] font-black tracking-[0.15em] uppercase text-gray-500">
                  🌍 Global Overnight
                </span>
              </div>
              <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-3">
                {globalStrip.map((t) => {
                  const price = Number(t.price);
                  const chg   = Number(t.change_pct);
                  const up = chg > 0, dn = chg < 0;
                  const GL: Record<string, string> = {
                    "^GSPC":"S&P 500","^IXIC":"Nasdaq","^HSI":"Hang Seng",
                    "^N225":"Nikkei","GC=F":"Gold","CL=F":"WTI","BZ=F":"Brent",
                  };
                  return (
                    <div key={t.ticker}>
                      <p className="text-[10px] text-gray-400 font-medium mb-0.5">{GL[t.ticker] ?? t.ticker}</p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[13px] font-mono font-bold text-gray-900">
                          {price >= 1000
                            ? price.toLocaleString("en-US", { maximumFractionDigits: 0 })
                            : price.toFixed(2)}
                        </span>
                        <span className={`text-[11px] font-mono font-bold ${up ? "text-emerald-600" : dn ? "text-red-500" : "text-gray-400"}`}>
                          {up ? "▲" : dn ? "▼" : "–"}{Math.abs(chg).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Global stories */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <span className="text-[11px] font-black tracking-[0.15em] uppercase text-gray-500">
                  Global → India Impact
                </span>
              </div>
              {globalStories.length === 0 ? (
                <p className="px-4 py-8 text-[12px] text-gray-400 text-center">No global stories for this date.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {globalStories.map((story) => (
                    <div key={story.id} className="px-4 py-3.5 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-full border ${
                          story.category === "macro"
                            ? "border-teal-200 bg-teal-50 text-teal-600"
                            : "border-gray-200 bg-gray-50 text-gray-500"
                        }`}>
                          {story.category}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-auto">
                          {new Date(story.published_at).toLocaleTimeString("en-IN", {
                            timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-[13px] font-semibold text-gray-800 leading-snug mb-1.5 tracking-tight">
                        {story.headline}
                      </p>
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        {story.summary}
                      </p>
                      {story.entities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {story.entities.map((e) => (
                            <span key={e.ticker} className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border ${
                              e.direction === "up"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : e.direction === "down"
                                ? "border-red-200 bg-red-50 text-red-600"
                                : "border-gray-200 bg-gray-50 text-gray-500"
                            }`}>
                              {e.company_name}
                              {Number(e.price_change_pct) !== 0 &&
                                ` ${e.direction === "up" ? "▲" : "▼"}${Math.abs(Number(e.price_change_pct)).toFixed(1)}%`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </aside>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="mt-12 border-t border-gray-200 bg-white px-4 py-5">
        <div className="mx-auto max-w-6xl flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gray-900 flex items-center justify-center">
              <span className="text-white text-[8px] font-black">FB</span>
            </div>
            <span className="text-[11px] text-gray-400 font-medium">
              FinBrief · Prices delayed · Not investment advice
            </span>
          </div>
          <span className="text-[11px] text-gray-300">
            Sources: ET · Livemint · BusinessLine · NDTV Profit · Zee Biz · CNBC · FT
          </span>
        </div>
      </footer>

    </div>
  );
}

