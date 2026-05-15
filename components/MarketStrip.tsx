"use client";

import { Ticker } from "@/lib/queries";

const LABELS: Record<string, string> = {
  "^NSEI":      "Nifty 50",
  "^BSESN":     "Sensex",
  "^NSEBANK":   "Bank Nifty",
  "^NSEMDCP50": "Nifty Midcap",
  "^CNXIT":     "Nifty IT",
  "^CNXAUTO":   "Nifty Auto",
  "^CNXFMCG":   "Nifty FMCG",
  "^CNXPHARMA": "Nifty Pharma",
  "^CNXMETAL":  "Nifty Metal",
  "^CNXENERGY": "Nifty Energy",
  "USDINR=X":   "₹/$",
  "^GSPC":      "S&P 500",
  "^IXIC":      "Nasdaq",
  "^DJI":       "Dow",
  "^HSI":       "Hang Seng",
  "^N225":      "Nikkei",
  "^FTSE":      "FTSE",
  "^GDAXI":     "DAX",
  "^STOXX50E":  "Stoxx 50",
  "GC=F":       "Gold",
  "SI=F":       "Silver",
  "CL=F":       "WTI",
  "BZ=F":       "Brent",
  "DX-Y.NYB":   "Dollar Index",
};

function fmt(price: number, ticker: string): string {
  if (ticker === "USDINR=X") return `₹${price.toFixed(2)}`;
  if (["GC=F", "SI=F", "CL=F", "BZ=F"].includes(ticker)) return `$${price.toFixed(2)}`;
  if (price >= 1000) return price.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  return price.toFixed(2);
}

/* Marquee ticker — pure CSS infinite scroll. Duplicated content for seamless loop. */
export default function MarketStrip({
  tickers,
  label,
  speedSec = 60,
}: {
  tickers: Ticker[];
  label: string;
  speedSec?: number;
}) {
  if (!tickers.length) return null;

  const Pill = ({ t }: { t: Ticker }) => {
    const price = Number(t.price);
    const chg   = Number(t.change_pct);
    const up = chg > 0, dn = chg < 0;
    return (
      <div className="shrink-0 flex items-baseline gap-2 px-3 py-1.5 rounded-md bg-gray-50 border border-gray-200 mx-1">
        <span className="text-[13px] text-gray-500 font-medium">{LABELS[t.ticker] ?? t.ticker}</span>
        <span className="text-[14px] font-mono font-bold text-gray-900 tabular-nums">{fmt(price, t.ticker)}</span>
        <span className={`text-[13px] font-mono font-bold tabular-nums ${up ? "text-emerald-600" : dn ? "text-red-500" : "text-gray-400"}`}>
          {up ? "▲" : dn ? "▼" : "–"}{Math.abs(chg).toFixed(2)}%
        </span>
      </div>
    );
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 shadow-sm overflow-hidden">
      <div className="mx-auto max-w-7xl flex items-center gap-3">
        <span className="shrink-0 text-[12px] font-black tracking-[0.18em] text-gray-400 uppercase">
          {label}
        </span>
        <div className="w-px h-4 bg-gray-200 shrink-0" />
        <div className="flex-1 relative overflow-hidden ticker-fade">
          <div
            className="flex items-center w-max marquee"
            style={{ animationDuration: `${speedSec}s` }}
          >
            {/* Render the list twice for seamless loop */}
            {[...tickers, ...tickers].map((t, i) => (
              <Pill key={`${t.ticker}-${i}`} t={t} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
