import pool from "./db";

export interface Ticker {
  ticker: string;
  label: string;
  price: number;
  open: number;
  change_pct: number;
  recorded_at: string;
}

export interface ClusterEntity {
  ticker: string;
  company_name: string;
  price_at_publish: number;
  price_latest: number;
  price_change_pct: number;        // since news broke
  price_change_1w_pct: number | null;
  price_change_1m_pct: number | null;
  sector: string | null;
  direction: "up" | "down" | "flat";
}

export interface Cluster {
  id: number;
  headline: string;
  summary: string;
  importance_score: number;
  category: string;
  country: string;
  published_at: string;
  is_top_story: boolean;
  entities: ClusterEntity[];
  sources: { url: string; source: string }[];   // original article links
}

export interface PriceHistory {
  time: number;
  value: number;
}

export interface ArchiveDay {
  date: string;          // "2024-05-13"
  label: string;         // "Today" | "Yesterday" | "Mon 12"
  story_count: number;
}

// ── Latest price for every watchlist ticker ──────────────────────────────────
export async function getLatestPrices(): Promise<Ticker[]> {
  const { rows } = await pool.query(`
    SELECT DISTINCT ON (ticker)
      ticker, price, open,
      ROUND(((price - open) / NULLIF(open, 0) * 100)::numeric, 2) AS change_pct,
      recorded_at
    FROM prices
    ORDER BY ticker, recorded_at DESC
  `);
  return rows;
}

// ── Stories for a specific date (IST date string "YYYY-MM-DD") ──────────────
async function getStoriesForDate(
  date: string,
  country: string,
  limit: number
): Promise<Cluster[]> {
  // Convert IST date to UTC range (IST = UTC+5:30)
  const { rows } = await pool.query(
    `
    SELECT
      c.id, c.headline, c.summary, c.importance_score,
      c.category, c.country, c.published_at, c.is_top_story,
      COALESCE(
        (SELECT json_agg(e)
         FROM (
           SELECT DISTINCT ON (ce2.ticker)
             json_build_object(
               'ticker',              ce2.ticker,
               'company_name',        ce2.company_name,
               'price_at_publish',    ce2.price_at_publish,
               'price_latest',        ce2.price_latest,
               'price_change_pct',    ce2.price_change_pct,
               'price_change_1w_pct', ce2.price_change_1w_pct,
               'price_change_1m_pct', ce2.price_change_1m_pct,
               'sector',              ce2.sector,
               'direction',           ce2.direction
             ) AS e
           FROM cluster_entities ce2
           WHERE ce2.cluster_id = c.id
         ) sub
        ),
        '[]'
      ) AS entities,
      COALESCE(
        (SELECT json_agg(s)
         FROM (
           SELECT DISTINCT ON (ri2.url)
             json_build_object('url', ri2.url, 'source', ri2.source) AS s
           FROM cluster_items ci2
           JOIN raw_items ri2 ON ri2.id = ci2.raw_item_id
           WHERE ci2.cluster_id = c.id
         ) sub
        ),
        '[]'
      ) AS sources
    FROM clusters c
    WHERE c.country = $1
      AND (c.published_at AT TIME ZONE 'Asia/Kolkata')::date = $2::date
    ORDER BY c.importance_score DESC, c.published_at DESC
    LIMIT $3
    `,
    [country, date, limit]
  );
  return rows;
}

export async function getTopIndiaStories(
  limit = 500,      // show full day's India coverage — DB has 100s/day
  date?: string
): Promise<Cluster[]> {
  const d = date ?? new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return getStoriesForDate(d, "IN", limit);
}

export async function getTopGlobalStories(
  limit = 200,      // full day's global coverage
  date?: string
): Promise<Cluster[]> {
  const d = date ?? new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return getStoriesForDate(d, "GLOBAL", limit);
}

// ── Archive: days that have stories (last 7 days) ────────────────────────────
export async function getArchiveDays(): Promise<ArchiveDay[]> {
  const { rows } = await pool.query(`
    SELECT
      (published_at AT TIME ZONE 'Asia/Kolkata')::date AS date,
      COUNT(*)::int AS story_count
    FROM clusters
    WHERE published_at >= NOW() - INTERVAL '30 days'
    GROUP BY 1
    ORDER BY 1 DESC
    LIMIT 30
  `);

  const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const yesterdayIST = new Date(Date.now() - 86400000).toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  return rows.map((r) => {
    const d = r.date instanceof Date
      ? r.date.toLocaleDateString("en-CA")
      : String(r.date).slice(0, 10);

    let label: string;
    if (d === todayIST) label = "Today";
    else if (d === yesterdayIST) label = "Yesterday";
    else
      label = new Date(d + "T12:00:00Z").toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });

    return { date: d, label, story_count: r.story_count };
  });
}

// ── Intraday sparkline data ──────────────────────────────────────────────────
export async function getPriceHistory(ticker: string): Promise<PriceHistory[]> {
  const { rows } = await pool.query(
    `
    SELECT
      EXTRACT(EPOCH FROM recorded_at)::bigint AS time,
      price::float AS value
    FROM prices
    WHERE ticker = $1
      AND recorded_at >= NOW() - INTERVAL '1 day'
    ORDER BY recorded_at ASC
    `,
    [ticker]
  );
  return rows;
}

