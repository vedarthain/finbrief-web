"use client";

import { ClusterEntity } from "@/lib/queries";

export default function TickerChip({ entity }: { entity: ClusterEntity }) {
  const pct = Number(entity.price_change_pct ?? 0);
  const up  = entity.direction === "up";
  const dn  = entity.direction === "down";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-mono border font-medium ${
      up ? "border-emerald-200 bg-emerald-50 text-emerald-700"
         : dn ? "border-red-200 bg-red-50 text-red-600"
              : "border-gray-200 bg-gray-50 text-gray-500"
    }`}>
      <span className="font-semibold tracking-tight">{entity.company_name}</span>
      {pct !== 0 && (
        <span className={`font-bold ${up ? "text-emerald-600" : "text-red-500"}`}>
          {up ? "▲" : "▼"}{Math.abs(pct).toFixed(2)}%
        </span>
      )}
      {entity.price_latest && (
        <span className="text-gray-400">
          ₹{Number(entity.price_latest).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        </span>
      )}
    </span>
  );
}
