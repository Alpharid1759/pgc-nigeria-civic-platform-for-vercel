import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { computeDashboard, computeStats } from "@/lib/stats";
import { getProject, listProjects, recentProjects } from "@/lib/projects";
import { getScorecard, listScorecards } from "@/lib/scorecards";
import { createTestDb } from "./helpers/db";

let db: Db;
let close: () => Promise<void>;

const exec = (sql: string, params: unknown[] = []) => db.query(sql, params);

async function addOfficial(name: string, office: string, state: string | null, lga: string | null, demo = false): Promise<number> {
  const r = await db.query<{ id: string }>(
    "INSERT INTO officials (name, office_type, state_slug, lga_slug, published, is_demo) VALUES ($1, $2, $3, $4, true, $5) RETURNING id",
    [name, office, state, lga, demo],
  );
  return Number(r.rows[0].id);
}

async function addCard(officialId: number, year: number, quarter: number, status: string, scores: Record<string, number | null>, demo = false): Promise<number> {
  const c = await db.query<{ id: string }>(
    "INSERT INTO scorecards (official_id, year, quarter, status, is_demo, published_on) VALUES ($1, $2, $3, $4, $5, now()) RETURNING id",
    [officialId, year, quarter, status, demo],
  );
  const id = Number(c.rows[0].id);
  const office = (await db.query<{ office_type: string }>("SELECT office_type FROM officials WHERE id = $1", [officialId])).rows[0].office_type;
  for (const [cat, score] of Object.entries(scores)) {
    await db.query(
      `INSERT INTO assessments (scorecard_id, indicator_id, score, evidence)
       SELECT $1, id, $4, $5 FROM scorecard_indicators WHERE office_type = $2 AND category = $3`,
      [id, office, cat, score, `evidence ${cat}`],
    );
  }
  return id;
}

async function addProject(no: string, title: string, status: string, sector: string, state: string, lga: string | null, opts: { published?: boolean; demo?: boolean; cost?: number } = {}): Promise<number> {
  const r = await db.query<{ id: string }>(
    `INSERT INTO projects (project_no, title, status, sector, state_slug, lga_slug, published, is_demo, estimated_cost, start_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '2026-03-01') RETURNING id`,
    [no, title, status, sector, state, lga, opts.published ?? true, opts.demo ?? false, opts.cost ?? null],
  );
  return Number(r.rows[0].id);
}

beforeAll(async () => {
  ({ db, close } = await createTestDb());

  await addProject("PGC-PRJ-BEN-2026-000001", "Makurdi road rehabilitation", "ongoing", "roads", "benue", "makurdi", { cost: 1500000.5 });
  await addProject("PGC-PRJ-BEN-2026-000002", "Gboko borehole", "verified", "water", "benue", "gboko");
  await addProject("PGC-PRJ-LAG-2026-000003", "Surulere drainage", "completed", "drainage", "lagos", "surulere");
  await addProject("PGC-PRJ-LAG-2026-000004", "Unpublished draft", "proposed", "health", "lagos", null, { published: false });
  await addProject("PGC-PRJ-LAG-2026-000005", "Demo clinic", "verified", "health", "lagos", null, { demo: true });
  await exec(
    "INSERT INTO project_milestones (project_id, title, due_date, status, sort_order) SELECT id, 'Site survey', '2026-04-15', 'completed', 1 FROM projects WHERE project_no = 'PGC-PRJ-BEN-2026-000001'",
  );

  const gov = await addOfficial("Governor One", "governor", "benue", null);
  const rep = await addOfficial("Rep Two", "house_rep", "lagos", "surulere");
  const demoOfficial = await addOfficial("Demo Person", "senator", "benue", null, true);

  await addCard(gov, 2026, 1, "published", { A: 70, B: 60, C: 50, D: 80, E: 90, F: 100 });
  await addCard(gov, 2026, 2, "published", { A: 80, B: 80, C: 80, D: 80, E: 80, F: 80 });
  await addCard(rep, 2026, 2, "published", { A: 90, B: 90, E: 90 });
  await addCard(rep, 2026, 3, "draft", { A: 10, B: 10, C: 10, D: 10, E: 10, F: 10 });
  await addCard(demoOfficial, 2026, 2, "published", { A: 100, B: 100, C: 100, D: 100, E: 100, F: 100 }, true);

  await exec("INSERT INTO membership_applications (application_no, full_name, phone, email, state_slug, lga_slug, category, status) VALUES ('A1', 'M One', '+2348031234567', 'm1@example.org', 'benue', 'makurdi', 'ordinary', 'approved')");
  await exec("INSERT INTO membership_applications (application_no, full_name, phone, email, state_slug, lga_slug, category, status) VALUES ('A2', 'M Two', '+2348031234568', 'm2@example.org', 'lagos', 'surulere', 'ordinary', 'approved')");
  await exec("INSERT INTO membership_applications (application_no, full_name, phone, email, state_slug, lga_slug, category, status, is_demo) VALUES ('A3', 'M Three', '+2348031234569', 'm3@example.org', 'lagos', 'surulere', 'ordinary', 'approved', true)");
  await exec("INSERT INTO members (membership_no, application_id, category, state_slug, lga_slug) SELECT 'N1', id, 'ordinary', 'benue', 'makurdi' FROM membership_applications WHERE application_no = 'A1'");
  await exec("INSERT INTO members (membership_no, application_id, category, state_slug, lga_slug) SELECT 'N2', id, 'ordinary', 'lagos', 'surulere' FROM membership_applications WHERE application_no = 'A2'");
  await exec("INSERT INTO members (membership_no, application_id, category, state_slug, lga_slug, is_demo) SELECT 'N3', id, 'ordinary', 'lagos', 'surulere', true FROM membership_applications WHERE application_no = 'A3'");
  await exec("INSERT INTO members (membership_no, application_id, category, state_slug, lga_slug, status) SELECT 'N4', id, 'ordinary', 'lagos', 'surulere', 'suspended' FROM membership_applications WHERE application_no = 'A3'").catch(() => undefined);
});

