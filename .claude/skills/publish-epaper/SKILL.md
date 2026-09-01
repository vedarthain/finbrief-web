---
name: publish-epaper
description: Extract stories from a new day's e-paper PDF (~/Documents/epapers/) and publish them to FinBrief's "Today's Paper" feature. Use whenever the user says they've uploaded/added a new day's e-paper, or asks to extract/publish/update today's paper.
---

# Publish a new day's e-paper to Today's Paper

This is a recurring daily task. Follow this exact pipeline instead of re-deriving it — the format, gotchas, and verification steps below were worked out over several iterations.

## 1. Locate the source

PDF lives in `~/Documents/epapers/`. Ask the user for the exact filename/date/edition if not obvious (usually "Mumbai" edition). Determine the target `paper_date` (IST date, `YYYY-MM-DD`).

**Multiple newspapers on the same date are supported.** `paper_stories`/`paper_meta` are keyed on `(edition, paper_date)`, so a second title (e.g. a different newspaper brand, not just a different city edition of the same paper) publishes as its own `edition` value without touching the first one's rows — `publish-paper.mjs` only deletes+reinserts rows matching the `edition` in the JSON file being published. The UI (`components/PaperTree.tsx`) automatically shows a small source badge on every story once it detects more than one distinct `edition` value for the date; with only one edition (today's default) no badge is shown, so no UI change is needed when adding a second paper.

