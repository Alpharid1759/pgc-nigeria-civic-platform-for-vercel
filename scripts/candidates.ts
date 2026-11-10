// Screening and Mandate Committee commands.
// Usage: npm run candidates -- list | status <id> <cleared|disqualified|nominated|elected|serving|ended|withdrawn> [notes]
//        npm run candidates -- add <id> <project-no> <YYYY-MM-DD>     (committee: add to a signed Mandate)
//        npm run candidates -- remove <item-id> <reason, at least 10 characters>
import { addMandateItem, removeMandateItem, setCandidateStatus } from "../src/lib/mandates";
import { connect } from "./_client";

async function main() {
  const [cmd, a, b, ...rest] = process.argv.slice(2);
  const { db, close } = await connect();
  try {
    if (cmd === "list") {
      const r = await db.query(
        `SELECT c.id, ap.full_name, c.office_type, c.state_slug, c.election_year, c.status, (c.mandate_signed_at IS NOT NULL) AS signed,
                (SELECT count(*) FROM mandate_items i WHERE i.candidate_id = c.id AND i.removed_at IS NULL) AS items
         FROM candidates c JOIN members m ON m.id = c.member_id JOIN membership_applications ap ON ap.id = m.application_id ORDER BY c.id`,
      );
      console.table(r.rows);
    } else if (cmd === "status" && /^\d+$/.test(a ?? "") && b) {
      console.log(JSON.stringify(await setCandidateStatus(db, Number(a), b, "cli", rest.join(" "))));
    } else if (cmd === "add" && /^\d+$/.test(a ?? "") && b && rest[0]) {
      console.log(JSON.stringify(await addMandateItem(db, Number(a), b, rest[0], { committee: true, actor: "cli" })));
    } else if (cmd === "remove" && /^\d+$/.test(a ?? "") && b) {
      console.log(JSON.stringify(await removeMandateItem(db, Number(a), [b, ...rest].join(" "), "cli")));
    } else {
      console.log("See the usage notes at the top of scripts/candidates.ts");
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
