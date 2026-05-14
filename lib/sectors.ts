/**
 * Sector taxonomy — mirrors finbrief/config/sectors.py
 * 15 industry sectors organised under 5 super-groups, plus 3 macro buckets.
 */

export const SUPER_GROUPS: Record<string, string[]> = {
  "Financial Services": [
    "Banking",
    "NBFC & Capital Markets",
    "Insurance",
  ],
  "Technology": [
    "IT Services",
    "New-age Internet",
    "Telecom",
  ],
  "Consumer": [
    "Auto & Ancillaries",
    "FMCG",
    "Retail & Durables",
  ],
  "Industrials": [
    "Energy & Oil/Gas",
    "Power & Utilities",
    "Metals & Mining",
    "Capital Goods & Cement",
    "Infra & Realty",
  ],
  "Specialised": [
    "Pharma & Healthcare",
    "Defence & Aerospace",
    "Aviation & Logistics",
  ],
};

// Flat ordered list of sectors (display order)
export const SECTORS: string[] = Object.values(SUPER_GROUPS).flat();

// Macro buckets — excluded from sector filter
export const MACRO_BUCKETS = new Set(["Indices", "Commodities", "Forex", "Global Indices"]);

// Anything not in SECTORS and not a macro bucket
export const NON_COMPANY = new Set([...MACRO_BUCKETS, "Other"]);

// sector → super-group lookup
export const SECTOR_TO_GROUP: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const [group, members] of Object.entries(SUPER_GROUPS)) {
    for (const s of members) m[s] = group;
  }
  return m;
})();

// Compact emoji per super-group (for the UI accents)
export const GROUP_EMOJI: Record<string, string> = {
  "Financial Services": "💰",
  "Technology":         "💻",
  "Consumer":           "🛒",
  "Industrials":        "🏭",
  "Specialised":        "⚕️",
};