// ── Market strip ─────────────────────────────────────────────────────────────
const INDIA_STRIP  = [
  "^NSEI", "^BSESN", "^NSEBANK", "^NSEMDCP50",
  "^CNXIT", "^CNXAUTO", "^CNXFMCG", "^CNXPHARMA", "^CNXMETAL", "^CNXENERGY",
  "USDINR=X",
];
const GLOBAL_STRIP = [
  "^GSPC", "^IXIC", "^DJI",
  "^HSI", "^N225", "^FTSE", "^GDAXI", "^STOXX50E",
  "GC=F", "SI=F", "CL=F", "BZ=F", "DX-Y.NYB",
];

export async function getMarketStrip(type: "india" | "global"): Promise<Ticker[]> {
  const tickers = type === "india" ? INDIA_STRIP : GLOBAL_STRIP;
  const { rows } = await pool.query(
    `
    SELECT DISTINCT ON (ticker)
      ticker, price, open,
      ROUND(((price - open) / NULLIF(open, 0) * 100)::numeric, 2) AS change_pct,
      recorded_at
    FROM prices
    WHERE ticker = ANY($1)
    ORDER BY ticker, recorded_at DESC
    `,
    [tickers]
  );
  return rows.sort((a, b) => tickers.indexOf(a.ticker) - tickers.indexOf(b.ticker));
}

// ── Today's Paper — manually-extracted e-paper stories ───────────────────────
// Isolated from clusters/cluster_entities/prices — no tickers, no source URLs.
export interface PaperStory {
  id: number;
  edition: string;
  paper_date: string;
  section: string;
  headline: string;
  summary: string;
  page_number: number | null;
}

export async function getPaperStories(date?: string, edition?: string): Promise<PaperStory[]> {
  const d = date ?? new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const params: (string)[] = [d];
  let where = `paper_date = $1`;
  if (edition) {
    params.push(edition);
    where += ` AND edition = $2`;
  }
  const { rows } = await pool.query(
    `
    SELECT id, edition, paper_date::text, section, headline, summary, page_number
    FROM paper_stories
    WHERE ${where}
    ORDER BY display_order ASC, page_number ASC NULLS LAST, id ASC
    `,
    params
  );
  return rows;
}

export interface StockInFocus {
  name: string;
  note: string;
  edition?: string;
}

// Merges stocks_in_focus across every edition published for the date (not just
// one) so that once a second newspaper is added, both editions' highlights show
// up here instead of one silently winning an arbitrary LIMIT 1.
export async function getStocksInFocus(date?: string, edition?: string): Promise<StockInFocus[]> {
  const d = date ?? new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const params: (string)[] = [d];
  let where = `paper_date = $1`;
  if (edition) {
    params.push(edition);
    where += ` AND edition = $2`;
  }
  const { rows } = await pool.query(
    `SELECT edition, stocks_in_focus FROM paper_meta WHERE ${where}`,
    params
  );
  const multiEdition = rows.length > 1;
  return rows.flatMap((r) =>
    (r.stocks_in_focus ?? []).map((s: StockInFocus) => (multiEdition ? { ...s, edition: r.edition } : s))
  );
}

export async function getPaperDays(): Promise<{ date: string; edition: string }[]> {
  const { rows } = await pool.query(`
    SELECT DISTINCT paper_date::text AS date, edition
    FROM paper_stories
    ORDER BY date DESC
    LIMIT 30
  `);
  return rows;
}

// ── IPO & New Listings — manually-tracked, isolated from paper_stories ──────
export interface IpoListing {
  id: number;
  company_name: string;
  ticker: string | null;
  exchange: string | null;
  issue_price_low: number | null;
  issue_price_high: number | null;
  open_date: string | null;
  close_date: string | null;
  listing_date: string | null;
  listing_price: number | null;
  status: string;
  notes: string | null;
  current_price: number | null;
  change_pct: number | null;   // vs listing_price, using latest known price
}

export async function getIpoListings(): Promise<IpoListing[]> {
  const { rows } = await pool.query(`
    SELECT
      l.id, l.company_name, l.ticker, l.exchange,
      l.issue_price_low, l.issue_price_high,
      l.open_date::text, l.close_date::text, l.listing_date::text,
      l.listing_price, l.status, l.notes,
      p.price AS current_price,
      CASE WHEN l.listing_price IS NOT NULL AND p.price IS NOT NULL AND l.listing_price != 0
        THEN ROUND(((p.price - l.listing_price) / l.listing_price * 100)::numeric, 2)
        ELSE NULL
      END AS change_pct
    FROM ipo_listings l
    LEFT JOIN LATERAL (
      SELECT price FROM prices WHERE ticker = l.ticker ORDER BY recorded_at DESC LIMIT 1
    ) p ON true
    ORDER BY
      COALESCE(l.listing_date, l.close_date, l.open_date) DESC NULLS LAST,
      l.company_name ASC
  `);
  return rows;
}
