import { unstable_cache } from "next/cache";
import { getPaperStories, getPaperDays, getStocksInFocus, getTopStories, getMarketImpactStories } from "@/lib/queries";
import PaperTree from "@/components/PaperTree";
import NavTabs from "@/components/NavTabs";
import DatePicker from "@/components/DatePicker";
import { TopStoriesRail, MarketImpactRail, StocksInFocusRail } from "@/components/SideRail";

export const revalidate = 300;

// Reading `searchParams` below makes this route fully dynamic — Next.js skips
// ISR entirely for dynamic routes, so `revalidate` above has no effect on its
// own and every request would otherwise hit Postgres live. Wrap the queries
// in unstable_cache (keyed on their args) so repeat requests for the same
// date/edition reuse a cached result for 5 minutes instead.
const cachedGetPaperStories = unstable_cache(getPaperStories, ["paper-stories"], { revalidate: 300 });
const cachedGetPaperDays = unstable_cache(getPaperDays, ["paper-days"], { revalidate: 300 });
const cachedGetStocksInFocus = unstable_cache(getStocksInFocus, ["stocks-in-focus"], { revalidate: 300 });
const cachedGetTopStories = unstable_cache(getTopStories, ["top-stories"], { revalidate: 300 });
const cachedGetMarketImpactStories = unstable_cache(getMarketImpactStories, ["market-impact-stories"], { revalidate: 300 });

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; edition?: string }>;
}) {
  const params = await searchParams;
  const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const activeDate = params.date ?? todayIST;

  const [stories, days, stocksInFocus, topStories, marketImpactStories] = await Promise.all([
    cachedGetPaperStories(activeDate, params.edition),
    cachedGetPaperDays(),
    cachedGetStocksInFocus(activeDate, params.edition),
    cachedGetTopStories(activeDate, params.edition),
    cachedGetMarketImpactStories(activeDate, params.edition),
  ]);

  const bySection = stories.reduce<Record<string, typeof stories>>((acc, s) => {
    (acc[s.section] ??= []).push(s);
    return acc;
  }, {});

  const noticeCount = stories.filter((s) => s.is_notice).length;
  const visibleCount = stories.length - noticeCount;


  return (
    <div className="min-h-screen bg-[#F2F3F8]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-[#E3E6ED]">
        <div className="mx-auto max-w-[1800px] px-4 py-2 flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#182131] flex items-center justify-center shadow-sm shrink-0">
              <span className="text-white text-[11px] font-bold tracking-tight">FB</span>
            </div>
            <span className="text-[19px] font-bold tracking-tight text-gray-900 whitespace-nowrap">
              Fin<span className="text-amber-500">Brief</span>
            </span>
          </div>
          <NavTabs />
          <DatePicker activeDate={activeDate} availableDates={days.map((d) => d.date)} />
          {/* PaperTree portals its search/ribbon-tab/text-size controls in here so
              they share this one header line instead of a separate row below.
              The search box carries ml-auto so it lands at the far right,
              where the IST clock used to sit. */}
          <div id="paper-toolbar-slot" className="flex items-center gap-2.5 flex-1 min-w-0 flex-wrap" />
        </div>
      </header>

      {/* mx-auto max-w-[1800px] + a 3-column grid, but the side columns only turn
          on at 2xl (≥1536px). Below that this collapses to the single center
          column exactly as before (grid-cols-1, side <aside>s hidden) — no
          layout change on laptop/tablet. On wide monitors the flat #F2F3F8
          gutters outside the old max-w-7xl column get a glanceable digest
          (Top Stories / Market Impact / Stocks in Focus) instead of sitting
          empty; center column width (minmax(0,1280px) = 80rem) matches the
          previous max-w-7xl exactly, so the reading column itself is unchanged. */}
      <div className="mx-auto max-w-[1800px] px-4 py-3 grid grid-cols-1 2xl:grid-cols-[240px_minmax(0,1280px)_240px] gap-4 justify-center">
        <aside className="hidden 2xl:flex flex-col gap-3 2xl:sticky 2xl:top-20 2xl:self-start">
          <TopStoriesRail stories={topStories} />
        </aside>

        <main className="min-w-0">
          {stories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center shadow-sm">
              <p className="text-3xl mb-3">🗞️</p>
              <p className="text-[15px] text-gray-400">No paper stories published for {activeDate} yet.</p>
            </div>
          ) : (
            <PaperTree
              bySection={bySection}
              stocksInFocus={stocksInFocus}
              topStories={topStories}
              marketImpactStories={marketImpactStories}
            />
          )}

          {/* ── Lower ribbon: story counts ───────────────────────────────────── */}
          {stories.length > 0 && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-white border border-gray-200 text-[13px] text-gray-400 text-center">
              {visibleCount} stories
              {noticeCount > 0 && <span className="text-gray-400"> · {noticeCount} routine notices hidden</span>}
              {" "}· {activeDate}
            </div>
          )}
        </main>

        <aside className="hidden 2xl:flex flex-col gap-3 2xl:sticky 2xl:top-20 2xl:self-start">
          <MarketImpactRail stories={marketImpactStories} />
          <StocksInFocusRail stocks={stocksInFocus} />
        </aside>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="mt-6 border-t border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#182131] flex items-center justify-center">
              <span className="text-white text-[8px] font-black">FB</span>
            </div>
            <span className="text-[13px] text-gray-400 font-medium">
              FinBrief · Manually curated from the daily e-paper
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