**Cross-edition dedup:** if two different newspapers cover the same underlying event on the same date (e.g. both report the same GDP print or the same company's results), do not publish it as two separate stories under two editions. Pick the more complete/better-written version as the single published story, and only keep both if they add genuinely distinct facts (in which case merge them into one story per the dedup rule in §3a, same as within-paper dedup). The goal is one story per real-world event across the whole day's paper set, not one per source.

## 2. Read the PDF — mind the page offset

The `Read` tool's internal PDF page index is **NOT** the same as the printed page number.

- **Internal page index = printed page number + 2** (confirmed empirically: internal page 7 = printed page 5, internal page 12 = printed page 10, etc.)
- Printed pages typically run 1–22 even though the PDF has ~24 internal pages (front/back matter accounts for the offset).
- If unsure, spot-check by reading a single internal page and looking for the printed page number visible in the page footer/header before committing to a page-range read.

## 3. Extract comprehensively

**Do not skip IPO / legal / AGM / rights-issue notices.** These pages (often near the back) contain dense small-print notices — read them carefully and extract every distinct company/entity, not just a couple of examples. If several near-identical AGM/SARFAESI notices exist for many companies on one page, capture them as one consolidated story per notice-type but list every company name individually (so each name can later be wrapped in `[[...]]` for highlighting).

Read across the whole paper regardless of which physical page/section a story runs on — Front Page, Markets, Economy, Companies, World, Personal Finance, Opinion, BrandWagon, Technology, AI@Work, Back Page, IPO & Legal Notices, etc. **Do not use these page-section names as the `section` field.** They exist only to make sure you don't skip content while reading.

No Claude API call is used for extraction — read the PDF directly and write the structured JSON yourself in-chat.

## 3a. Classify every story into a fixed topic taxonomy — never by page

The `section` field must be one of these 12 fixed leaf values. The UI groups them into top-level tabs (with sub-tabs for grouped ones) — write the `stories` array in this exact leaf order, since `display_order` is derived purely from array position:

1. **Economy** — macro data and government economic commentary: GDP, fiscal deficit, RBI/CEA/FinMin commentary, PMI, services-sector output, debt targets. *(Top-level tab: Economy)*
2. **Policy** — government policy decisions/proposals: FDI-norm changes, GST Council meetings, sector policy notifications. *(Grouped under "Policy & Regulatory")*
3. **Regulatory** — court/tribunal/NCLT/NCLAT rulings, SEBI/FSSAI/regulator orders and bans, AGM/e-voting notices, SARFAESI/possession notices, lost-share-certificate notices, government fare/price orders. *(Grouped under "Policy & Regulatory")*
4. **Sector** — industry-wide trends that aren't about one company: e.g. "$50-bn medtech sector by FY30" or "premium phones fly, budget ones flag" — a whole sector's dynamics, not a single stock's news. *(Grouped under "In Focus", alongside the separately-curated `stocksInFocus` "Stocks in Focus" tab)*
5. **Corporate Events** — single-company news: results, capex/capacity announcements, M&A, leadership changes, stake sales — e.g. "SJVN capacity up 1,730 MW" is stock-specific, so it's Corporate Events, not Sector. *(Grouped under "Stocks")*
6. **IPO** — new listings, IPO price bands/allotments/proceeds, rights issues, preferential issues. *(Grouped under "Stocks")*
7. **Market** — index/auction moves, currency, bank credit/liquidity, mutual/HNI fund flows, open offers, post-offer advertisements. *(Grouped under "Stocks")*
8. **Trade** — bilateral/multilateral trade deals, tariffs, trade missions, investment treaties. *(Grouped under "Stocks")*
9. **Insurance** — insurance-sector and insurer-specific stories. *(Grouped under "Stocks")*
10. **Growth & Development** — infrastructure and capability-building initiatives: highway awards, Semicon-type schemes, industrial corridors. *(Standalone top-level tab)*
11. **International News** — foreign geopolitics, foreign companies/economies, global markets not centred on an Indian listed company. *(Standalone top-level tab)*
12. **Others** — opinion/editorial pieces, human-interest, sport, product reviews, climate/monsoon/flood/water-stress/natural-resource stories, anything that genuinely doesn't fit above. *(Standalone top-level tab; Environment & Resources-type stories now fold in here — there is no separate Environment tab.)*

**The sector-vs-stock test:** if the story is about one identifiable listed company's numbers/decisions, it's Corporate Events. If it's about an industry/market segment as a whole (even if it names a few example companies), it's Sector.

**The IPO-vs-Market test:** if the story is about a specific company's capital-raise event (new listing, IPO price band/allotment, rights/preferential issue), it's IPO. If it's about trading/liquidity/index mechanics, currency, credit growth, or fund flows not tied to one company's capital raise, it's Market.

**Dedup rule:** if the same underlying event (e.g. a GDP print) generates multiple candidate stories from different pages (the data page, a reaction/quote page, an opinion piece restating the number), merge them into **one** comprehensive story under the correct category — do not publish near-duplicate stories that just restate the same headline fact from different angles. A distinct opinion/editorial take can still go to Others if it adds real independent argument, not just a restatement. This applies **across editions too** when more than one newspaper is published for the same date — see §1's "Cross-edition dedup" note.

## 3b. Only highlight actual company/corporate names with `[[...]]` — never people, ministries, or agencies

Apply `[[...]]` **only** to the genuine company/corporate/fund entity that is the subject of the story: listed companies, PSUs, banks, NBFCs, insurers, promoter holding entities/trusts/LLPs holding shares, and stock exchanges/depositories when referenced as an entity.

**Do NOT wrap in `[[...]]`:**
- Individual people, in any role (CEOs, ministers, analysts, chairpersons, authors) — e.g. write `Nirmala Sitharaman`, not `[[Nirmala Sitharaman]]`.
- Government ministries/departments/regulators (RBI, FSSAI, GST Council, Ministry of X).
- Courts/tribunals (Supreme Court, NCLT, NCLAT).
- Industry/trade associations (Nasscom, AMFI).
- Rating/research/data-source firms cited only as attribution (ICRA, CRISIL, CareEdge, Rystad Energy, Counterpoint Research).
- International organizations, summits, and awards (SCO, United Nations Convention, Ramon Magsaysay Awards).
- Product/scheme/platform names that aren't themselves companies (UPI, iPhone 17, Honda Activa, India Stack).

When in doubt: if the name refers to a company whose stock, results, or corporate decision the story is actually about, highlight it; if it's a person, government body, or cited-as-source organization, leave it as plain text.

## 4. Write summaries — terse, fact-led, key-information only

Do not write long narrative paragraphs. Target style (confirmed by user example):

> "Purple Style Labs Limited, operator of luxury omni-channel fashion platform Pernia's Pop-Up Shop, opened its main-board IPO on BSE and NSE with a price band of ₹546-575 per share, aggregating up to ₹6,800 million as a fresh issue. The company posted a loss of ₹2,853.99 million in FY26 and flagged negative cash flows, high indebtedness, and dependence on top designer brands and its Experience Centers as key risks. Bid/issue closes September 2, 2026."

Lead with the core fact, then only the 2-3 most material supporting details (numbers, dates, risks). Cut adjectives and scene-setting.

## 5. Mark company/entity names for highlighting

Wrap **only genuine company/corporate entity names** (see §3b's KEEP/STRIP rule) that appear in a summary with `[[Name]]`, e.g. `[[HDFC Bank]]`, `[[Vodafone Idea]]`, `[[Purple Style Labs]]`. Do not wrap people, ministries, regulators, courts, industry associations, rating/research firms, or non-company product/scheme names. The client (`components/PaperTree.tsx`) parses these markers and renders them in green + underlined; everything else renders in a lighter gray. Do not leave markers unclosed or nested.

## 6. Build `stocksInFocus`

Separately from the story list, curate a short list (typically 5-10) of the day's most actionable/notable stocks as a top-level `stocksInFocus` array:

```json
"stocksInFocus": [
  { "name": "Augmont Enterprises", "note": "Lists on BSE/NSE today after IPO allotted at ₹788/share, 157.6x subscribed" }
]
```

This renders as the "Stocks in Focus" tab, grouped alongside "Sector" under the "In Focus" top-level tab. (Note: this is a different grouping from the "Stocks" top-level tab, which holds Corporate Events/IPO/Market/Trade/Insurance — don't confuse the two.)

## 7. Write the JSON file

Create/update `scripts/data/<paper_date>-<edition-lowercase>.json` (e.g. `scripts/data/2026-08-31-mumbai.json`):

```json
{
  "edition": "Mumbai",
  "paper_date": "2026-08-31",
  "stories": [
    { "section": "Front Page", "headline": "...", "summary": "... [[Company]] ...", "page_number": 1 }
  ],
  "stocksInFocus": [
    { "name": "...", "note": "..." }
  ]
}
```

If updating an existing day (re-extraction), edit the existing file rather than starting a new one — check `scripts/data/` first.

## 8. Publish to the database

```bash
node scripts/publish-paper.mjs scripts/data/<paper_date>-<edition-lowercase>.json
```

This transactionally deletes+reinserts `paper_stories` for that edition+date and upserts the `paper_meta.stocks_in_focus` JSONB column. Safe to re-run if you edit and republish.

## 9. Publish and push — no local validation

Per standing instruction: do not run local `tsc`/`lint`/dev-server checks. The user checks the live Vercel deployment directly. Just publish (step 8) and push.

## 10. Commit and push immediately

Per standing instruction, commit and push as soon as the DB publish succeeds — do not wait for further confirmation:

```bash
git add -A && git commit -m "..." && git push
```

## Schema reference

- `paper_stories`: `edition, paper_date, section, headline, summary, page_number, display_order` — isolated from `clusters`/`cluster_entities`/`prices`.
- `paper_meta`: `edition, paper_date, stocks_in_focus JSONB` — day-level metadata, PK on (edition, paper_date).
- Query layer: `lib/queries.ts` — `getPaperStories`, `getPaperDays`, `getStocksInFocus`.
- Render layer: `components/PaperTree.tsx` — section-tree sidebar + click-to-expand row list; `renderSummary()` parses `[[...]]` markers.