afterAll(async () => {
  await close();
});

describe("projects", () => {
  it("lists only published, non-demo projects", async () => {
    const { items, total } = await listProjects(db, {});
    expect(total).toBe(3);
    expect(items.map((p) => p.projectNo).sort()).toEqual([
      "PGC-PRJ-BEN-2026-000001",
      "PGC-PRJ-BEN-2026-000002",
      "PGC-PRJ-LAG-2026-000003",
    ]);
  });

  it("includes demo records only when asked", async () => {
    expect((await listProjects(db, {}, true)).total).toBe(4);
  });

  it("filters by state, lga, sector and status", async () => {
    expect((await listProjects(db, { state: "benue" })).total).toBe(2);
    expect((await listProjects(db, { state: "benue", lga: "gboko" })).total).toBe(1);
    expect((await listProjects(db, { sector: "roads" })).total).toBe(1);
    expect((await listProjects(db, { status: "verified" })).total).toBe(1);
  });

  it("ignores unknown sector and status values instead of failing", async () => {
    expect((await listProjects(db, { sector: "nonsense'; DROP TABLE projects;--" })).total).toBe(3);
    expect((await listProjects(db, { status: "nonsense" })).total).toBe(3);
  });

  it("paginates", async () => {
    const p1 = await listProjects(db, { perPage: 2, page: 1 });
    const p2 = await listProjects(db, { perPage: 2, page: 2 });
    expect(p1.items).toHaveLength(2);
    expect(p2.items).toHaveLength(1);
    expect(p1.total).toBe(3);
  });

  it("returns recent projects", async () => {
    expect(await recentProjects(db, 2)).toHaveLength(2);
  });

  it("returns a project with milestones and date-only fields", async () => {
    const p = await getProject(db, "PGC-PRJ-BEN-2026-000001");
    expect(p?.title).toBe("Makurdi road rehabilitation");
    expect(p?.estimatedCost).toBe(1500000.5);
    expect(p?.startDate).toBe("2026-03-01");
    expect(p?.milestones).toEqual([
      { title: "Site survey", dueDate: "2026-04-15", completedDate: null, status: "completed", evidenceUrl: null },
    ]);
  });

  it("hides unpublished and demo projects", async () => {
    expect(await getProject(db, "PGC-PRJ-LAG-2026-000004")).toBeNull();
    expect(await getProject(db, "PGC-PRJ-LAG-2026-000005")).toBeNull();
    expect(await getProject(db, "PGC-PRJ-LAG-2026-000005", true)).not.toBeNull();
    expect(await getProject(db, "missing")).toBeNull();
  });
});

