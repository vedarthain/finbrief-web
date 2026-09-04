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
4. **Sector** — industry-wide trends that aren't about one company: e.g. "$50-bn medtech sector by FY30" or "premium phones fly, budget ones flag" — a whole sector's dynamics, not a single stock's news. *(Grouped under "In Focus", alongside the separately-curated `stocksInFocus` "Stocks in Focus" tab)* Every Sector story must also carry an `"industry"` field — a short (1-3 word) tag naming the specific industry, e.g. `"Medtech"`, `"Smartphones"`, `"Dairy/FMCG"`, `"AI/Enterprise Tech"`. This renders as a small badge next to the headline so readers can tell sectors apart at a glance without opening each story. `industry` is optional on every other section (leave it off) — it only applies to `section: "Sector"`.
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

## 3c. Flag routine notices with `is_notice` — don't let compliance filings drown the news

AGM notices, postal-ballot notices, SARFAESI/possession/demand notices, lost-share-certificate notices, e-auction sale notices, and open-offer corrigenda are real content (still classify them under `Regulatory` per §3a) but are **not news** — a reader shouldn't have to page past 80 of them to find the 3 regulatory stories that matter. Set `"is_notice": true` on every one of these. The UI hides `is_notice: true` stories from the default section view and puts them behind a "Show N routine notices" toggle — so still extract every distinct company/entity name per §3 (don't skip them), just tag them correctly so they don't bury real news.

Only routine/templated compliance filings get `is_notice: true`. A regulator *ruling*, *order*, *ban*, or *policy review* (SC/NCLT judgment, Sebi order, FSSAI crackdown, CCI action) is real regulatory news — leave `is_notice` unset (defaults to `false`) even though it's also classified as `Regulatory`.

## 3d. Score `importance` 1–5 on every story

Add `"importance"` (integer 1–5) to every story — it drives the default sort within each section (highest first) and feeds the Top Stories digest in §6b. Calibrate roughly:

- **5** — front-page-lead-caliber: major index moves, marquee M&A, big-name IPO listings, landmark court/regulator rulings, significant macro prints (GDP, budget, RBI policy).
- **4** — solidly newsworthy single-company or sector story most readers would want to see.
- **3** (default, omit the field to accept this) — routine but real news: a smaller corporate announcement, a minor policy update.
- **2** — marginal/niche interest.
- **1** — filler; typically pairs with `is_notice: true`, though not every `importance: 1` story need be a notice.

Don't grade on a curve within one paper — use the same 1–5 scale you'd apply across any day so sort order stays meaningful.

## 3e. Notices don't need highlighting or IPO-listing entries

`is_notice: true` stories are exempt from the terse-summary style in §4 (a one-line "Company X: notice of Nth AGM" is fine) and from `[[...]]` highlighting in §3b/§5 — they're not prose the reader is meant to read closely, just kept queryable/searchable. Do not create `ipoListings` entries from notice-type stories (SARFAESI/lost-share-cert/AGM) — `ipoListings` is only for actual capital-raise events per §6a.

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

## 6b. Build `topStories` — a cross-section digest so a reader never has to open every tab

Separately from `stocksInFocus`, curate a top-level `topStories` array: 10-15 of the single most important items of the day, spanning **any** section (not just Stocks/IPO) — this is what actually solves "too many stories to read." Pull from your own `importance: 5` (and top `importance: 4`) picks:

```json
"topStories": [
  { "headline": "Sensex swings ~4,000 points intraday, triggers Sebi review", "section": "Market", "note": "One-line context beyond the headline, optional." }
]
```

`headline` should match (or closely mirror) the corresponding story's headline so a reader can find the full item in its section; `section` is whatever leaf section it lives under (for display only, not a lookup key); `note` is optional. This renders as its own top-level "Top Stories" tab, shown first.

## 6a. Build `ipoListings` — structured data for the separate "IPO & Listings" tab

This is a **separate feature from the "IPO" section/tab** built in §3a-§6 above. The IPO section holds prose story summaries; `ipoListings` feeds a dedicated table page (`/ipo`, `components/IpoTable.tsx`) with structured columns (price band, dates, listing price, live current price). Populate both — they render in different places and are not redundant.

For every story you classified as `section: "IPO"` (new listings, price bands, allotments, rights/preferential issues) **and** any other page that reports an IPO opening/closing/listing today, also add one entry to a top-level `ipoListings` array:

```json
"ipoListings": [
  {
    "company_name": "Purple Style Labs",
    "ticker": null,
    "exchange": "BSE, NSE",
    "issue_price_low": 546,
    "issue_price_high": 575,
    "open_date": "2026-08-31",
    "close_date": "2026-09-02",
    "listing_date": null,
    "listing_price": null,
    "status": "open",
    "notes": "Main-board IPO; ₹6,800M fresh issue"
  }
]
```

