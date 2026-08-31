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
  display_order INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paper_stories_date ON paper_stories (paper_date, display_order);
