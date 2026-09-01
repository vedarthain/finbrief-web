-- "Today's Paper" — isolated schema for manually-extracted e-paper content.
-- Deliberately decoupled from clusters/cluster_entities/prices (no fake tickers, no fake source URLs).

CREATE TABLE IF NOT EXISTS paper_stories (
  id            SERIAL PRIMARY KEY,
  edition       TEXT NOT NULL,          -- e.g. "Mumbai"
  paper_date    DATE NOT NULL,          -- e.g. 2026-08-31
  section       TEXT NOT NULL,          -- e.g. "Front Page", "Markets", "Companies", "Economy", "World"
  headline      TEXT NOT NULL,
  summary       TEXT NOT NULL,
  page_number   INT,
  industry      TEXT,                   -- e.g. "Medtech", "FMCG" — only set for section = 'Sector' stories
  display_order INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE paper_stories ADD COLUMN IF NOT EXISTS industry TEXT;

CREATE INDEX IF NOT EXISTS idx_paper_stories_date ON paper_stories (paper_date, display_order);

-- Per-day metadata not tied to a single story, e.g. "Stocks in Focus" picks.
CREATE TABLE IF NOT EXISTS paper_meta (
  edition          TEXT NOT NULL,
  paper_date       DATE NOT NULL,
  stocks_in_focus  JSONB NOT NULL DEFAULT '[]',  -- [{ "name": "...", "note": "..." }]
  PRIMARY KEY (edition, paper_date)
);
