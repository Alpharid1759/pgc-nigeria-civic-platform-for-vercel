import type { Db } from "@/lib/db";
import { PROJECT_STATUSES, SECTORS } from "@/lib/site";

export interface ProjectSummary {
  id: number;
  projectNo: string;
  title: string;
  status: string;
  verificationStatus: string;
  sector: string | null;
  stateSlug: string;
  lgaSlug: string | null;
  estimatedCost: number | null;
  updatedAt: string;
}

export interface Milestone {
  title: string;
  dueDate: string | null;
  completedDate: string | null;
  status: string;
  evidenceUrl: string | null;
}

export interface ProjectDetail extends ProjectSummary {
  priority: string | null;
  community: string | null;
  beneficiaries: string | null;
  fundingSource: string | null;
  responsibleInstitution: string | null;
  responsibleOffice: string | null;
  contractor: string | null;
  problem: string | null;
  solution: string | null;
  outcomes: string | null;
  procurement: string | null;
  sourceReferences: string | null;
  startDate: string | null;
  endDate: string | null;
  milestones: Milestone[];
}

export interface ProjectFilters {
  state?: string;
  lga?: string;
  sector?: string;
  status?: string;
  page?: number;
  perPage?: number;
}

interface ProjectRow {
  id: string;
  project_no: string;
  title: string;
  status: string;
  verification_status: string;
  sector: string | null;
  state_slug: string;
  lga_slug: string | null;
  estimated_cost: string | null;
  updated_at: Date | string;
  priority?: string | null;
  community?: string | null;
  beneficiaries?: string | null;
  funding_source?: string | null;
  responsible_institution?: string | null;
  responsible_office?: string | null;
  contractor?: string | null;
  problem?: string | null;
  solution?: string | null;
  outcomes?: string | null;
  procurement?: string | null;
  source_references?: string | null;
  start_date?: Date | string | null;
  end_date?: Date | string | null;
}

const iso = (v: Date | string | null | undefined): string | null =>
  v === null || v === undefined ? null : v instanceof Date ? v.toISOString() : String(v);

const dateOnly = (v: Date | string | null | undefined): string | null => {
  const s = iso(v);
  return s ? s.slice(0, 10) : null;
};

function summary(r: ProjectRow): ProjectSummary {
  return {
    id: Number(r.id),
    projectNo: r.project_no,
    title: r.title,
    status: r.status,
    verificationStatus: r.verification_status,
    sector: r.sector,
    stateSlug: r.state_slug,
    lgaSlug: r.lga_slug,
    estimatedCost: r.estimated_cost === null ? null : Number(r.estimated_cost),
    updatedAt: iso(r.updated_at) ?? "",
  };
}

const SUMMARY_COLUMNS =
  "id, project_no, title, status, verification_status, sector, state_slug, lga_slug, estimated_cost, updated_at";

function visibility(includeDemo: boolean): string {
  return includeDemo ? "published = true" : "published = true AND is_demo = false";
}

export async function listProjects(
  db: Db,
  filters: ProjectFilters,
  includeDemo = false,
): Promise<{ items: ProjectSummary[]; total: number; page: number; perPage: number }> {
  const where = [visibility(includeDemo)];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    where.push(sql.replace("?", `$${params.length}`));
  };

  if (filters.state) add("state_slug = ?", filters.state);
  if (filters.lga) add("lga_slug = ?", filters.lga);
  if (filters.sector && filters.sector in SECTORS) add("sector = ?", filters.sector);
  if (filters.status && filters.status in PROJECT_STATUSES) add("status = ?", filters.status);

  const perPage = Math.max(1, Math.min(50, filters.perPage ?? 20));
  const page = Math.max(1, filters.page ?? 1);
  const clause = where.join(" AND ");

  const total = await db.query<{ n: string }>(`SELECT count(*) AS n FROM projects WHERE ${clause}`, params);
  const rows = await db.query<ProjectRow>(
    `SELECT ${SUMMARY_COLUMNS} FROM projects WHERE ${clause}
     ORDER BY updated_at DESC, id DESC LIMIT ${perPage} OFFSET ${(page - 1) * perPage}`,
    params,
  );
  return { items: rows.rows.map(summary), total: Number(total.rows[0]?.n ?? 0), page, perPage };
}

export async function recentProjects(db: Db, limit: number, includeDemo = false): Promise<ProjectSummary[]> {
  const rows = await db.query<ProjectRow>(
    `SELECT ${SUMMARY_COLUMNS} FROM projects WHERE ${visibility(includeDemo)} ORDER BY updated_at DESC, id DESC LIMIT $1`,
    [limit],
  );
  return rows.rows.map(summary);
}

export async function getProject(db: Db, projectNo: string, includeDemo = false): Promise<ProjectDetail | null> {
  const found = await db.query<ProjectRow>(
    `SELECT ${SUMMARY_COLUMNS}, priority, community, beneficiaries, funding_source, responsible_institution,
            responsible_office, contractor, problem, solution, outcomes, procurement, source_references,
            start_date::text AS start_date, end_date::text AS end_date
     FROM projects WHERE project_no = $1 AND ${visibility(includeDemo)}`,
    [projectNo],
  );
  const r = found.rows[0];
  if (!r) return null;

  const ms = await db.query<{
    title: string;
    due_date: Date | string | null;
    completed_date: Date | string | null;
    status: string;
    evidence_url: string | null;
  }>(
    `SELECT title, due_date::text AS due_date, completed_date::text AS completed_date, status, evidence_url
     FROM project_milestones WHERE project_id = $1 ORDER BY sort_order, id`,
    [Number(r.id)],
  );

  return {
    ...summary(r),
    priority: r.priority ?? null,
    community: r.community ?? null,
    beneficiaries: r.beneficiaries ?? null,
    fundingSource: r.funding_source ?? null,
    responsibleInstitution: r.responsible_institution ?? null,
    responsibleOffice: r.responsible_office ?? null,
    contractor: r.contractor ?? null,
    problem: r.problem ?? null,
    solution: r.solution ?? null,
    outcomes: r.outcomes ?? null,
    procurement: r.procurement ?? null,
    sourceReferences: r.source_references ?? null,
    startDate: dateOnly(r.start_date),
    endDate: dateOnly(r.end_date),
    milestones: ms.rows.map((m) => ({
      title: m.title,
      dueDate: dateOnly(m.due_date),
      completedDate: dateOnly(m.completed_date),
      status: m.status,
      evidenceUrl: m.evidence_url,
    })),
  };
}
