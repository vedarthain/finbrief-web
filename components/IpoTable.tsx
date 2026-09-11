"use client";

import { Fragment, useMemo, useState } from "react";
import { IpoListing } from "@/lib/queries";

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtPrice(n: number | null) {
  return n == null ? "—" : `₹${n.toLocaleString("en-IN")}`;
}

const STATUS_STYLE: Record<string, string> = {
  upcoming: "text-sky-600 bg-sky-50",
  open:     "text-emerald-700 bg-emerald-50",
  closed:   "text-amber-700 bg-amber-50",
  listed:   "text-gray-600 bg-gray-100",
};

const STATUS_ORDER = ["upcoming", "open", "closed", "listed"] as const;

const EXCHANGE_STYLE: Record<string, string> = {
  NSE: "text-indigo-700 bg-indigo-50 border-indigo-200",
  BSE: "text-orange-700 bg-orange-50 border-orange-200",
};

// Splits a free-text exchange string ("BSE, NSE" / "NSE Emerge" / "BSE SME")
// into individual badges so NSE/BSE always stand out clearly.
function ExchangeBadges({ exchange }: { exchange: string | null }) {
  if (!exchange) return <span className="text-gray-300">—</span>;
  const parts = exchange.split(/[,/]/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className="flex flex-wrap gap-1">
      {parts.map((part, i) => {
        const key = part.match(/^(NSE|BSE)/i)?.[1]?.toUpperCase();
        return (
          <span
            key={i}
            className={`text-[10.5px] font-semibold px-1.5 py-0.5 rounded border whitespace-nowrap ${
              (key && EXCHANGE_STYLE[key]) ?? "text-gray-600 bg-gray-50 border-gray-200"
            }`}
          >
            {part}
          </span>
        );
      })}
    </div>
  );
}

// A listing with no listing_date/close_date yet (upcoming/open) is always
// "current" regardless of age. Only closed/listed rows age out of the
// default view — the recency window is about hiding old, settled history,
// not anything still actionable.
const RECENT_WINDOW_DAYS = 45;

function relevantDate(l: IpoListing): string | null {
  return l.listing_date ?? l.close_date ?? l.open_date;
}

function isPending(l: IpoListing) {
  return l.status === "upcoming" || l.status === "open";
}