describe("scorecards", () => {
  it("lists published, non-demo scorecards, best score first", async () => {
    const cards = await listScorecards(db);
    expect(cards.map((c) => `${c.official} Q${c.quarter}`)).toEqual(["Rep Two Q2", "Governor One Q2", "Governor One Q1"]);
  });

  it("computes overall, grade and trend from assessments and weights", async () => {
    const cards = await listScorecards(db);
    const gov2 = cards.find((c) => c.official === "Governor One" && c.quarter === 2)!;
    const gov1 = cards.find((c) => c.official === "Governor One" && c.quarter === 1)!;
    expect(gov1.overall).toBe(71.5);
    expect(gov2.overall).toBe(80);
    expect(gov2.grade).toBe("Good");
    expect(gov2.previous).toBe(71.5);
    expect(gov2.trend).toBe("up");
    expect(gov1.previous).toBeNull();
    expect(gov1.trend).toBe("n/a");
    expect(gov2.office).toBe("State Governor");
    expect(gov2.jurisdiction).toBe("Benue");
  });

  it("marks an office Not Yet Rated when evidence is insufficient", async () => {
    const rep = (await listScorecards(db)).find((c) => c.official === "Rep Two")!;
    expect(rep.overall).toBe(90);
    expect(rep.jurisdiction).toBe("Surulere, Lagos");

    const thin = await addOfficial("Thin Evidence", "councillor", "benue", "makurdi");
    await addCard(thin, 2026, 2, "published", { A: 100, B: 100 });
    const row = (await listScorecards(db)).find((c) => c.official === "Thin Evidence")!;
    expect(row.overall).toBeNull();
    expect(row.grade).toBe("Not Yet Rated");
  });

  it("filters by year, quarter, state and office", async () => {
    expect((await listScorecards(db, { quarter: 1 })).map((c) => c.official)).toEqual(["Governor One"]);
    expect((await listScorecards(db, { state: "lagos" })).map((c) => c.official)).toEqual(["Rep Two"]);
    expect((await listScorecards(db, { office: "governor" })).length).toBe(2);
    expect((await listScorecards(db, { office: "nonsense" })).length).toBeGreaterThanOrEqual(3);
  });

  it("returns detail with category evidence and history", async () => {
    const list = await listScorecards(db, { office: "governor", quarter: 2 });
    const detail = await getScorecard(db, list[0].id);
    expect(detail?.categoryDetails.map((c) => c.category)).toEqual(["A", "B", "C", "D", "E", "F"]);
    expect(detail?.categoryDetails[0]).toMatchObject({ label: "Project Delivery", weight: 30, score: 80, evidence: "evidence A" });
    expect(detail?.history.map((h) => `Q${h.quarter}`)).toEqual(["Q2", "Q1"]);
  });

  it("hides drafts and demo scorecards", async () => {
    const drafts = await db.query<{ id: string }>("SELECT id FROM scorecards WHERE status = 'draft'");
    expect(await getScorecard(db, Number(drafts.rows[0].id))).toBeNull();
    const demo = await db.query<{ id: string }>("SELECT id FROM scorecards WHERE is_demo = true");
    expect(await getScorecard(db, Number(demo.rows[0].id))).toBeNull();
    expect(await getScorecard(db, Number(demo.rows[0].id), true)).not.toBeNull();
  });
});

describe("stats and dashboard", () => {
  it("counts only active, non-demo members and published, non-demo records", async () => {
    const s = await computeStats(db);
    expect(s.members.total).toBe(2);
    expect(s.projects.total).toBe(3);
    expect(s.projects.verified).toBe(1);
    expect(s.projects.by_status?.ongoing).toBe(1);
    expect(s.scorecards_published).toBe(4);
    expect(s.directory.lgas).toBe(768);
  });

  it("builds dashboard tables and applies filters", async () => {
    const d = await computeDashboard(db, {});
    expect(d.membersByState.map((m) => [m.state, m.total])).toEqual([
      ["Benue", 1],
      ["Lagos", 1],
    ]);
    expect(d.projectsByStatus.reduce((a, b) => a + b.total, 0)).toBe(3);
    expect(d.scorecards.latestPeriod).toBe("Q2 2026");

    const benue = await computeDashboard(db, { state: "benue" });
    expect(benue.projectsBySector.map((s) => s.key).sort()).toEqual(["roads", "water"]);
    expect(benue.membersByState).toEqual([{ state: "Benue", slug: "benue", total: 1 }]);

    const sector = await computeDashboard(db, { sector: "roads" });
    expect(sector.projectsByStatus).toEqual([{ key: "ongoing", label: "Ongoing", total: 1 }]);
  });
});
