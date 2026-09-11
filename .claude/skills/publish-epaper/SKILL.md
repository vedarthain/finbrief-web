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

The `section` field must be one of these 14 fixed leaf values. The UI groups them into top-level tabs (with sub-tabs for grouped ones) — write the `stories` array in this exact leaf order, since `display_order` is derived purely from array position:

1. **Economy** — macro data and government economic commentary: GDP, fiscal deficit, RBI/CEA/FinMin commentary, PMI, services-sector output, debt targets. *(Top-level tab: Economy)*
2. **Policy** — government policy decisions/proposals: FDI-norm changes, GST Council meetings, sector policy notifications. *(Standalone top-level tab)*
3. **Regulatory** — court/tribunal/NCLT/NCLAT rulings, SEBI/FSSAI/regulator orders and bans, AGM/e-voting notices, SARFAESI/possession notices, lost-share-certificate notices, government fare/price orders. *(Standalone top-level tab)*
4. **Sector** — industry-wide trends that aren't about one company: e.g. "$50-bn medtech sector by FY30" or "premium phones fly, budget ones flag" — a whole sector's dynamics, not a single stock's news. *(Standalone top-level tab — "Stocks in Focus" is a separately-curated ribbon tab from `stocksInFocus`, not part of this leaf's grouping)* Every Sector story must also carry an `"industry"` field — a short (1-3 word) tag naming the specific industry, e.g. `"Medtech"`, `"Smartphones"`, `"Dairy/FMCG"`, `"AI/Enterprise Tech"`. This renders as a small badge next to the headline so readers can tell sectors apart at a glance without opening each story. `industry` is optional on every other section (leave it off) — it only applies to `section: "Sector"`.
5. **Announcements** — single-company news that is a statement, plan, or intention rather than a completed transaction or a personnel move: stated intentions/plans not yet executed ("eyes foray into X", "aims to chase Y", "mulls Z"), corporate statements/clarifications/responses to press queries. *(Standalone top-level tab, displayed as "Corporate Announcements")*
6. **Appointments** — executive/leadership personnel moves at any notable company, domestic or international: CEO/MD/chairman/CXO-level appointments, resignations, promotions, successions, board reconstitutions. *(Standalone top-level tab, displayed as "Corporate Appointments")*
7. **Events** — single-company news describing something that concretely happened/closed: results announced, M&A or stake-sale deals signed/closed, capex/capacity commissioned or expanded, regulatory clearance obtained for a completed deal, funding rounds closed, facility/JV launches — e.g. "SJVN capacity up 1,730 MW" or "Zollner enters India with Avalon JV" is a completed action, so it's Events, not Announcements. *(Standalone top-level tab, displayed as "Corporate Events")*
8. **IPO** — new listings, IPO price bands/allotments/proceeds, rights issues, preferential issues. *(Standalone top-level tab)*
9. **Market** — index/auction moves, currency, bank credit/liquidity, mutual/HNI fund flows, open offers, post-offer advertisements. *(Standalone top-level tab)*
10. **Trade** — bilateral/multilateral trade deals, tariffs, trade missions, investment treaties. *(Standalone top-level tab)*
11. **Insurance** — insurance-sector and insurer-specific stories. *(Standalone top-level tab)*
12. **Growth & Development** — infrastructure and capability-building initiatives: highway awards, Semicon-type schemes, industrial corridors. *(Standalone top-level tab)*
13. **International News** — foreign geopolitics, foreign companies/economies, global markets not centred on an Indian listed company. *(Standalone top-level tab)*
14. **Others** — opinion/editorial pieces, human-interest, sport, product reviews, climate/monsoon/flood/water-stress/natural-resource stories, anything that genuinely doesn't fit above. *(Standalone top-level tab; Environment & Resources-type stories now fold in here — there is no separate Environment tab.)*

**The Announcements-vs-Appointments test:** if the story is specifically about a named executive/leadership role changing hands (someone appointed, resigning, promoted, or succeeding another), it's Appointments — regardless of whether the story is phrased as a completed move or a stated plan ("board to consider CEO succession" is still Appointments, not Announcements). Announcements is for company-level statements/intentions/plans that are *not* about a personnel change.