// ── Expanded fact-sheet card: Key detail / Information rows, shown when a
// row is clicked. Prefers the structured fields (offer_type/issue_size/
// sellers/implied_valuation) captured at extraction time; older listings
// published before those columns existed fall back to the free-text notes
// blob so nothing goes blank for historical rows. Exported so PaperTree.tsx
// can render the same table inline under a matching "IPO" section story on
// the Today's Paper page, not just here on the dedicated /ipo page. ──
export function IpoFactSheet({ l }: { l: IpoListing }) {
  const priceBand =
    l.issue_price_low != null || l.issue_price_high != null
      ? `₹${l.issue_price_low ?? "—"}–${l.issue_price_high ?? "—"}/share`
      : null;
  const structuredRows: [string, string | null][] = [
    ["Fresh issue", l.fresh_issue],
    ["Offer for sale", l.offer_for_sale],
    ["Selling investors", l.sellers],
    ["Offer structure", l.offer_type],
    ["Price range", priceBand],
    ["Closing date", fmtDate(l.close_date)],
    ["Expected listing", fmtDate(l.listing_date)],
    ["Issue size", l.fresh_issue || l.offer_for_sale ? null : l.issue_size],
    ["Implied valuation", l.implied_valuation],
  ].filter(([, v]) => v && v !== "—") as [string, string][];
  const hasStructuredDetail =
    l.fresh_issue || l.offer_for_sale || l.offer_type || l.issue_size || l.sellers || l.implied_valuation;

  return (
    <div className="px-5 py-4 max-w-2xl">
      <h4 className="text-[17px] font-bold text-gray-900">{l.company_name}</h4>
      {l.exchange && <p className="text-[13px] text-gray-500 mt-0.5">{l.exchange}</p>}

      {hasStructuredDetail ? (
        <table className="w-full mt-3 text-[13px] border-collapse">
          <thead>
            <tr className="text-left text-gray-500 font-semibold border-b border-gray-200">
              <th className="py-2 pr-4 font-semibold w-[38%]">Key detail</th>
              <th className="py-2 font-semibold">Information</th>
            </tr>
          </thead>
          <tbody>
            {structuredRows.map(([k, v]) => (
              <tr key={k} className="border-b border-gray-100 last:border-b-0">
                <td className="py-2.5 pr-4 text-gray-500 align-top">{k}</td>
                <td className="py-2.5 text-gray-800 align-top">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        l.notes && <p className="text-[13px] text-gray-600 mt-3 leading-relaxed">{l.notes}</p>
      )}
    </div>
  );
}

export default function IpoTable({ listings }: { listings: IpoListing[] }) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showOlder, setShowOlder] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: listings.length };
    for (const s of STATUS_ORDER) c[s] = listings.filter((l) => l.status === s).length;
    return c;
  }, [listings]);

  const cutoffISO = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - RECENT_WINDOW_DAYS);
    return d.toISOString().slice(0, 10);
  }, []);

  const { visible, olderCount } = useMemo(() => {
    const base = statusFilter === "all" ? listings : listings.filter((l) => l.status === statusFilter);
    // Date-range scoping only collapses the unfiltered "all" view — once the
    // reader has explicitly picked a status (e.g. "Listed"), show every
    // matching row so history stays browsable on demand.
    if (statusFilter !== "all" || showOlder) return { visible: base, olderCount: 0 };
    const isRecentOrPending = (l: IpoListing) => {
      if (isPending(l)) return true;
      const d = relevantDate(l);
      return d == null || d >= cutoffISO;
    };
    const recent = base.filter(isRecentOrPending);
    return { visible: recent, olderCount: base.length - recent.length };
  }, [listings, statusFilter, showOlder, cutoffISO]);

  if (listings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center shadow-sm">
        <p className="text-3xl mb-3">📈</p>
        <p className="text-[15px] text-gray-400">No IPO/listing data published yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        <button
          onClick={() => { setStatusFilter("all"); setShowOlder(false); }}
          className={`flex items-center gap-1 text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
            statusFilter === "all"
              ? "bg-[#26344a] border-[#26344a] text-white"
              : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
          }`}
        >
          All
          <span className="text-[10px] font-normal tabular-nums opacity-70">{counts.all}</span>
        </button>
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setShowOlder(false); }}
            className={`flex items-center gap-1 text-[11.5px] font-semibold capitalize px-2.5 py-1.5 rounded-lg border transition-colors ${
              statusFilter === s
                ? "bg-[#26344a] border-[#26344a] text-white"
                : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            {s}
            <span className="text-[10px] font-normal tabular-nums opacity-70">{counts[s]}</span>
          </button>
        ))}
        {statusFilter === "all" && olderCount > 0 && (
          <button
            onClick={() => setShowOlder(true)}
            className="ml-auto text-[11px] font-medium text-gray-400 hover:text-gray-600 underline decoration-dotted underline-offset-2"
          >
            Show {olderCount} older listing{olderCount === 1 ? "" : "s"}
          </button>
        )}
        {statusFilter === "all" && showOlder && (
          <button
            onClick={() => setShowOlder(false)}
            className="ml-auto text-[11px] font-medium text-gray-400 hover:text-gray-600 underline decoration-dotted underline-offset-2"
          >
            Hide older listings
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center shadow-sm">
          <p className="text-[15px] text-gray-400">No listings match this filter.</p>
        </div>
      ) : (
        <div className="rounded-lg bg-white border border-gray-200 overflow-x-auto">
          <table className="w-full text-[13.5px] border-collapse">
            <thead>
              <tr className="text-left text-gray-400 text-[11px] uppercase tracking-wide">
                <th className="px-3 py-2.5 font-medium border border-gray-200 text-right">#</th>
                <th className="px-4 py-2.5 font-medium border border-gray-200">Company</th>
                <th className="px-3 py-2.5 font-medium border border-gray-200">Exchange</th>
                <th className="px-3 py-2.5 font-medium border border-gray-200">Status</th>
                <th className="px-3 py-2.5 font-medium border border-gray-200">Price Band</th>
                <th className="px-3 py-2.5 font-medium border border-gray-200">Open</th>
                <th className="px-3 py-2.5 font-medium border border-gray-200">Close</th>
                <th className="px-3 py-2.5 font-medium border border-gray-200">Listing Date</th>
                <th className="px-3 py-2.5 font-medium border border-gray-200 text-right">Listing Price</th>
                <th className="px-3 py-2.5 font-medium border border-gray-200 text-right">Current Price</th>
                <th className="px-4 py-2.5 font-medium border border-gray-200 text-right">Since Listing</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((l, i) => {
                const isExpanded = expandedId === l.id;
                return (
                  <Fragment key={l.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : l.id)}
                      className={`cursor-pointer transition-colors ${isExpanded ? "bg-gray-50" : "hover:bg-gray-50/60"}`}
                    >
                      <td className="px-3 py-3 border border-gray-200 text-right text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3 border border-gray-200">
                        <div className="flex items-center gap-1.5">
                          <span aria-hidden className="text-gray-300 text-[10px] shrink-0 w-2.5">{isExpanded ? "▾" : "▸"}</span>
                          <span className="font-semibold text-gray-900">{l.company_name}</span>
                        </div>
                        {l.notes && !isExpanded && (
                          <div className="text-[12px] text-gray-400 mt-0.5 max-w-xs truncate" title={l.notes}>{l.notes}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 border border-gray-200">
                        <ExchangeBadges exchange={l.exchange} />
                      </td>
                      <td className="px-3 py-3 border border-gray-200">
                        <span className={`text-[10.5px] font-medium uppercase tracking-wide px-2 py-0.5 rounded ${STATUS_STYLE[l.status] ?? "text-gray-500 bg-gray-50"}`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 border border-gray-200 text-gray-600 whitespace-nowrap">
                        {l.issue_price_low != null || l.issue_price_high != null
                          ? `${fmtPrice(l.issue_price_low)} – ${fmtPrice(l.issue_price_high)}`
                          : "—"}
                      </td>
                      <td className="px-3 py-3 border border-gray-200 text-gray-600 whitespace-nowrap">{fmtDate(l.open_date)}</td>
                      <td className="px-3 py-3 border border-gray-200 text-gray-600 whitespace-nowrap">{fmtDate(l.close_date)}</td>
                      <td className="px-3 py-3 border border-gray-200 text-gray-600 whitespace-nowrap">{fmtDate(l.listing_date)}</td>
                      <td className="px-3 py-3 border border-gray-200 text-right text-gray-700 whitespace-nowrap">{fmtPrice(l.listing_price)}</td>
                      <td className="px-3 py-3 border border-gray-200 text-right text-gray-700 whitespace-nowrap">{fmtPrice(l.current_price)}</td>
                      <td className="px-4 py-3 border border-gray-200 text-right whitespace-nowrap">
                        {l.change_pct == null ? (
                          <span className="text-gray-300">—</span>
                        ) : (
                          <span className={l.change_pct >= 0 ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>
                            {l.change_pct >= 0 ? "+" : ""}{l.change_pct}%
                          </span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={11} className="border border-gray-200 bg-gray-50/60 p-0">
                          <IpoFactSheet l={l} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
