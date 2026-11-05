import { counts, stateName, type DirectoryCounts } from "@/lib/directory";
import { safely, showDemo, type Db } from "@/lib/db";
import { PROJECT_STATUSES, SECTORS } from "@/lib/site";
import { listScorecards } from "@/lib/scorecards";

export interface PublicStats {
  generated_at: string;
  directory: DirectoryCounts;
  members: { total: number | null };
  projects: { total: number | null; verified: number | null; by_status: Record<string, number> | null };
  scorecards_published: number | null;
  note: string;
}

export interface DashboardFilters {
  state?: string;
  sector?: string;
  status?: string;
}

export interface Dashboard {
  stats: PublicStats;
  membersByState: { state: string; slug: string; total: number }[];
  projectsBySector: { key: string; label: string; total: number }[];
  projectsByStatus: { key: string; label: string; total: number }[];
  scorecards: { published: number; ratedLatestQuarter: number; averageLatestQuarter: number | null; latestPeriod: string | null };
}

const NOTE_DB = "Live database counts. Demonstration records are excluded.";
const NOTE_NO_DB =
  "Directory counts are computed from bundled directory data. Member, project and scorecard counts are unavailable until a database is connected.";

function emptyStats(): PublicStats {
  return {
    generated_at: new Date().toISOString(),
    directory: counts(),
    members: { total: null },
    projects: { total: null, verified: null, by_status: null },
    scorecards_published: null,
    note: NOTE_NO_DB,
  };
}

function visibleProjects(includeDemo: boolean): string {
  return includeDemo ? "published = true" : "published = true AND is_demo = false";
}

export async function computeStats(db: Db, includeDemo = false): Promise<PublicStats> {
  const demoMember = includeDemo ? "" : "AND is_demo = false";

  const members = await db.query<{ n: string }>(`SELECT count(*) AS n FROM members WHERE status = 'active' ${demoMember}`);
  const byStatus = await db.query<{ status: string; n: string }>(
    `SELECT status, count(*) AS n FROM projects WHERE ${visibleProjects(includeDemo)} GROUP BY status`,
  );
  const cards = await db.query<{ n: string }>(
    `SELECT count(*) AS n FROM scorecards WHERE status = 'published' ${includeDemo ? "" : "AND is_demo = false"}`,
  );

  const statusCounts: Record<string, number> = Object.fromEntries(Object.keys(PROJECT_STATUSES).map((k) => [k, 0]));
  for (const r of byStatus.rows) statusCounts[r.status] = Number(r.n);
  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  return {
    generated_at: new Date().toISOString(),
    directory: counts(),
    members: { total: Number(members.rows[0]?.n ?? 0) },
    projects: { total, verified: statusCounts.verified ?? 0, by_status: statusCounts },
    scorecards_published: Number(cards.rows[0]?.n ?? 0),
    note: NOTE_DB,
  };
}

/** Public stats for pages and the API. Falls back to directory-only figures when no database is reachable. */
export async function getStats(): Promise<PublicStats> {
  return safely((db) => computeStats(db, showDemo()), emptyStats());
}

export async function computeDashboard(db: Db, filters: DashboardFilters = {}, includeDemo = false): Promise<Dashboard> {
  const stats = await computeStats(db, includeDemo);

  const memberWhere = ["status = 'active'"];
  const memberParams: unknown[] = [];
  if (!includeDemo) memberWhere.push("is_demo = false");
  if (filters.state) {
    memberParams.push(filters.state);
    memberWhere.push(`state_slug = $${memberParams.length}`);
  }
  const members = await db.query<{ state_slug: string; n: string }>(
    `SELECT state_slug, count(*) AS n FROM members WHERE ${memberWhere.join(" AND ")} GROUP BY state_slug ORDER BY n DESC, state_slug`,
    memberParams,
  );

  const projWhere = [visibleProjects(includeDemo)];
  const projParams: unknown[] = [];
  if (filters.state) {
    projParams.push(filters.state);
    projWhere.push(`state_slug = $${projParams.length}`);
  }
  if (filters.status && filters.status in PROJECT_STATUSES) {
    projParams.push(filters.status);
    projWhere.push(`status = $${projParams.length}`);
  }
  if (filters.sector && filters.sector in SECTORS) {
    projParams.push(filters.sector);
    projWhere.push(`sector = $${projParams.length}`);
  }
  const bySector = await db.query<{ sector: string | null; n: string }>(
    `SELECT sector, count(*) AS n FROM projects WHERE ${projWhere.join(" AND ")} GROUP BY sector ORDER BY n DESC`,
    projParams,
  );
  const byStatus = await db.query<{ status: string; n: string }>(
    `SELECT status, count(*) AS n FROM projects WHERE ${projWhere.join(" AND ")} GROUP BY status ORDER BY n DESC`,
    projParams,
  );

  const cards = await listScorecards(db, { state: filters.state, limit: 1000 }, includeDemo);
  let latest: { year: number; quarter: number } | null = null;
  for (const c of cards) {
    if (!latest || c.year > latest.year || (c.year === latest.year && c.quarter > latest.quarter)) {
      latest = { year: c.year, quarter: c.quarter };
    }
  }
  const latestRated = latest
    ? cards.filter((c) => c.year === latest!.year && c.quarter === latest!.quarter && c.overall !== null)
    : [];
  const average =
    latestRated.length > 0
      ? Math.round((latestRated.reduce((a, c) => a + (c.overall ?? 0), 0) / latestRated.length) * 10) / 10
      : null;

  return {
    stats,
    membersByState: members.rows.map((r) => ({ state: stateName(r.state_slug) || r.state_slug, slug: r.state_slug, total: Number(r.n) })),
    projectsBySector: bySector.rows.map((r) => ({
      key: r.sector ?? "unspecified",
      label: r.sector ? (SECTORS[r.sector] ?? r.sector) : "Unspecified",
      total: Number(r.n),
    })),
    projectsByStatus: byStatus.rows.map((r) => ({ key: r.status, label: PROJECT_STATUSES[r.status] ?? r.status, total: Number(r.n) })),
    scorecards: {
      published: cards.length,
      ratedLatestQuarter: latestRated.length,
      averageLatestQuarter: average,
      latestPeriod: latest ? `Q${latest.quarter} ${latest.year}` : null,
    },
  };
}

export async function getDashboard(filters: DashboardFilters): Promise<Dashboard | null> {
  return safely((db) => computeDashboard(db, filters, showDemo()), null);
}
