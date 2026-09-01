---
name: publish-epaper
description: Extract stories from a new day's e-paper PDF (~/Documents/epapers/) and publish them to FinBrief's "Today's Paper" feature. Use whenever the user says they've uploaded/added a new day's e-paper, or asks to extract/publish/update today's paper.
---

# Publish a new day's e-paper to Today's Paper

This is a recurring daily task. Follow this exact pipeline instead of re-deriving it — the format, gotchas, and verification steps below were worked out over several iterations.

## 1. Locate the source

PDF lives in `~/Documents/epapers/`. Ask the user for the exact filename/date/edition if not obvious (usually "Mumbai" edition). Determine the target `paper_date` (IST date, `YYYY-MM-DD`).

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

The `section` field must be one of these 11 fixed values, in this exact order (this is also the required sidebar/display order — write the `stories` array grouped in this sequence):

1. **Economy & Policy** — macro data and government economic policy: GDP, fiscal deficit, RBI/CEA/FinMin commentary, FDI policy, PMI, services-sector output, GST Council, debt targets.
2. **IPO & Market** — anything about the capital markets: new listings, IPO price bands/allotments, rights issues, open offers, buybacks, stock index/auction moves, currency, bank credit/liquidity, mutual/HNI fund flows.
3. **Sectors in Focus** — industry-wide trends that aren't about one company: e.g. "$50-bn medtech sector by FY30" or "premium phones fly, budget ones flag" — a whole sector's dynamics, not a single stock's news.
4. **Environment & Resources** — climate, monsoon, floods, water stress, natural-resource stories.
5. **Growth & Development** — infrastructure and capability-building initiatives: highway awards, Semicon-type schemes, industrial corridors.
6. **International News** — foreign geopolitics, foreign companies/economies, global markets not centred on an Indian listed company.
7. **Regulatory** — court/tribunal/NCLT/NCLAT rulings, SEBI/FSSAI/regulator orders and bans, AGM/e-voting notices, SARFAESI/possession notices, lost-share-certificate notices, government fare/price orders.
8. **Trade** — bilateral/multilateral trade deals, tariffs, trade missions, investment treaties.
9. **Insurance** — insurance-sector and insurer-specific stories.
10. **Corporate Events** — single-company news: results, capex/capacity announcements, M&A, leadership changes, stake sales — e.g. "SJVN capacity up 1,730 MW" is stock-specific, so it's Corporate Events, not Sectors in Focus.
11. **Others** — opinion/editorial pieces, human-interest, sport, product reviews, anything that genuinely doesn't fit above.

**The sector-vs-stock test:** if the story is about one identifiable listed company's numbers/decisions, it's Corporate Events. If it's about an industry/market segment as a whole (even if it names a few example companies), it's Sectors in Focus.

**Dedup rule:** if the same underlying event (e.g. a GDP print) generates multiple candidate stories from different pages (the data page, a reaction/quote page, an opinion piece restating the number), merge them into **one** comprehensive story under the correct category — do not publish near-duplicate stories that just restate the same headline fact from different angles. A distinct opinion/editorial take can still go to Others if it adds real independent argument, not just a restatement.

## 4. Write summaries — terse, fact-led, key-information only

Do not write long narrative paragraphs. Target style (confirmed by user example):

> "Purple Style Labs Limited, operator of luxury omni-channel fashion platform Pernia's Pop-Up Shop, opened its main-board IPO on BSE and NSE with a price band of ₹546-575 per share, aggregating up to ₹6,800 million as a fresh issue. The company posted a loss of ₹2,853.99 million in FY26 and flagged negative cash flows, high indebtedness, and dependence on top designer brands and its Experience Centers as key risks. Bid/issue closes September 2, 2026."

Lead with the core fact, then only the 2-3 most material supporting details (numbers, dates, risks). Cut adjectives and scene-setting.

## 5. Mark company/entity names for highlighting

Wrap every company/entity name that appears in a summary with `[[Name]]`, e.g. `[[HDFC Bank]]`, `[[Vodafone Idea]]`, `[[Purple Style Labs]]`. The client (`components/PaperTree.tsx`) parses these markers and renders them in green + underlined; everything else renders in a lighter gray. Do not leave markers unclosed or nested.

## 6. Build `stocksInFocus`

Separately from the story list, curate a short list (typically 5-10) of the day's most actionable/notable stocks as a top-level `stocksInFocus` array:

```json
"stocksInFocus": [
  { "name": "Augmont Enterprises", "note": "Lists on BSE/NSE today after IPO allotted at ₹788/share, 157.6x subscribed" }
]
```

This renders as its own sidebar tab ("Stocks in Focus"), positioned right after "IPO & Market" — it is not embedded inside that section.

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

## 9. Verify before considering it done

```bash
rm -rf .next && npx tsc --noEmit && npm run lint
lsof -ti:4000 | xargs kill -9 2>/dev/null; npm run dev > /tmp/dev.log 2>&1 &
sleep 5
curl -s "http://localhost:4000/?date=<paper_date>" -o /tmp/page.html -w "%{http_code}\n"
kill $(lsof -ti:4000) 2>/dev/null
```

Check the rendered (non-script) HTML has no leaked `[[...]]` markers — raw `[[...]]` text embedded inside `<script>` tags (React hydration payload) is expected and fine; only flag it if it appears in visible DOM text outside `<script>`.

## 10. Commit and push immediately

Per standing instruction, commit and push as soon as verification passes — do not wait for further confirmation:

```bash
git add -A && git commit -m "..." && git push
```

## Schema reference

- `paper_stories`: `edition, paper_date, section, headline, summary, page_number, display_order` — isolated from `clusters`/`cluster_entities`/`prices`.
- `paper_meta`: `edition, paper_date, stocks_in_focus JSONB` — day-level metadata, PK on (edition, paper_date).
- Query layer: `lib/queries.ts` — `getPaperStories`, `getPaperDays`, `getStocksInFocus`.
- Render layer: `components/PaperTree.tsx` — section-tree sidebar + click-to-expand row list; `renderSummary()` parses `[[...]]` markers.
