// Inserts clearly-flagged DEMONSTRATION rows (is_demo = true). They never appear in public counts or lists
// unless PGC_SHOW_DEMO=1. Safe to run more than once.
import { connect } from "./_client";

async function main() {
  const { db, close } = await connect();
  try {
    await db.query(
      `INSERT INTO projects (project_no, title, status, sector, state_slug, lga_slug, published, is_demo, estimated_cost, problem)
       VALUES ('PGC-PRJ-DEMO-2026-000001', 'DEMO: Primary health centre rehabilitation', 'proposed', 'health', 'benue', 'makurdi', true, true, 25000000,
               'Demonstration record only.')
       ON CONFLICT (project_no) DO NOTHING`,
    );
    console.log("Demo project ensured (PGC-PRJ-DEMO-2026-000001). Set PGC_SHOW_DEMO=1 to view it.");
  } finally {
    await close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