**The Announcements-vs-Events test:** if the story is a plan or intention (and not a personnel move — see the Announcements-vs-Appointments test above), it's Announcements. If it's a transaction/action that has actually closed or occurred (results, a signed deal, a commissioned plant, a cleared regulatory approval), it's Events. When in doubt, ask "did this already happen, or is it being said/planned?" — happened → Events, said/planned → Announcements.

**Note:** there is no single combined "Corporate" tab — "Announcements", "Appointments", and "Events" are three separate standalone top-level tabs (displayed as "Corporate Announcements" / "Corporate Appointments" / "Corporate Events"), each showing only its own leaf's stories. Likewise IPO/Market/Trade/Insurance are four separate standalone tabs, not grouped under one "Stocks" tab.

**The sector-vs-stock test:** if the story is about one identifiable listed company's numbers/decisions, it's Announcements or Events (see the Announcements-vs-Events test above). If it's about an industry/market segment as a whole (even if it names a few example companies), it's Sector.

**The IPO-vs-Market test:** if the story is about a specific company's capital-raise event (new listing, IPO price band/allotment, rights/preferential issue), it's IPO. If it's about trading/liquidity/index mechanics, currency, credit growth, or fund flows not tied to one company's capital raise, it's Market.

**Dedup rule:** if the same underlying event (e.g. a GDP print) generates multiple candidate stories from different pages (the data page, a reaction/quote page, an opinion piece restating the number), merge them into **one** comprehensive story under the correct category — do not publish near-duplicate stories that just restate the same headline fact from different angles. A distinct opinion/editorial take can still go to Others if it adds real independent argument, not just a restatement. This applies **across editions too** when more than one newspaper is published for the same date — see §1's "Cross-edition dedup" note.

## 3c. Flag routine notices with `is_notice` — don't let compliance filings drown the news

AGM notices, postal-ballot notices, SARFAESI/possession/demand notices, lost-share-certificate notices, e-auction sale notices, and open-offer corrigenda are real content (still classify them under `Regulatory` per §3a) but are **not news** — a reader shouldn't have to page past 80 of them to find the 3 regulatory stories that matter. Set `"is_notice": true` on every one of these. Every section's default view excludes `is_notice: true` stories entirely; they surface only via a dedicated "Routine Notices" top-ribbon tab (a peer of Top Stories/Market Impact/Stocks in Focus, not a toggle layered on top of whichever section you're browsing) that lists every notice from every section at once — so still extract every distinct company/entity name per §3 (don't skip them), just tag them correctly so they don't bury real news.

Only routine/templated compliance filings get `is_notice: true`. A regulator *ruling*, *order*, *ban*, or *policy review* (SC/NCLT judgment, Sebi order, FSSAI crackdown, CCI action) is real regulatory news — leave `is_notice` unset (defaults to `false`) even though it's also classified as `Regulatory`.

## 3d. Score `importance` 1–5 on every story

Add `"importance"` (integer 1–5) to every story — it drives the default sort within each section (highest first) and feeds the Top Stories digest in §6b. Calibrate roughly:

- **5** — front-page-lead-caliber: major index moves, marquee M&A, big-name IPO listings, landmark court/regulator rulings, significant macro prints (GDP, budget, RBI policy).
- **4** — solidly newsworthy single-company or sector story most readers would want to see.
- **3** (default, omit the field to accept this) — routine but real news: a smaller corporate announcement, a minor policy update.
- **2** — marginal/niche interest.
- **1** — filler; typically pairs with `is_notice: true`, though not every `importance: 1` story need be a notice.

Don't grade on a curve within one paper — use the same 1–5 scale you'd apply across any day so sort order stays meaningful.

