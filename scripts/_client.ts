import { Client } from "pg";
import type { Db } from "../src/lib/db";

export async function connect(): Promise<{ db: Db; close: () => Promise<void> }> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const client = new Client({
    connectionString: url,
    ssl: /sslmode=disable|localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
  });
  await client.connect();
  return {
    db: { query: (text, params) => client.query(text, params as unknown[]) as never },
    close: () => client.end(),
  };
}
