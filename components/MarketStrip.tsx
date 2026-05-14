"use client";

import { Ticker } from "@/lib/queries";

const LABELS: Record<string, string> = {
  "^NSEI":    "Nifty 50",
  "^BSESN":   "Sensex",
  "^NSEBANK": "Bank Nifty",
  "USDINR=X": "₹/$",
  "^GSPC":    "S&P 500",
  "^IXIC":    "Nasdaq",
  "^HSI":     "Hang Seng",
  "^N225":    "Nikkei",
  "GC=F":     "Gold",
  "CL=F":     "WTI",
  "BZ=F":     "Brent",
};

function fmt(price: number, ticker: string): string {
  if (ticker === "USDINR=X") return `₹${price.toFixed(2)}`;
  if (["GC=F", "CL=F", "BZ=F"].includes(ticker)) return `$${price.toFixed(2)}`;
  if (price >= 1000) return price.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  return price.toFixed(2);
}

export default function MarketStrip({ tickers, label }: { tickers: Ticker[]; label: string }) {
  if (!tickers.length) return null;
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2.5 shadow-sm">
      <div className="mx-auto max-w-6xl flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        <span className="shrink-0 text-[10px] font-black tracking-[0.18em] text-gray-400 uppercase mr-2">
          {label}
        </span>
        <div className="w-px h-4 bg-gray-200 mr-2" />
        {tickers.map((t) => {
          const price = Number(t.price);
          const chg   = Number(t.change_pct);
          const up = chg > 0, dn = chg < 0;
          return (
            <div key={t.ticker}
              className="shrink-0 flex items-baseline gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <span className="text-[11px] text-gray-500 font-medium">{LABELS[t.ticker] ?? t.ticker}</span>
              <span className="text-[13px] font-mono font-bold text-gray-900">{fmt(price, t.ticker)}</span>
              <span className={`text-[11px] font-mono font-bold ${up ? "text-emerald-600" : dn ? "text-red-500" : "text-gray-400"}`}>
                {up ? "▲" : dn ? "▼" : "–"}{Math.abs(chg).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
