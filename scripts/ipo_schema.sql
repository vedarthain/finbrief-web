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
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ipo_listings_dates ON ipo_listings (listing_date DESC NULLS LAST, open_date DESC NULLS LAST);
