import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import {
  addMandateItem,
  candidateCounts,
  deliveryState,
  getCandidate,
  listCandidates,
  registerAspirant,
  removeMandateItem,
  scopeFor,
  setCandidateStatus,
  submitMandate,
  signMandate,
} from "@/lib/mandates";
import { createTestDb } from "./helpers/db";

let db: Db;
let close: () => Promise<void>;
const q = (sql: string, params: unknown[] = []) => db.query(sql, params);
const YEAR = new Date().getUTCFullYear();
const NEXT = YEAR + 1;
const DATE = `${YEAR + 3}-06-30`;

async function addMember(no: string, phone: string, state = "benue", lga = "makurdi", demo = false) {
  const a = await db.query<{ id: string }>(
    `INSERT INTO membership_applications (application_no, full_name, phone, email, state_slug, lga_slug, category, status, is_demo)
     VALUES ($1, $2, $3, $4, $5, $6, 'ordinary', 'approved', $7) RETURNING id`,
    [`A-${no}`, `Member ${no}`, phone, `${no}@example.org`, state, lga, demo],
  );
  await q(
    "INSERT INTO members (membership_no, application_id, category, state_slug, lga_slug, is_demo) VALUES ($1, $2, 'ordinary', $3, $4, $5)",
    [no, Number(a.rows[0].id), state, lga, demo],
  );
}

async function addProject(no: string, state: string, lga: string | null, status = "prioritised", createdAt = "2020-01-01") {
  await q(
    `INSERT INTO projects (project_no, title, status, state_slug, lga_slug, published, created_at)
     VALUES ($1, $2, $3, $4, $5, true, $6)`,
    [no, `Project ${no}`, status, state, lga, createdAt],
  );
}

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await addMember("PGC-NG-BEN-2026-000001", "+2348031230001");
  await addMember("PGC-NG-LAG-2026-000002", "+2348031230002", "lagos", "surulere");
  await addMember("PGC-NG-BEN-2026-000003", "+2348031230003", "benue", "makurdi", true);
  for (const n of ["P1", "P2", "P3", "P4"]) await addProject(n, "benue", "makurdi");
  await addProject("PL", "lagos", "surulere");
  await addProject("PBEN-OTHER-LGA", "benue", "gboko");
  await addProject("NEW", "benue", "makurdi", "prioritised", "2999-01-01");
});

afterAll(async () => {
  await close();
});

describe("scope and delivery state", () => {
  it("maps offices to jurisdictions", () => {
    expect(scopeFor("president")).toBe("nation");
    expect(scopeFor("governor")).toBe("state");
    expect(scopeFor("senator")).toBe("state");
    expect(scopeFor("lga_chair")).toBe("local");
    expect(scopeFor("councillor")).toBe("local");
    expect(scopeFor("minister")).toBeNull();
  });

  it("counts only verified projects as delivered", () => {
    expect(deliveryState("verified")).toBe("delivered");
    expect(deliveryState("completed")).toBe("awaiting_verification");
    expect(deliveryState("funded")).toBe("planning");
    expect(deliveryState("ongoing")).toBe("in_progress");
    expect(deliveryState("suspended")).toBe("delayed");
  });
});

