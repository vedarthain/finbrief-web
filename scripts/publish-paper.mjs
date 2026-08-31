// Publishes manually-extracted e-paper stories into paper_stories.
// Usage: node scripts/publish-paper.mjs path/to/stories.json
//
// stories.json shape:
// {
//   "edition": "Mumbai",
//   "paper_date": "2026-08-31",
//   "stories": [
//     { "section": "Front Page", "headline": "...", "summary": "...", "page_number": 1 }
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

const { edition, paper_date, stories, stocksInFocus } = JSON.parse(readFileSync(jsonPath, "utf8"));
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

  await client.query("COMMIT");
  console.log(`Published ${stories.length} stories for ${edition} — ${paper_date}.`);
} catch (err) {
  await client.query("ROLLBACK");
  throw err;
} finally {
  client.release();
  await pool.end();
}
