import { SUPER_GROUPS, GROUP_EMOJI } from "@/lib/sectors";

/**
 * Bottom-of-page legend: shows which industries roll up into which super-group.
 * Helps users understand the "Group" filter on the Companies tab.
 */
export default function SectorLegend() {
  return (
    <details className="mt-8 rounded-xl bg-white border border-gray-200 overflow-hidden">
      <summary className="cursor-pointer px-4 py-3 flex items-center gap-2 hover:bg-gray-50 transition-colors">
        <span className="text-[13px] font-black tracking-[0.15em] uppercase text-gray-700">
          Group → industries map
        </span>
        <span className="text-[12px] text-gray-400 font-medium ml-1">
          how stocks are bucketed
        </span>
        <svg className="ml-auto w-4 h-4 text-gray-400 transition-transform [details[open]_&]:rotate-180"
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="px-4 py-3 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
        {Object.entries(SUPER_GROUPS).map(([group, members]) => (
          <div key={group}>
            <p className="text-[14px] font-bold text-gray-900 mb-1.5 flex items-center gap-1.5">
              <span>{GROUP_EMOJI[group]}</span>
              <span>{group}</span>
            </p>
            <ul className="text-[13px] text-gray-500 space-y-0.5 pl-5">
              {members.map((sec) => (
                <li key={sec} className="list-disc marker:text-gray-300">{sec}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
