"use client";

// Generic single-column, paginated headline list used for every "Today's Paper"
// section tab (including Stocks in Focus) — clicking a row, or moving the
// selection with the Up/Down arrow keys, selects a story; the caller renders
// that story's full detail in a separate panel alongside this list.

export interface TableRow {
  key: string | number;
  headline: string;
  industry?: string | null;
  edition?: string;
  section?: string;
  isNotice?: boolean;
  importance?: number;
}

const PAGE_SIZE = 15;

function EditionBadge({ edition }: { edition: string }) {
  const isBS = edition === "Business Standard";
  const label = isBS ? "BS" : "FX";
  const colorClasses = isBS
    ? "border-orange-200 text-orange-600 bg-orange-50"
    : "border-blue-200 text-blue-600 bg-blue-50";
  return (
    <span
      title={edition}
      className={`shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${colorClasses}`}
    >
      {label}
    </span>
  );
}

export default function PaperSectionTable({
  rows,
  selectedIndex,
  onSelectIndex,
  multiEdition,
  px,
}: {
  rows: TableRow[];
  selectedIndex: number;
  onSelectIndex: (i: number) => void;
  multiEdition: boolean;
  px: (base: number) => string;
}) {
  if (rows.length === 0) {
    return <div className="px-4 py-8 text-center text-[13px] text-gray-400">No stories in this section.</div>;
  }

  const clamped = Math.min(Math.max(selectedIndex, 0), rows.length - 1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.floor(clamped / PAGE_SIZE);
  const pageStart = page * PAGE_SIZE;
  const pageItems = rows.slice(pageStart, pageStart + PAGE_SIZE);

  function Row({ r, idx }: { r: TableRow; idx: number }) {
    const active = idx === clamped;
    return (
      <button
        onClick={() => onSelectIndex(idx)}
        className={`w-full text-left px-3 py-2.5 border-b border-gray-100 last:border-b-0 transition-colors flex items-center gap-2 ${
          active ? "bg-violet-50" : "hover:bg-gray-50"
        }`}
      >
        <h4
          style={{ fontSize: px(14.5) }}
          className={`flex-1 min-w-0 line-clamp-2 leading-snug ${
            active ? "text-violet-800 font-semibold" : r.isNotice ? "text-gray-500 font-normal" : "text-gray-800 font-medium"
          }`}
        >
          {r.headline}
        </h4>
        {(r.importance ?? 0) >= 4 && (
          <span
            title={r.importance === 5 ? "Front-page-lead priority" : "High priority"}
            className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-amber-200 text-amber-700 bg-amber-50"
          >
            ★ Priority
          </span>
        )}
        {r.section && (
          <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 bg-gray-50">
            {r.section}
          </span>
        )}
        {r.industry && (
          <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border border-cyan-200 text-cyan-700 bg-cyan-50">
            {r.industry}
          </span>
        )}
        {multiEdition && r.edition && <EditionBadge edition={r.edition} />}
      </button>
    );
  }

  return (
    <div>
      <div>{pageItems.map((r, i) => <Row key={r.key} r={r} idx={pageStart + i} />)}</div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 px-4 py-2 border-t border-gray-100 bg-gray-50/60">
          <button
            onClick={() => onSelectIndex(Math.max(0, pageStart - PAGE_SIZE))}
            disabled={page === 0}
            className="text-[12px] font-medium px-2.5 py-1 rounded border border-gray-200 bg-white text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:border-gray-300 transition-colors"
          >
            ‹ Prev
          </button>
          <span className="text-[12px] text-gray-400 tabular-nums">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => onSelectIndex(Math.min(rows.length - 1, pageStart + PAGE_SIZE))}
            disabled={page === totalPages - 1}
            className="text-[12px] font-medium px-2.5 py-1 rounded border border-gray-200 bg-white text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:border-gray-300 transition-colors"
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}