describe("aspirant registration", () => {
  it("rejects wrong phone, unknown member, bad office and bad year", async () => {
    const b = { membershipNo: "PGC-NG-BEN-2026-000001", phone: "08031230001", office: "governor", state: "benue", electionYear: NEXT };
    expect(await registerAspirant(db, { ...b, phone: "08000000000" }, { minMemberMonths: 0 })).toEqual({ ok: false, error: "not_member" });
    expect(await registerAspirant(db, { ...b, membershipNo: "NOPE" }, { minMemberMonths: 0 })).toEqual({ ok: false, error: "not_member" });
    expect(await registerAspirant(db, { ...b, office: "minister" }, { minMemberMonths: 0 })).toEqual({ ok: false, error: "invalid" });
    expect(await registerAspirant(db, { ...b, electionYear: YEAR - 1 }, { minMemberMonths: 0 })).toEqual({ ok: false, error: "invalid" });
    expect(await registerAspirant(db, { ...b, state: undefined }, { minMemberMonths: 0 })).toEqual({ ok: false, error: "invalid" });
    expect(await registerAspirant(db, { ...b, office: "councillor", lga: "nowhere" }, { minMemberMonths: 0 })).toEqual({ ok: false, error: "invalid" });
  });

  it("enforces the minimum membership period", async () => {
    const r = await registerAspirant(db, { membershipNo: "PGC-NG-BEN-2026-000001", phone: "08031230001", office: "governor", state: "benue", electionYear: NEXT });
    expect(r).toEqual({ ok: false, error: "too_new" });
  });

  it("registers once per member, office and year", async () => {
    const input = { membershipNo: "PGC-NG-BEN-2026-000001", phone: "08031230001", office: "governor", state: "benue", electionYear: NEXT };
    const first = await registerAspirant(db, input, { minMemberMonths: 0 });
    expect(first.ok).toBe(true);
    expect(await registerAspirant(db, input, { minMemberMonths: 0 })).toEqual({ ok: false, error: "duplicate" });
  });
});

describe("mandate rules", () => {
  let id: number;

  beforeAll(async () => {
    const r = await registerAspirant(db, { membershipNo: "PGC-NG-BEN-2026-000001", phone: "08031230001", office: "lga_chair", state: "benue", lga: "makurdi", electionYear: NEXT }, { minMemberMonths: 0 });
    if (!r.ok) throw new Error("setup");
    id = r.candidateId;
  });

  it("rejects projects that are missing, new, or outside the jurisdiction", async () => {
    expect(await addMandateItem(db, id, "MISSING", DATE)).toEqual({ ok: false, error: "no_project" });
    expect(await addMandateItem(db, id, "NEW", DATE)).toEqual({ ok: false, error: "not_predetermined" });
    expect(await addMandateItem(db, id, "PL", DATE)).toEqual({ ok: false, error: "out_of_scope" });
    expect(await addMandateItem(db, id, "PBEN-OTHER-LGA", DATE)).toEqual({ ok: false, error: "out_of_scope" });
  });

  it("rejects bad target dates", async () => {
    expect(await addMandateItem(db, id, "P1", "soon")).toEqual({ ok: false, error: "bad_date" });
    expect(await addMandateItem(db, id, "P1", "2001-01-01")).toEqual({ ok: false, error: "bad_date" });
    expect(await addMandateItem(db, id, "P1", `${YEAR + 20}-01-01`)).toEqual({ ok: false, error: "bad_date" });
  });

  it("will not sign with too few projects, and cannot be cleared without a signed mandate", async () => {
    expect((await addMandateItem(db, id, "P1", DATE)).ok).toBe(true);
    expect(await addMandateItem(db, id, "P1", DATE)).toEqual({ ok: false, error: "duplicate" });
    expect((await addMandateItem(db, id, "P2", DATE)).ok).toBe(true);
    expect(await signMandate(db, id)).toEqual({ ok: false, error: "too_few_items", needed: 1 });
    expect(await setCandidateStatus(db, id, "cleared", "committee")).toEqual({ ok: false, error: "no_mandate" });
  });

  it("signs, locks, then clears and publishes", async () => {
    expect((await addMandateItem(db, id, "P3", DATE)).ok).toBe(true);
    expect(await signMandate(db, id)).toEqual({ ok: true });
    expect(await signMandate(db, id)).toEqual({ ok: false, error: "already_signed" });
    expect(await addMandateItem(db, id, "P4", DATE)).toEqual({ ok: false, error: "locked" });
    expect((await addMandateItem(db, id, "P4", DATE, { committee: true, actor: "mandate-committee" })).ok).toBe(true);

    expect(await listCandidates(db)).toHaveLength(0); // not cleared yet
    expect(await setCandidateStatus(db, id, "elected", "x")).toEqual({ ok: false, error: "bad_transition" });
    expect(await setCandidateStatus(db, id, "cleared", "committee")).toEqual({ ok: true });
    const list = await listCandidates(db);
    expect(list).toHaveLength(1);
    expect(list[0].summary).toMatchObject({ total: 4, delivered: 0, deliveryRate: 0 });
  });

  it("computes delivery from the Development Register and flags overdue items", async () => {
    await q("UPDATE projects SET status = 'verified' WHERE project_no = 'P1'");
    await q("UPDATE projects SET status = 'completed' WHERE project_no = 'P2'");
    const c = await getCandidate(db, id);
    expect(c?.summary).toMatchObject({ total: 4, delivered: 1, awaiting: 1, deliveryRate: 25 });
    expect(c?.items.find((i) => i.projectNo === "P1")?.state).toBe("delivered");
    expect(c?.items.find((i) => i.projectNo === "P2")?.state).toBe("awaiting_verification");
    expect(c?.items.some((i) => i.overdue)).toBe(false);

    await q("UPDATE mandate_items SET target_date = '2000-01-01' WHERE project_id = (SELECT id FROM projects WHERE project_no = 'P3')");
    expect((await getCandidate(db, id))?.summary.overdue).toBe(1);
  });

  it("lets the committee remove an item with a public reason", async () => {
    const c = await getCandidate(db, id);
    const item = c!.items.find((i) => i.projectNo === "P4")!;
    expect(await removeMandateItem(db, item.id, "short", "committee")).toEqual({ ok: false, error: "bad_date" });
    expect(await removeMandateItem(db, item.id, "Project was delivered by another body.", "committee")).toEqual({ ok: true });
    const after = await getCandidate(db, id);
    expect(after?.summary.total).toBe(3);
    expect(after?.items.find((i) => i.projectNo === "P4")).toMatchObject({ state: "removed", removedReason: "Project was delivered by another body." });
  });

  it("hides demo candidates and counts only public ones", async () => {
    expect(await candidateCounts(db)).toEqual({ candidates: 1, mandateProjects: 3 });
    const a = await registerAspirant(db, { membershipNo: "PGC-NG-BEN-2026-000003", phone: "08031230003", office: "governor", state: "benue", electionYear: NEXT }, { minMemberMonths: 0 });
    if (!a.ok) throw new Error("setup");
    await q("UPDATE candidates SET is_demo = true, published = true, mandate_signed_at = now(), status = 'cleared' WHERE id = $1", [a.candidateId]);
    expect(await listCandidates(db)).toHaveLength(1);
    expect(await listCandidates(db, {}, true)).toHaveLength(2);
    expect(await getCandidate(db, a.candidateId)).toBeNull();
  });
});

