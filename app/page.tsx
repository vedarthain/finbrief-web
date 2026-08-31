import { getPaperStories, getPaperDays, getStocksInFocus } from "@/lib/queries";
import Link from "next/link";
import PaperTree from "@/components/PaperTree";

export const revalidate = 300;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; edition?: string }>;
}) {
  const params = await searchParams;
  const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const activeDate = params.date ?? todayIST;

  const [stories, days, stocksInFocus] = await Promise.all([
    getPaperStories(activeDate, params.edition),
    getPaperDays(),
    getStocksInFocus(activeDate, params.edition),
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
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center shadow-sm">
              <span className="text-white text-[11px] font-bold tracking-tight">FB</span>
            </div>
            <span className="text-[19px] font-bold tracking-tight text-gray-900">
              Fin<span className="text-amber-500">Brief</span>
            </span>
          </div>
          <span className="text-[13px] text-gray-400">{istTime} IST</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Title bar + day picker */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <h1 className="text-[24px] font-bold tracking-tight text-gray-900">Today&apos;s Paper</h1>
          <span className="text-[14px] text-gray-400 font-normal ml-1">
            {stories.length} stories · {activeDate}
          </span>
          <div className="ml-auto flex items-center gap-1.5 flex-wrap">
            {days.map((d) => (
              <Link
                key={d.date}
                href={`/?date=${d.date}`}
                className={`text-[13px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  d.date === activeDate
                    ? "bg-gray-900 border-gray-900 text-white"
                    : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                {d.date}
              </Link>
            ))}
          </div>
        </div>

        {stories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center shadow-sm">
            <p className="text-3xl mb-3">🗞️</p>
            <p className="text-[15px] text-gray-400">No paper stories published for {activeDate} yet.</p>
          </div>
        ) : (
          <PaperTree bySection={bySection} stocksInFocus={stocksInFocus} />
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
              FinBrief · Manually curated from the daily e-paper
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
