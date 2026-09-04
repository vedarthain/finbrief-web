import { unstable_cache } from "next/cache";
import { getPaperStories, getPaperDays, getStocksInFocus, getTopStories } from "@/lib/queries";
import PaperTree from "@/components/PaperTree";
import DatePicker from "@/components/DatePicker";
import NavTabs from "@/components/NavTabs";

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

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; edition?: string }>;
}) {
  const params = await searchParams;
  const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const activeDate = params.date ?? todayIST;

  const [stories, days, stocksInFocus, topStories] = await Promise.all([
    cachedGetPaperStories(activeDate, params.edition),
    cachedGetPaperDays(),
    cachedGetStocksInFocus(activeDate, params.edition),
    cachedGetTopStories(activeDate, params.edition),
  ]);

  const bySection = stories.reduce<Record<string, typeof stories>>((acc, s) => {
    (acc[s.section] ??= []).push(s);
    return acc;
  }, {});

  const istTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata", weekday: "short",
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-[#F2F2F7]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center shadow-sm shrink-0">
              <span className="text-white text-[11px] font-bold tracking-tight">FB</span>
            </div>
            <span className="text-[19px] font-bold tracking-tight text-gray-900 whitespace-nowrap">
              Fin<span className="text-amber-500">Brief</span>
            </span>
          </div>
          <NavTabs />
          <span className="hidden sm:inline text-[13px] text-gray-400 whitespace-nowrap ml-auto">{istTime} IST</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-4">
        {/* Title bar + day picker */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <h1 className="text-[20px] font-bold tracking-tight text-gray-900">Today&apos;s Paper</h1>
          <span className="text-[13px] text-gray-400 font-normal ml-1">
            {stories.length} stories · {activeDate}
          </span>
          <div className="ml-auto">
            <DatePicker activeDate={activeDate} availableDates={days.map((d) => d.date)} />
          </div>
        </div>

        {stories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center shadow-sm">
            <p className="text-3xl mb-3">🗞️</p>
            <p className="text-[15px] text-gray-400">No paper stories published for {activeDate} yet.</p>
          </div>
        ) : (
          <PaperTree bySection={bySection} stocksInFocus={stocksInFocus} topStories={topStories} />
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="mt-6 border-t border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gray-900 flex items-center justify-center">
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
