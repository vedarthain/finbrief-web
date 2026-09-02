"use client";

import { useState } from "react";
import { PaperStory } from "@/lib/queries";
import { renderSummary } from "./PaperTree";

const PAGE_SIZE = 16;
const PER_COL = 8;

function EditionBadge({ edition }: { edition: string }) {
  return (
    <span className="shrink-0 text-[9px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded border border-gray-200 text-gray-400 bg-gray-50">
      {edition}
    </span>
  );
}

export default function CorporateEventsTable({
  stories,
  multiEdition,
  px,
}: {
  stories: PaperStory[];
  multiEdition: boolean;
  px: (base: number) => string;
}) {
  const idsKey = stories.map((s) => s.id).join(",");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(stories[0]?.id ?? null);

  // Reset to page 1 / first row whenever the underlying story set changes
  // (switching into this tab, or a new day's data loading in). Adjusted
  // during render (React's recommended pattern) rather than in an effect,
  // to avoid an extra cascading render.
  const [prevIdsKey, setPrevIdsKey] = useState(idsKey);
  if (idsKey !== prevIdsKey) {
    setPrevIdsKey(idsKey);
    setPage(0);
    setSelectedId(stories[0]?.id ?? null);
  }

  const totalPages = Math.max(1, Math.ceil(stories.length / PAGE_SIZE));
  const pageItems = stories.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const col1 = pageItems.slice(0, PER_COL);
  const col2 = pageItems.slice(PER_COL, PER_COL * 2);
  const selected = stories.find((s) => s.id === selectedId) ?? null;

  function Row({ s }: { s: PaperStory }) {
    const active = s.id === selectedId;
    return (
      <button
        onClick={() => setSelectedId(s.id)}
        className={`w-full text-left px-3 py-2.5 border-b border-gray-100 last:border-b-0 transition-colors flex items-center gap-2 ${
          active ? "bg-violet-50" : "hover:bg-gray-50"
        }`}
      >
        <h4
          style={{ fontSize: px(14.5) }}
          className={`flex-1 min-w-0 truncate leading-snug ${
            active ? "text-violet-800 font-semibold" : "text-gray-800 font-medium"
          }`}
        >
          {s.headline}
        </h4>
        {multiEdition && <EditionBadge edition={s.edition} />}
      </button>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 border-b border-gray-100">
        <div>{col1.map((s) => <Row key={s.id} s={s} />)}</div>
        <div>{col2.map((s) => <Row key={s.id} s={s} />)}</div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50/60">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-[12px] font-medium px-2.5 py-1 rounded border border-gray-200 bg-white text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:border-gray-300 transition-colors"
          >
            ‹ Prev
          </button>
          <span className="text-[12px] text-gray-400 tabular-nums">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="text-[12px] font-medium px-2.5 py-1 rounded border border-gray-200 bg-white text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:border-gray-300 transition-colors"
          >
            Next ›
          </button>
        </div>
      )}

      {selected ? (
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 mb-2">
            <h3 style={{ fontSize: px(17) }} className="font-semibold text-gray-900 leading-snug">
              {selected.headline}
            </h3>
            {multiEdition && <EditionBadge edition={selected.edition} />}
          </div>
          <p style={{ fontSize: px(15.5) }} className="leading-relaxed">
            {renderSummary(selected.summary, "text-gray-700")}
          </p>
          {selected.page_number != null && (
            <p className="text-[13px] text-gray-400 mt-2">Page {selected.page_number}</p>
          )}
        </div>
      ) : (
        <div className="px-4 py-8 text-center text-[13px] text-gray-400">No stories in this section.</div>
      )}
    </div>
  );
}