Rules:
- `company_name` is the upsert key (`ipo_listings.company_name UNIQUE`) — use the exact same spelling every time this company appears across days so re-publishing updates the same row instead of creating a duplicate as the IPO progresses through its lifecycle.
- `status` — pick exactly one: `"upcoming"` (announced, bidding not yet open), `"open"` (bidding window active on `paper_date`), `"closed"` (bidding closed, allotment/listing pending), `"listed"` (listed on or before `paper_date`).
- `ticker` — only set it if the paper states the exact listed ticker/symbol (usually only known once `status` is `"listed"` or allotment is announced). Leave `null` otherwise — do not guess a ticker. When a `ticker` is set and that symbol is already tracked in the `prices` table, the UI automatically shows a live current price and %-change since listing; if not tracked, those columns just stay blank, which is fine.
- `listing_price` — only set once the stock has actually listed (i.e. `status: "listed"`); leave `null` before that.
- Re-extraction across days: if the same IPO is mentioned again on a later day's paper (e.g. it closed, or it listed), update `status`/`close_date`/`listing_date`/`listing_price`/`ticker` in that day's `ipoListings` entry — the upsert on `company_name` keeps a single row per company current.

## 7. Write the JSON file

Create/update `scripts/data/<paper_date>-<edition-lowercase>.json` (e.g. `scripts/data/2026-08-31-mumbai.json`):

```json
{
  "edition": "Mumbai",
  "paper_date": "2026-08-31",
  "stories": [
    { "section": "Front Page", "headline": "...", "summary": "... [[Company]] ...", "page_number": 1, "importance": 5 },
    { "section": "Sector", "headline": "...", "summary": "...", "page_number": 5, "industry": "Medtech", "importance": 3 },
    { "section": "Regulatory", "headline": "Foo Ltd: notice of 20th AGM", "summary": "Foo Ltd: notice of 20th AGM.", "page_number": 18, "is_notice": true, "importance": 1 }
  ],
  "stocksInFocus": [
    { "name": "...", "note": "..." }
  ],
  "topStories": [
    { "headline": "...", "section": "Market", "note": "..." }
  ],
  "ipoListings": [
    { "company_name": "...", "ticker": null, "exchange": "...", "issue_price_low": 0, "issue_price_high": 0,
      "open_date": "...", "close_date": "...", "listing_date": null, "listing_price": null,
      "status": "open", "notes": "..." }
  ]
}
```

`importance` and `is_notice` are both optional per story (default `3` and `false` respectively) — set them explicitly per §3c/§3d rather than relying on the default whenever you have a real signal. `topStories` is optional; omit only if truly nothing rises above routine that day.

`ipoListings` is optional — omit it entirely on days with no IPO/listing activity.

If updating an existing day (re-extraction), edit the existing file rather than starting a new one — check `scripts/data/` first.

## 8. Publish to the database

```bash
node scripts/publish-paper.mjs scripts/data/<paper_date>-<edition-lowercase>.json
```

This transactionally deletes+reinserts `paper_stories` for that edition+date, upserts the `paper_meta.stocks_in_focus` JSONB column, and upserts any `ipoListings` entries into `ipo_listings` (keyed on `company_name`, so it's safe to re-run and safe for the same company to reappear across multiple days as its IPO progresses). Safe to re-run if you edit and republish.

## 9. Publish and push — no local validation

Per standing instruction: do not run local `tsc`/`lint`/dev-server checks. The user checks the live Vercel deployment directly. Just publish (step 8) and push.

## 10. Commit and push immediately

Per standing instruction, commit and push as soon as the DB publish succeeds — do not wait for further confirmation:

```bash
git add -A && git commit -m "..." && git push
```

## Schema reference

- `paper_stories`: `edition, paper_date, section, headline, summary, page_number, industry, display_order, is_notice, importance` — isolated from `clusters`/`cluster_entities`/`prices`. `is_notice` (§3c) and `importance` (§3d) are the two ranking/filtering signals; `getPaperStories` sorts `is_notice ASC, importance DESC, display_order ASC`.
- `paper_meta`: `edition, paper_date, stocks_in_focus JSONB, top_stories JSONB` — day-level metadata, PK on (edition, paper_date). `top_stories` is the §6b cross-section digest.
- `ipo_listings`: `company_name (UNIQUE), ticker, exchange, issue_price_low, issue_price_high, open_date, close_date, listing_date, listing_price, status, notes` — separate table backing the "IPO & Listings" tab (`/ipo`); upserted on `company_name` by the `ipoListings` array in the same publish JSON (§6a). `ticker`, when set and present in `prices`, drives a live current-price/% column — see `scripts/ipo_schema.sql`.
- Query layer: `lib/queries.ts` — `getPaperStories`, `getPaperDays`, `getStocksInFocus`, `getTopStories`, `getIpoListings`.
- Render layer: `components/PaperTree.tsx` — "Top Stories" tab (from `getTopStories`) shown first, then section-tree sidebar + click-to-expand row list; a search box filters headline+summary across every section; `is_notice` stories are hidden per-section behind a "Show N routine notices" toggle; `renderSummary()` parses `[[...]]` markers. `components/IpoTable.tsx` — structured IPO/listing table, separate page (`app/ipo/page.tsx`).
- Standalone publish path for the IPO table without a full e-paper pull: `node scripts/publish-ipo.mjs path/to/ipos.json` (same shape/upsert semantics as the `ipoListings` array, useful for out-of-band updates like a listing-day price correction).
