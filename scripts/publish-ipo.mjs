// Upserts IPO / new-listing entries into ipo_listings, keyed on company_name.
// Usage: node scripts/publish-ipo.mjs path/to/ipos.json
//
// ipos.json shape:
// {
//   "listings": [
//     {
//       "company_name": "Augmont Enterprises",
//       "ticker": "AUGMONT.NS",
//       "exchange": "BSE, NSE",
//       "issue_price_low": 760,
//       "issue_price_high": 788,
//       "open_date": "2026-08-27",
//       "close_date": "2026-08-29",
//       "listing_date": "2026-09-01",
//       "listing_price": 1150,
//       "status": "listed",
//       "notes": "Allotted at ₹788/share, 157.6x subscribed"
//     }
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
  console.error("Usage: node scripts/publish-ipo.mjs path/to/ipos.json");
  process.exit(1);
}

const { listings } = JSON.parse(readFileSync(jsonPath, "utf8"));
if (!Array.isArray(listings) || listings.length === 0) {
  console.error("Invalid input: need a non-empty listings array.");
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

  for (const l of listings) {
    if (!l.company_name) throw new Error(`Listing missing company_name: ${JSON.stringify(l)}`);
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
  console.log(`Upserted ${listings.length} IPO/listing entries.`);
} catch (err) {
  await client.query("ROLLBACK");
  throw err;
} finally {
  client.release();
  await pool.end();
}
