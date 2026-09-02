import { getIpoListings } from "@/lib/queries";
import IpoTable from "@/components/IpoTable";
import NavTabs from "@/components/NavTabs";

export const revalidate = 300;

export default async function IpoPage() {
  const listings = await getIpoListings();

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
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <h1 className="text-[20px] font-bold tracking-tight text-gray-900">IPO &amp; New Listings</h1>
          <span className="text-[13px] text-gray-400 font-normal ml-1">{listings.length} tracked</span>
        </div>

        <IpoTable listings={listings} />
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
