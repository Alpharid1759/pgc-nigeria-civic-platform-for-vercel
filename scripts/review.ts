// Usage: npm run review -- list | approve <id> [notes] | reject <id> [notes]
import { approveApplication, rejectApplication } from "../src/lib/membership";
import { connect } from "./_client";

async function main() {
  const [cmd, idArg, ...rest] = process.argv.slice(2);
  const { db, close } = await connect();
  try {
    if (cmd === "list") {
      const r = await db.query<{ id: string; application_no: string; full_name: string; state_slug: string; category: string }>(
        "SELECT id, application_no, full_name, state_slug, category FROM membership_applications WHERE status = 'pending' ORDER BY id",
      );
      console.table(r.rows);
    } else if ((cmd === "approve" || cmd === "reject") && /^\d+$/.test(idArg ?? "")) {
      const fn = cmd === "approve" ? approveApplication : rejectApplication;
      console.log(JSON.stringify(await fn(db, Number(idArg), "cli", rest.join(" "))));
    } else {
      console.log("Usage: npm run review -- list | approve <id> [notes] | reject <id> [notes]");
      process.exitCode = 1;
    }
  } finally {
    await close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
