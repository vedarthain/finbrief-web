import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { Pool } from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

for (const line of readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2];
}

const useSSL = (process.env.DATABASE_URL ?? "").includes("neon.tech");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : undefined,
});

const sql = readFileSync(path.join(__dirname, "paper_schema.sql"), "utf8");

const client = await pool.connect();
try {
  await client.query(sql);
  console.log("paper_stories schema applied.");
} finally {
  client.release();
  await pool.end();
}
