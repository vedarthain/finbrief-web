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
//       "notes": "Allotted at ₹788/share, 157.6x subscribed",
//       "offer_type": "Fresh issue + offer for sale", "issue_size": "Up to ₹6,800 million",
//       "sellers": null, "implied_valuation": null,
//       "fresh_issue": "₹150 crore", "offer_for_sale": "Large OFS by existing investors"
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
          open_date, close_date, listing_date, listing_price, status, notes,
          offer_type, issue_size, sellers, implied_valuation, fresh_issue, offer_for_sale, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, now())
       ON CONFLICT (company_name) DO UPDATE SET
         ticker             = EXCLUDED.ticker,
         exchange           = EXCLUDED.exchange,
         issue_price_low    = EXCLUDED.issue_price_low,
         issue_price_high   = EXCLUDED.issue_price_high,
         open_date          = EXCLUDED.open_date,
         close_date         = EXCLUDED.close_date,
         listing_date       = EXCLUDED.listing_date,
         listing_price      = EXCLUDED.listing_price,
         status             = EXCLUDED.status,
         notes              = EXCLUDED.notes,
         offer_type         = EXCLUDED.offer_type,
         issue_size         = EXCLUDED.issue_size,
         sellers            = EXCLUDED.sellers,
         implied_valuation  = EXCLUDED.implied_valuation,
         fresh_issue        = EXCLUDED.fresh_issue,
         offer_for_sale     = EXCLUDED.offer_for_sale,
         updated_at         = now()`,
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
        l.offer_type ?? null,
        l.issue_size ?? null,
        l.sellers ?? null,
        l.implied_valuation ?? null,
        l.fresh_issue ?? null,
        l.offer_for_sale ?? null,
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