All non-notice stories are shown by default within their section (only `is_notice: true` routine filings are excluded — see §3c's "Routine Notices" tab) — `importance` no longer hides anything, it only drives sort order within a section and feeds Top Stories/Market Impact digest selection in §6b/§6c. Score honestly anyway: a real 2 still sorts below a real 4, keeping the most-relevant items at the top of a long section even though every item remains visible.

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

This renders as its own "Stocks in Focus" ribbon tab (next to Top Stories/Market Impact), separate from the standalone "Sector" sidebar tab — don't confuse the two: `stocksInFocus` entries are short name+note pairs, `section: "Sector"` stories are full prose stories about an industry.

## 6b. Build `topStories` — a cross-section digest so a reader never has to open every tab

Separately from `stocksInFocus`, curate a top-level `topStories` array: 10-15 of the single most important items of the day, spanning **any** section (not just Stocks/IPO) — this is what actually solves "too many stories to read." Pull from your own `importance: 5` (and top `importance: 4`) picks:

```json
"topStories": [
  { "headline": "Sensex swings ~4,000 points intraday, triggers Sebi review", "section": "Market", "note": "One-line context beyond the headline, optional." }
]
```

`headline` **must be copied verbatim, character-for-character**, from the corresponding entry in `stories` — not paraphrased, reworded, shortened, or "closely mirrored". The UI (`components/PaperTree.tsx`) does an exact-string lookup of `topStories[i].headline` against every story's `headline` to render the full multi-bullet summary when a reader opens a digest item; even a small wording drift (different punctuation, "September 25" vs "Sept 25", a dropped clause) breaks that lookup and silently falls back to showing just the one-line `note` — which is exactly the "scattered as a 1-liner" bug reported and fixed on 2026-09-10 across 17 entries in one day's data. The safest way to guarantee this: write the `stories` array first, then build `topStories`/`marketImpact` by copy-pasting each `headline` string directly out of the story object you're citing, never retyping it from memory. `section` is whatever leaf section it lives under (for display only, not a lookup key); `note` is optional. This renders as its own top-level "Top Stories" tab, shown first.

**Verify before publishing:** every `topStories[i].headline` and `marketImpact[i].headline` must appear as an exact `headline` value somewhere in `stories`. Spot-check this explicitly (e.g. a quick grep/diff pass) before treating the day's JSON as done — do not rely on "it looked close enough" during curation.

## 6c. Build `marketImpact` — a causal filter for news that moves prices, not a re-labeling of the "Market" section

Separately again from `stocksInFocus`/`topStories`, curate a top-level `marketImpact` array: every story from the day — from **any** of the 14 sections — that a trader/investor would treat as directly price-moving, either for a broad index or for a specific listed stock. This is not the same thing as `section: "Market"` (which is just one of the 14 fixed taxonomy leaves, covering trading/liquidity/index-mechanics/currency/credit/fund-flow stories as a topic). A story can be `section: "Economy"` or `section: "Events"` and still belong in `marketImpact` if it's the kind of news that would actually swing a price — conversely a routine `section: "Market"` story (e.g. a small mutual-fund-flow update) need not be included here if it's not really moving anything.

Typical candidates: major index/Sensex/Nifty swings and their triggers, RBI policy decisions and rate moves, GDP/inflation/fiscal prints, marquee M&A or stake-sale announcements, quarterly results from large-cap/index-heavyweight companies, big IPO listings/allotments, landmark court or regulator rulings against a listed company, credit-rating actions on listed debt, currency/crude moves with broad market read-through.

```json
"marketImpact": [
  { "headline": "Sensex swings ~4,000 points intraday, triggers Sebi review", "section": "Market", "note": "One-line context on why this moves the market, optional." }
]
```

Shape is identical to `topStories` (`headline`, `section`, optional `note`) — `headline` **must be copied verbatim** from the corresponding `stories` entry, same exact-match rule as §6b (copy-paste it, don't retype it), so the reader can jump to the full item; `section` is the leaf section for display only. Some overlap between `topStories` and `marketImpact` is expected and fine (a big Sensex swing is both a top story and market-moving); they are independent curation passes with different questions in mind — "most important today" vs. "moves prices" — not a subset/superset relationship, so don't try to derive one from the other. **But independent curation should mean mostly-independent results** — if you find yourself re-selecting most of the same headlines you already put in `topStories`, you're re-labeling Top Stories rather than actually asking "does this move a price" for every section. As a rough check before finishing: more than half of `marketImpact` duplicating `topStories` verbatim is a sign the pass wasn't done independently — go back through the *other* sections' `importance: 4`/`5` stories that didn't make `topStories` and ask whether any of them are genuinely price-moving even though they weren't "most important overall." The app also enforces this at render time — the Market Impact rail/tab drops any headline already shown in Top Stories, so an over-duplicated `marketImpact` list will visibly shrink to just its non-overlapping stories once published, which is a good signal your curation leaned too heavily on Top Stories. This renders as its own top-level "Market Impact" tab. `marketImpact` is optional; omit only if truly nothing in the day's paper is price-moving (rare).

## 6a. Build `ipoListings` — structured data for the separate "IPO & Listings" tab

This is a **separate feature from the "IPO" section/tab** built in §3a-§6 above. The IPO section holds prose story summaries; `ipoListings` feeds a dedicated table page (`/ipo`, `components/IpoTable.tsx`) with structured columns (price band, dates, listing price, live current price). Populate both — they render in different places and are not redundant.

**Every single `section: "IPO"` story must have a matching `ipoListings` entry — no exceptions.** This is what makes the story's description panel on the Today's Paper page render as the structured Key-detail/Information table instead of falling back to plain bullet-point prose; a reader should never see the fallback bullet layout for an IPO-section story. Before finishing a day's extraction, cross-check: every `headline` under `section: "IPO"` in `stories` must be matchable (per the `company_name`/`aliases` rule below) against some entry in `ipoListings`.

For every story you classified as `section: "IPO"` (new listings, price bands, allotments, rights/preferential issues) **and** any other page that reports an IPO opening/closing/listing today, add one entry to a top-level `ipoListings` array:

```json
"ipoListings": [
  {
    "company_name": "Purple Style Labs Limited",
    "ticker": null,
    "exchange": "BSE, NSE",
    "issue_price_low": 546,
    "issue_price_high": 575,
    "open_date": "2026-08-31",
    "close_date": "2026-09-02",
    "listing_date": null,
    "listing_price": null,
    "status": "open",
    "notes": "Main-board IPO; ₹6,800M fresh issue",
    "offer_type": "Fresh issue",
    "issue_size": "Up to ₹6,800 million",
    "sellers": null,
    "implied_valuation": null,
    "fresh_issue": "₹6,800 million",
    "offer_for_sale": null,
    "aliases": null
  }
]
```

Rules:
- `company_name` is the upsert key (`ipo_listings.company_name UNIQUE`) — use the exact same spelling every time this company appears across days so re-publishing updates the same row instead of creating a duplicate as the IPO progresses through its lifecycle. **Always use the company's full registered/legal name** (including "Limited"/"Ltd" if that's how the paper refers to it in the prospectus context), not a shortened informal form — a later day dropping or adding "Limited" is the single most common cause of accidental duplicate rows for the same company. **This is not just a style preference — it silently breaks the reader-facing UI**: `components/PaperTree.tsx` matches an "IPO"-section story's headline against `company_name` (stripping only a trailing "Limited"/"Ltd") to decide whether to show the structured fact-sheet table inline; a stray duplicate row with the un-suffixed name and empty structured fields can still match and win, making the table silently render as empty bullets even though a complete row exists under the "Limited" spelling. This exact bug happened on 2026-09-10 for Rentomojo/Rentomojo Limited — if you're ever unsure whether a company already has a row, check `SELECT company_name FROM ipo_listings WHERE company_name ILIKE '%stem%'` before publishing rather than risk a second row.
- `status` — pick exactly one: `"upcoming"` (announced, bidding not yet open), `"open"` (bidding window active on `paper_date`), `"closed"` (bidding closed, allotment/listing pending), `"listed"` (listed on or before `paper_date`). There is no `"closing"` status — bidding that closes on `paper_date` is still `"open"` until the next day's update flips it to `"closed"`.
- `ticker` — only set it if the paper states the exact listed ticker/symbol (usually only known once `status` is `"listed"` or allotment is announced). Leave `null` otherwise — do not guess a ticker. When a `ticker` is set and that symbol is already tracked in the `prices` table, the UI automatically shows a live current price and %-change since listing; if not tracked, those columns just stay blank, which is fine.
- `listing_price` — only set once the stock has actually listed (i.e. `status: "listed"`); leave `null` before that.
- `offer_type`/`issue_size`/`sellers`/`implied_valuation`/`fresh_issue`/`offer_for_sale` — short display strings (not raw numbers) that feed the click-to-expand fact-sheet card, both on the IPO & Listings page (`components/IpoTable.tsx`) and inline under a matching "IPO"-section story on the Today's Paper page (`components/PaperTree.tsx`). The fact sheet's row order/labels are: **Fresh issue**, **Offer for sale**, **Selling investors** (= `sellers`), **Offer structure** (= `offer_type`, e.g. "Fresh issue + offer for sale"), **Price range** (derived automatically from `issue_price_low`/`issue_price_high`, don't duplicate it in a field), **Closing date** (= `close_date`), **Expected listing** (= `listing_date`). Prefer splitting the fresh-issue and OFS amounts into `fresh_issue`/`offer_for_sale` individually whenever the paper states them separately (e.g. `fresh_issue: "₹150 crore"`, `offer_for_sale: "Large OFS by existing investors"`); only fall back to the combined `issue_size` string when the paper doesn't break the two out. It's fine to leave any of these fields `null` if the source doesn't report that detail — the UI falls back to showing `notes` as plain text when none of them are set. Don't infer or estimate a number that isn't stated in the paper.
- Re-extraction across days: if the same IPO is mentioned again on a later day's paper (e.g. it closed, or it listed), update `status`/`close_date`/`listing_date`/`listing_price`/`ticker` in that day's `ipoListings` entry — the upsert on `company_name` keeps a single row per company current. Same rule applies to `offer_type`/`issue_size`/`sellers`/`implied_valuation`/`fresh_issue`/`offer_for_sale`/`aliases`: update them if the later story adds/corrects that detail, otherwise leave them as previously set (the upsert overwrites with whatever you send, including `null`, so only omit re-sending a field's known value if you genuinely don't want to touch it — safest is to re-send the same value you already have on file if you're not re-deriving it fresh).
- `aliases` — the headline-to-`ipo_listings` match (`components/PaperTree.tsx`) checks the headline for either the `company_name` stem or one of these comma-separated phrases, and is what decides whether the story renders the structured table or falls back to bullets. Only needed when the company is commonly referred to by a short form that headlines use *instead of* the full legal name — e.g. `"National Stock Exchange of India Limited"` needs `aliases: "NSE IPO, NSE public offering, NSE eyes listing, National Stock Exchange"` because headlines like "NSE IPO shrinks as SBI, BoB, MS Strategic cut OFS size" never contain the full name. **Never set a bare 2-3 letter abbreviation alone** (e.g. just `"NSE"`) — nearly every other IPO story's headline/venue mention also contains that same substring ("... lists on BSE, NSE", "... NSE Emerge IPO"), so a bare alias causes a *different* company's story to wrongly show this company's fact sheet. Always use multi-word, self-referential phrases specific enough that they'd only appear in a headline actually about this company.

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
  "marketImpact": [
    { "headline": "...", "section": "Economy", "note": "..." }
  ],
  "ipoListings": [
    { "company_name": "...", "ticker": null, "exchange": "...", "issue_price_low": 0, "issue_price_high": 0,
      "open_date": "...", "close_date": "...", "listing_date": null, "listing_price": null,
      "status": "open", "notes": "...",
      "offer_type": "...", "issue_size": "...", "sellers": null, "implied_valuation": null,
      "fresh_issue": null, "offer_for_sale": null, "aliases": null }
  ]
}
```

`importance` and `is_notice` are both optional per story (default `3` and `false` respectively) — set them explicitly per §3c/§3d rather than relying on the default whenever you have a real signal. `topStories` and `marketImpact` are both optional; omit only if truly nothing rises above routine (§6b) or nothing is genuinely price-moving (§6c) that day.

`ipoListings` is optional — omit it entirely on days with no IPO/listing activity.

If updating an existing day (re-extraction), edit the existing file rather than starting a new one — check `scripts/data/` first.

## 8. Publish to the database

```bash
node scripts/publish-paper.mjs scripts/data/<paper_date>-<edition-lowercase>.json
```

This transactionally deletes+reinserts `paper_stories` for that edition+date, upserts the `paper_meta.stocks_in_focus`/`top_stories`/`market_impact` JSONB columns, and upserts any `ipoListings` entries into `ipo_listings` (keyed on `company_name`, so it's safe to re-run and safe for the same company to reappear across multiple days as its IPO progresses). Safe to re-run if you edit and republish.

## 9. Publish and push — no local validation

Per standing instruction: do not run local `tsc`/`lint`/dev-server checks. The user checks the live Vercel deployment directly. Just publish (step 8) and push.

## 10. Commit and push immediately

Per standing instruction, commit and push as soon as the DB publish succeeds — do not wait for further confirmation:

```bash
git add -A && git commit -m "..." && git push
```

## Schema reference

- `paper_stories`: `edition, paper_date, section, headline, summary, page_number, industry, display_order, is_notice, importance` — isolated from `clusters`/`cluster_entities`/`prices`. `is_notice` (§3c) and `importance` (§3d) are the two ranking/filtering signals; `getPaperStories` sorts `is_notice ASC, importance DESC, display_order ASC`.
- `paper_meta`: `edition, paper_date, stocks_in_focus JSONB, top_stories JSONB, market_impact JSONB` — day-level metadata, PK on (edition, paper_date). `top_stories` is the §6b cross-section digest; `market_impact` is the §6c price-moving-news digest.
- `ipo_listings`: `company_name (UNIQUE), ticker, exchange, issue_price_low, issue_price_high, open_date, close_date, listing_date, listing_price, status, notes, offer_type, issue_size, sellers, implied_valuation, fresh_issue, offer_for_sale, aliases` — separate table backing the "IPO & Listings" tab (`/ipo`) and the inline fact-sheet table under a matching "IPO"-section story on the Today's Paper page (`components/PaperTree.tsx`); upserted on `company_name` by the `ipoListings` array in the same publish JSON (§6a). `ticker`, when set and present in `prices`, drives a live current-price/% column — see `scripts/ipo_schema.sql`.
- Query layer: `lib/queries.ts` — `getPaperStories`, `getPaperDays`, `getStocksInFocus`, `getTopStories`, `getMarketImpactStories`, `getIpoListings`.
- Render layer: `components/PaperTree.tsx` — "Top Stories", "Market Impact", "Stocks in Focus" (from `getTopStories`/`getMarketImpactStories`/`getStocksInFocus`), and "Routine Notices" (every `is_notice: true` story across every section, flattened) are four peer top-level ribbon tabs, mutually exclusive by construction since selecting any of them just sets the same `activeLeaf` state a sidebar section selection would — never more than one lit up at once. All four share the same dark `#182131` active styling used for sidebar groups and IPO status pills, rather than each tab's own pale color tint. The calendar (`components/DatePicker.tsx`) lives in the page header (`app/page.tsx`/`app/ipo/page.tsx`), not inside `PaperTree`, so it stays reachable even on a day with zero published stories. Every other leaf is a standalone sidebar entry (no more bundled "Stocks"/"Corporate"/"In Focus" groups — IPO/Market/Trade/Insurance and Announcements/Appointments/Events each get their own tab; the latter three display as "Corporate Announcements"/"Corporate Appointments"/"Corporate Events" via a `LEAF_LABEL` display-name map even though the underlying `section` value stays the short taxonomy name), rendered via click-to-expand row list (`components/PaperSectionTable.tsx`, numbered single-line-truncated rows). A search box filters headline+summary across every section; every sidebar section's default view always excludes `is_notice: true` stories (no per-section toggle — notices only ever appear via the Routine Notices tab). All other stories (including low-`importance` ones) are shown by default; `importance` only affects sort order (§3d). `renderSummary()` parses `[[...]]` markers; `renderSummaryBullets()`/`splitSentences()`/`secondarySplit()` break a summary into scannable bullets, splitting only on sentence boundaries, semicolons, " while ", and a curated `CLAUSE_WORDS` list of clause-introducing words (reporting verbs like "said"/"valuing"/"adding" plus contrast/causal conjunctions "but"/"though"/"even as"/"since"/"after") — deliberately not on a bare comma before any lowercase letter, since that fragments appositives, citations, and comma-lists into dangling non-sentences (audited against the full corpus, Sept 2026). `components/IpoTable.tsx` — structured IPO/listing table, separate page (`app/ipo/page.tsx`).
- Standalone publish path for the IPO table without a full e-paper pull: `node scripts/publish-ipo.mjs path/to/ipos.json` (same shape/upsert semantics as the `ipoListings` array, useful for out-of-band updates like a listing-day price correction).
