import { getPaperStories, getPaperDays } from "@/lib/queries";
import Link from "next/link";

export const revalidate = 300;

const SECTION_STYLE: Record<string, string> = {
  "Front Page":          "text-amber-700 bg-amber-50",
  "Markets":             "text-blue-600 bg-blue-50",
  "Economy":             "text-teal-600 bg-teal-50",
  "Companies":           "text-violet-600 bg-violet-50",
  "World":               "text-rose-600 bg-rose-50",
  "Personal Finance":    "text-emerald-600 bg-emerald-50",
  "Opinion":             "text-slate-600 bg-slate-100",
  "BrandWagon":          "text-fuchsia-600 bg-fuchsia-50",
  "IPO & Legal Notices": "text-orange-700 bg-orange-50",
};

const SECTION_BAR: Record<string, string> = {
  "Front Page":          "from-amber-500 to-amber-600",
  "Markets":             "from-blue-500 to-blue-600",
  "Economy":             "from-teal-500 to-teal-600",
  "Companies":           "from-violet-500 to-violet-600",
  "World":               "from-rose-500 to-rose-600",
  "Personal Finance":    "from-emerald-500 to-emerald-600",
  "Opinion":             "from-slate-500 to-slate-600",
  "BrandWagon":          "from-fuchsia-500 to-fuchsia-600",
  "IPO & Legal Notices": "from-orange-500 to-orange-600",
};

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; edition?: string }>;
}) {
  const params = await searchParams;
  const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const activeDate = params.date ?? todayIST;

  const [stories, days] = await Promise.all([
    getPaperStories(activeDate, params.edition),
    getPaperDays(),
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
              <span className="text-white text-[11px] font-black tracking-tight">FB</span>
            </div>
            <span className="text-[20px] font-black tracking-tight text-gray-900">
              Fin<span className="text-amber-500">Brief</span>
            </span>
          </div>
          <span className="text-[13px] text-gray-400">{istTime} IST</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Title bar + day picker */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <h1 className="text-[26px] font-black tracking-tight text-gray-900">Today&apos;s Paper</h1>
          <span className="text-[14px] text-gray-400 font-medium ml-1">
            {stories.length} stories · {activeDate}
          </span>
          <div className="ml-auto flex items-center gap-1.5 flex-wrap">
            {days.map((d) => (
              <Link
                key={d.date}
                href={`/?date=${d.date}`}
                className={`text-[13px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
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
          <div className="flex gap-6 items-start">
            {/* ── Left sidebar: section nav ──────────────────────────────── */}
            <aside className="hidden md:block w-52 shrink-0 sticky top-20">
              <nav className="rounded-xl bg-white border border-gray-150 shadow-sm p-2">
                {Object.entries(bySection).map(([section, items]) => (
                  <a
                    key={section}
                    href={`#${slug(section)}`}
                    className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-[14px] font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  >
                    <span className="truncate">{section}</span>
                    <span className="text-[12px] text-gray-400 tabular-nums">{items.length}</span>
                  </a>
                ))}
              </nav>
            </aside>

            {/* ── Sections ────────────────────────────────────────────────── */}
            <div className="flex-1 min-w-0 space-y-12">
              {Object.entries(bySection).map(([section, items]) => (
                <section key={section} id={slug(section)} className="scroll-mt-24">
                  <div
                    className={`inline-block bg-gradient-to-r ${
                      SECTION_BAR[section] ?? "from-gray-500 to-gray-600"
                    } text-white text-[14px] font-bold px-4 py-2.5 rounded-lg mb-5 shadow-sm`}
                  >
                    {section}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {items.map((s) => (
                      <article
                        key={s.id}
                        className="rounded-xl bg-white border border-gray-150 hover:border-gray-300 hover:shadow-md p-5 transition-all duration-150"
                      >
                        <div className="flex items-center gap-1.5 mb-3">
                          <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded ${
                            SECTION_STYLE[section] ?? "text-gray-500 bg-gray-50"
                          }`}>
                            {section}
                          </span>
                          {s.page_number != null && (
                            <span className="text-[12px] text-gray-400 ml-auto tabular-nums shrink-0">
                              p.{s.page_number}
                            </span>
                          )}
                        </div>
                        <h3 className="text-[18px] font-bold text-gray-900 leading-snug mb-2.5 tracking-tight">
                          {s.headline}
                        </h3>
                        <p className="text-[15px] text-gray-600 leading-relaxed">{s.summary}</p>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
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
