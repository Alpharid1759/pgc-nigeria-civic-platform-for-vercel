import { migrate } from "../src/lib/migrate";
import { connect } from "./_client";

async function main() {
  const { db, close } = await connect();
  try {
    const applied = await migrate(db);
    console.log(applied.length ? `Applied: ${applied.join(", ")}` : "Database is up to date.");
  } finally {
    await close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
