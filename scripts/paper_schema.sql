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
  is_notice     BOOLEAN NOT NULL DEFAULT false, -- routine compliance filings (AGM/postal ballot/SARFAESI/
                                                 -- lost-share-cert/possession notices) — real content, but
                                                 -- not "news"; kept out of the default reading path.
  importance    SMALLINT NOT NULL DEFAULT 3,    -- 1 (skippable) .. 5 (must-read); drives in-section sort.
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE paper_stories ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE paper_stories ADD COLUMN IF NOT EXISTS is_notice BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE paper_stories ADD COLUMN IF NOT EXISTS importance SMALLINT NOT NULL DEFAULT 3;

CREATE INDEX IF NOT EXISTS idx_paper_stories_date ON paper_stories (paper_date, display_order);
CREATE INDEX IF NOT EXISTS idx_paper_stories_importance ON paper_stories (paper_date, is_notice, importance DESC);

-- Per-day metadata not tied to a single story, e.g. "Stocks in Focus" picks and a
-- cross-section "Top Stories" digest so a reader never has to open every tab.
CREATE TABLE IF NOT EXISTS paper_meta (
  edition          TEXT NOT NULL,
  paper_date       DATE NOT NULL,
  stocks_in_focus  JSONB NOT NULL DEFAULT '[]',  -- [{ "name": "...", "note": "..." }]
  top_stories      JSONB NOT NULL DEFAULT '[]',  -- [{ "headline": "...", "section": "...", "note": "..." }]
  PRIMARY KEY (edition, paper_date)
);

ALTER TABLE paper_meta ADD COLUMN IF NOT EXISTS top_stories JSONB NOT NULL DEFAULT '[]';
