import { PGlite } from "@electric-sql/pglite";
import type { Db } from "@/lib/db";
import { migrate } from "@/lib/migrate";

/** In-process Postgres for tests. Statements without parameters go through exec so multi-statement SQL works. */
export async function createTestDb(): Promise<{ db: Db; close: () => Promise<void> }> {
  const pg = new PGlite();
  const db: Db = {
    async query<T>(text: string, params?: unknown[]) {
      if (!params || params.length === 0) {
        const results = await pg.exec(text);
        const last = results[results.length - 1];
        return { rows: (last?.rows ?? []) as T[] };
      }
      const res = await pg.query<T>(text, params);
      return { rows: res.rows };
    },
  };
  await migrate(db);
  return { db, close: () => pg.close() };
}

export const YEAR = new Date().getUTCFullYear();
