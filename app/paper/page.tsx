import Link from "next/link";
import { getPaperStories, getPaperDays } from "@/lib/queries";

export const revalidate = 300;

const SECTION_STYLE: Record<string, string> = {
  "Front Page": "text-amber-700 bg-amber-50",
  "Markets":    "text-blue-600 bg-blue-50",
  "Economy":    "text-teal-600 bg-teal-50",
  "Companies":  "text-violet-600 bg-violet-50",
  "World":      "text-rose-600 bg-rose-50",
};

export default async function PaperPage({
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

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center shadow-sm">
              <span className="text-white text-[11px] font-black tracking-tight">FB</span>
            </div>
            <span className="text-[20px] font-black tracking-tight text-gray-900">
              Fin<span className="text-amber-500">Brief</span>
            </span>
          </Link>
          <span className="text-[13px] text-gray-400 font-medium">Today&apos;s Paper</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <h1 className="text-[22px] font-black tracking-tight text-gray-900">Today&apos;s Paper</h1>
          <span className="text-[13px] text-gray-400 font-medium ml-1">
            {stories.length} stories · {activeDate}
          </span>
          <div className="ml-auto flex items-center gap-1.5 flex-wrap">
            {days.map((d) => (
              <Link
                key={d.date}
                href={`/paper?date=${d.date}`}
                className={`text-[12px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
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
          <div className="space-y-8">
            {Object.entries(bySection).map(([section, items]) => (
              <section key={section}>
                <h2 className="text-[13px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                  {section}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items.map((s) => (
                    <article
                      key={s.id}
                      className="rounded-xl bg-white border border-gray-150 hover:border-gray-300 hover:shadow-md p-4 transition-all duration-150"
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className={`text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded ${
                          SECTION_STYLE[section] ?? "text-gray-500 bg-gray-50"
                        }`}>
                          {section}
                        </span>
                        {s.page_number != null && (
                          <span className="text-[11px] text-gray-400 ml-auto tabular-nums shrink-0">
                            p.{s.page_number}
                          </span>
                        )}
                      </div>
                      <h3 className="text-[15px] font-bold text-gray-900 leading-snug mb-2 tracking-tight">
                        {s.headline}
                      </h3>
                      <p className="text-[13px] text-gray-600 leading-relaxed">{s.summary}</p>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-12 border-t border-gray-200 bg-white px-4 py-5">
        <div className="mx-auto max-w-5xl">
          <span className="text-[13px] text-gray-400 font-medium">
            FinBrief · Manually curated from the daily e-paper
          </span>
        </div>
      </footer>
    </div>
  );
}
