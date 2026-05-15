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
import CalendarPicker from "@/components/CalendarPicker";
import CountryToggle from "@/components/CountryToggle";
import SectorLegend from "@/components/SectorLegend";

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
  searchParams: Promise<{ date?: string; region?: "india" | "global" }>;
}) {
  const params = await searchParams;
  const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const activeDate = params.date ?? todayIST;
  const region     = params.region === "global" ? "global" : "india";

  const [indiaStrip, globalStrip, indiaStories, globalStories, archiveDays] =
    await Promise.all([
      getMarketStrip("india"),
      getMarketStrip("global"),
      getTopIndiaStories(500, activeDate),
      getTopGlobalStories(500, activeDate),
      getArchiveDays(),
    ]);

  const stories = region === "global" ? globalStories : indiaStories;

  const allTickers = Array.from(new Set(stories.flatMap((s) => s.entities.map((e) => e.ticker))));
  const sparklineData: Record<string, PriceHistory[]> = {};
  await Promise.all(allTickers.map(async (t) => { sparklineData[t] = await getPriceHistory(t); }));

  const status = marketStatus();
  const istTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata", weekday: "short",
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-[#F2F2F7]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center shadow-sm">
                <span className="text-white text-[11px] font-black tracking-tight">FB</span>
              </div>
              <span className="text-[20px] font-black tracking-tight text-gray-900">
                Fin<span className="text-amber-500">Brief</span>
              </span>
            </div>
            <div className="hidden md:block w-px h-5 bg-gray-200" />
            <span className="hidden md:block text-[13px] text-gray-400 font-medium">
              Financial Intelligence
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[13px] text-gray-400 hidden sm:block">{istTime} IST</span>
            <span className={`inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-full border ${
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

      {/* ── Market strips: India + Global ──────────────────────────────────── */}
      <MarketStrip tickers={indiaStrip}  label="🇮🇳 India" />
      <MarketStrip tickers={globalStrip} label="🌍 Global" />

      <main className="mx-auto max-w-7xl px-4 py-5">
        {/* Top bar: country + story count + calendar */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <CountryToggle region={region} activeDate={activeDate} />
          <span className="text-[14px] text-gray-500 font-medium">
            {stories.length} stories
          </span>
          <div className="ml-auto">
            <CalendarPicker days={archiveDays} activeDate={activeDate} />
          </div>
        </div>

        {stories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center shadow-sm">
            <p className="text-3xl mb-3">📰</p>
            <p className="text-[15px] text-gray-400">
              {activeDate === todayIST
                ? "No stories yet — pipeline runs every 15 min."
                : `No ${region === "global" ? "global" : "India"} stories on ${activeDate}.`}
            </p>
          </div>
        ) : (
          <>
            <StoriesPanel stories={stories} sparklines={sparklineData} />
            <SectorLegend />
          </>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="mt-12 border-t border-gray-200 bg-white px-4 py-5">
        <div className="mx-auto max-w-7xl flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gray-900 flex items-center justify-center">
              <span className="text-white text-[8px] font-black">FB</span>
            </div>
            <span className="text-[13px] text-gray-400 font-medium">
              FinBrief · Prices delayed · Not investment advice
            </span>
          </div>
          <span className="text-[13px] text-gray-300">
            Sources: ET · Livemint · BusinessLine · NDTV Profit · CNBC · FT · MarketWatch
          </span>
        </div>
      </footer>

    </div>
  );
}
