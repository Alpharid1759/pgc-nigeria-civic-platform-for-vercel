import { Pool } from "pg";

export interface QueryResult<T> {
  rows: T[];
}

/** Minimal database surface used by the app. pg.Pool and PGlite both satisfy it. */
export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
}

const globalForDb = globalThis as unknown as { __pgcPool?: Pool; __pgcDbOverride?: Db | null };

/** True when a database connection string is configured. */
export function dbConfigured(): boolean {
  return Boolean(globalForDb.__pgcDbOverride ?? process.env.DATABASE_URL);
}

/** Returns the database, or null when none is configured. */
export function getDb(): Db | null {
  if (globalForDb.__pgcDbOverride) return globalForDb.__pgcDbOverride;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!globalForDb.__pgcPool) {
    globalForDb.__pgcPool = new Pool({
      connectionString: url,
      max: Number(process.env.PGC_DB_POOL_MAX ?? 5),
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return globalForDb.__pgcPool as unknown as Db;
}

/** Test hook: use an injected database instead of DATABASE_URL. Pass null to clear. */
export function setDbForTests(db: Db | null): void {
  globalForDb.__pgcDbOverride = db;
}

/** Runs a read and returns the fallback when the database is missing or the query fails. */
export async function safely<T>(run: (db: Db) => Promise<T>, fallback: T): Promise<T> {
  const db = getDb();
  if (!db) return fallback;
  try {
    return await run(db);
  } catch (err) {
    console.error("PGC database error:", err instanceof Error ? err.message : err);
    return fallback;
  }
}

/** Show demonstration records in public lists. Off unless explicitly enabled. */
export function showDemo(): boolean {
  return process.env.PGC_SHOW_DEMO === "1";
}