describe("submitMandate", () => {
  it("registers, adds lines, reports bad lines, then signs on resubmission", async () => {
    await addMember("PGC-NG-LAG-2026-000009", "+2348031230009", "lagos", "surulere");
    for (const n of ["L1", "L2", "L3"]) await addProject(n, "lagos", "surulere");
    const base = {
      membershipNo: "PGC-NG-LAG-2026-000009",
      phone: "08031230009",
      office: "governor",
      state: "lagos",
      electionYear: NEXT,
      sign: true,
    };
    const bad = await submitMandate(db, { ...base, lines: [
      { projectNo: "L1", targetDate: DATE },
      { projectNo: "NEW", targetDate: DATE },
      { projectNo: "P1", targetDate: DATE },
    ] }, { minMemberMonths: 0 });
    expect(bad).toMatchObject({ ok: true, signed: false });
    expect(bad.ok && bad.lineErrors.map((e) => e.error)).toEqual(["not_predetermined", "out_of_scope"]);

    const good = await submitMandate(db, { ...base, lines: ["L1", "L2", "L3"].map((projectNo) => ({ projectNo, targetDate: DATE })) }, { minMemberMonths: 0 });
    expect(good).toMatchObject({ ok: true, signed: true, lineErrors: [] });

    const again = await submitMandate(db, { ...base, lines: [] }, { minMemberMonths: 0 });
    expect(again).toEqual({ ok: false, error: "locked" });
  });
});
