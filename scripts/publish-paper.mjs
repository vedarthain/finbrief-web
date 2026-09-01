// Publishes manually-extracted e-paper stories into paper_stories, and (if
// present) upserts structured IPO/listing entries into ipo_listings.
// Usage: node scripts/publish-paper.mjs path/to/stories.json
//
// stories.json shape:
// {
//   "edition": "Mumbai",
//   "paper_date": "2026-08-31",
//   "stories": [
//     { "section": "Front Page", "headline": "...", "summary": "...", "page_number": 1 }
//   ],
//   "ipoListings": [
//     { "company_name": "...", "ticker": "...", "exchange": "BSE, NSE",
//       "issue_price_low": 546, "issue_price_high": 575,
//       "open_date": "2026-08-31", "close_date": "2026-09-02",
//       "listing_date": null, "listing_price": null,
//       "status": "open", "notes": "..." }
//   ]
// }
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { Pool } from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

for (const line of readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2];
}

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error("Usage: node scripts/publish-paper.mjs path/to/stories.json");
  process.exit(1);
}

const { edition, paper_date, stories, stocksInFocus, ipoListings } = JSON.parse(readFileSync(jsonPath, "utf8"));
if (!edition || !paper_date || !Array.isArray(stories) || stories.length === 0) {
  console.error("Invalid input: need edition, paper_date, and a non-empty stories array.");
  process.exit(1);
}

const useSSL = (process.env.DATABASE_URL ?? "").includes("neon.tech");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : undefined,
});

const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query(`DELETE FROM paper_stories WHERE edition = $1 AND paper_date = $2`, [edition, paper_date]);

  let order = 0;
  for (const s of stories) {
    await client.query(
      `INSERT INTO paper_stories (edition, paper_date, section, headline, summary, page_number, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [edition, paper_date, s.section, s.headline, s.summary, s.page_number ?? null, order++]
    );
  }

  await client.query(
    `INSERT INTO paper_meta (edition, paper_date, stocks_in_focus)
     VALUES ($1, $2, $3)
     ON CONFLICT (edition, paper_date) DO UPDATE SET stocks_in_focus = EXCLUDED.stocks_in_focus`,
    [edition, paper_date, JSON.stringify(stocksInFocus ?? [])]
  );

  for (const l of ipoListings ?? []) {
    if (!l.company_name) throw new Error(`ipoListings entry missing company_name: ${JSON.stringify(l)}`);
    await client.query(
      `INSERT INTO ipo_listings
         (company_name, ticker, exchange, issue_price_low, issue_price_high,
          open_date, close_date, listing_date, listing_price, status, notes, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
       ON CONFLICT (company_name) DO UPDATE SET
         ticker           = EXCLUDED.ticker,
         exchange         = EXCLUDED.exchange,
         issue_price_low  = EXCLUDED.issue_price_low,
         issue_price_high = EXCLUDED.issue_price_high,
         open_date        = EXCLUDED.open_date,
         close_date       = EXCLUDED.close_date,
         listing_date     = EXCLUDED.listing_date,
         listing_price    = EXCLUDED.listing_price,
         status           = EXCLUDED.status,
         notes            = EXCLUDED.notes,
         updated_at       = now()`,
      [
        l.company_name,
        l.ticker ?? null,
        l.exchange ?? null,
        l.issue_price_low ?? null,
        l.issue_price_high ?? null,
        l.open_date ?? null,
        l.close_date ?? null,
        l.listing_date ?? null,
        l.listing_price ?? null,
        l.status ?? "upcoming",
        l.notes ?? null,
      ]
    );
  }

  await client.query("COMMIT");
  console.log(
    `Published ${stories.length} stories for ${edition} — ${paper_date}` +
    (ipoListings?.length ? `, upserted ${ipoListings.length} IPO/listing entries.` : ".")
  );
} catch (err) {
  await client.query("ROLLBACK");
  throw err;
} finally {
  client.release();
  await pool.end();
}
