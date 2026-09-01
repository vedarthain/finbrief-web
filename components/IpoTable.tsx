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

export default function IpoTable({ listings }: { listings: IpoListing[] }) {
  if (listings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center shadow-sm">
        <p className="text-3xl mb-3">📈</p>
        <p className="text-[15px] text-gray-400">No IPO/listing data published yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white border border-gray-200 overflow-x-auto">
      <table className="w-full text-[13.5px] border-collapse">
        <thead>
          <tr className="text-left text-gray-400 text-[11px] uppercase tracking-wide">
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
          {listings.map((l) => (
            <tr key={l.id} className="hover:bg-gray-50/60 transition-colors">
              <td className="px-4 py-3 border border-gray-200">
                <div className="font-semibold text-gray-900">{l.company_name}</div>
                {l.notes && <div className="text-[12px] text-gray-400 mt-0.5 max-w-xs">{l.notes}</div>}
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
