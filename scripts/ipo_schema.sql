-- "IPO & New Listings" — isolated schema for manually-tracked IPO/listing data.
-- Not tied to paper_stories/clusters. `ticker` is optional and, when set,
-- lets the UI join against the existing `prices` table for a live current price.

CREATE TABLE IF NOT EXISTS ipo_listings (
  id                SERIAL PRIMARY KEY,
  company_name      TEXT NOT NULL UNIQUE,
  ticker            TEXT,               -- e.g. "AUGMONT.NS" — matches `prices.ticker` once listed
  exchange          TEXT,               -- e.g. "BSE, NSE"
  issue_price_low   NUMERIC,
  issue_price_high  NUMERIC,
  open_date         DATE,
  close_date        DATE,
  listing_date      DATE,
  listing_price     NUMERIC,            -- price on listing day (for since-listing % change)
  status            TEXT NOT NULL DEFAULT 'upcoming',  -- upcoming | open | closed | listed
  notes             TEXT,
  offer_type        TEXT,               -- e.g. "Fresh issue + offer for sale" — shown as "Offer structure" in the fact sheet
  issue_size        TEXT,               -- combined free-text issue size (legacy; prefer fresh_issue/offer_for_sale below when known)
  sellers           TEXT,               -- selling shareholders in an OFS, shown as "Selling investors"
  implied_valuation TEXT,
  fresh_issue       TEXT,               -- fresh-issue portion only, e.g. "₹150 crore"
  offer_for_sale    TEXT,               -- OFS portion only, e.g. "Large OFS by existing investors" or a specific amount
  aliases           TEXT,               -- comma-separated extra self-referential phrases (NOT bare abbreviations —
                                         -- see §6a of publish-epaper SKILL.md) so headlines using a short form still
                                         -- match this row, e.g. "NSE IPO, NSE public offering" for
                                         -- "National Stock Exchange of India Limited"
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent for pre-existing tables that predate one of the columns above.
ALTER TABLE ipo_listings ADD COLUMN IF NOT EXISTS offer_type TEXT;
ALTER TABLE ipo_listings ADD COLUMN IF NOT EXISTS issue_size TEXT;
ALTER TABLE ipo_listings ADD COLUMN IF NOT EXISTS sellers TEXT;
ALTER TABLE ipo_listings ADD COLUMN IF NOT EXISTS implied_valuation TEXT;
ALTER TABLE ipo_listings ADD COLUMN IF NOT EXISTS fresh_issue TEXT;
ALTER TABLE ipo_listings ADD COLUMN IF NOT EXISTS offer_for_sale TEXT;
ALTER TABLE ipo_listings ADD COLUMN IF NOT EXISTS aliases TEXT;

CREATE INDEX IF NOT EXISTS idx_ipo_listings_dates ON ipo_listings (listing_date DESC NULLS LAST, open_date DESC NULLS LAST);
