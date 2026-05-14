import { Pool } from "pg";

// Neon requires SSL; sslmode=require in the URL is enough but we set it
// explicitly so local Postgres without SSL still works (rejectUnauthorized: false
// lets the node-postgres client accept Neon's serverless cert).
const useSSL = (process.env.DATABASE_URL ?? "").includes("neon.tech");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : undefined,
  max: 10,
});

export default pool;
