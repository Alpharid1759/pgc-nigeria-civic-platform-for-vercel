import type { Db } from "@/lib/db";
import { MIN_MANDATE_ITEMS, MIN_MEMBER_MONTHS, OFFICES, PUBLIC_CANDIDATE_STATUSES } from "@/lib/constants";
import { areaLabel, findChild, findTop } from "@/lib/directory";
import { audit, normalisePhone } from "@/lib/security";

export type Scope = "nation" | "state" | "local";

/** Jurisdiction in which a candidate's Mandate Projects must sit (draft Constitution, Article 20(2)). */
export function scopeFor(office: string): Scope | null {
  if (office === "president") return "nation";
  const info = OFFICES[office];
  if (!info || !info.elected) return null;
  return info.level === "federal" || info.level === "state" ? "state" : "local";
}

/** Maps a Development Register status to a mandate delivery state. Only "verified" counts as delivered. */
export function deliveryState(projectStatus: string): string {
  switch (projectStatus) {
    case "verified":
      return "delivered";
    case "completed":
      return "awaiting_verification";
    case "ongoing":
      return "in_progress";
    case "delayed":
    case "suspended":
      return "delayed";
    case "cancelled":
      return "cancelled";
    default:
      return "planning";
  }
}

// ---------------------------------------------------------------- aspirants

export interface AspirantInput {
  membershipNo: string;
  phone: string;
  office: string;
  state?: string;
  lga?: string;
  constituency?: string;
  electionYear: number;
}

export type AspirantError = "invalid" | "not_member" | "too_new" | "duplicate";
export type AspirantResult = { ok: true; candidateId: number } | { ok: false; error: AspirantError };

export async function registerAspirant(
  db: Db,
  input: AspirantInput,
  options: { minMemberMonths?: number; hashedIp?: string | null } = {},
): Promise<AspirantResult> {
  const scope = scopeFor(input.office);
  const year = new Date().getUTCFullYear();
  if (!scope || !Number.isInteger(input.electionYear) || input.electionYear < year || input.electionYear > year + 6) {
    return { ok: false, error: "invalid" };
  }
  let state: string | null = null;
  let lga: string | null = null;
  if (scope !== "nation") {
    if (!input.state || !findTop(input.state)) return { ok: false, error: "invalid" };
    state = input.state;
  }
  if (scope === "local") {
    if (!input.lga || !findChild(input.state!, input.lga)) return { ok: false, error: "invalid" };
    lga = input.lga;
  }

  const phone = normalisePhone(input.phone);
  const found = await db.query<{ id: string; status: string; months: string }>(
    `SELECT m.id, m.status,
            (extract(year FROM age(now(), m.approved_at)) * 12 + extract(month FROM age(now(), m.approved_at)))::text AS months
     FROM members m JOIN membership_applications a ON a.id = m.application_id
     WHERE m.membership_no = $1 AND a.phone = $2`,
    [input.membershipNo.trim().toUpperCase(), phone],
  );
  const member = found.rows[0];
  if (!phone || !member || member.status !== "active") return { ok: false, error: "not_member" };
  if (Number(member.months) < (options.minMemberMonths ?? MIN_MEMBER_MONTHS)) return { ok: false, error: "too_new" };

  const constituency = (input.constituency ?? "").replace(/[\u0000-\u001F]/g, "").trim().slice(0, 190) || null;
  try {
    const res = await db.query<{ id: string }>(
      `INSERT INTO candidates (member_id, office_type, state_slug, lga_slug, constituency, election_year)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [Number(member.id), input.office, state, lga, constituency, input.electionYear],
    );
    const id = Number(res.rows[0].id);
    await audit(db, "aspirant_registered", "candidate", id, { office: input.office }, options.hashedIp ?? null);
    return { ok: true, candidateId: id };
  } catch (err) {
    if (err instanceof Error && /unique|duplicate/i.test(err.message)) return { ok: false, error: "duplicate" };
    throw err;
  }
}

// ------------------------------------------------------------ mandate items

export type ItemError =
  | "not_found"
  | "locked"
  | "no_project"
  | "not_predetermined"
  | "out_of_scope"
  | "bad_date"
  | "duplicate";
export type ItemResult = { ok: true } | { ok: false; error: ItemError };

interface CandRow {
  id: string;
  office_type: string;
  state_slug: string | null;
  lga_slug: string | null;
  election_year: number;
  status: string;
  declared_at: Date | string;
  mandate_signed_at: Date | string | null;
}

async function loadCandidate(db: Db, id: number): Promise<CandRow | undefined> {
  const r = await db.query<CandRow>(
    `SELECT id, office_type, state_slug, lga_slug, election_year, status, declared_at, mandate_signed_at
     FROM candidates WHERE id = $1`,
    [id],
  );
  return r.rows[0];
}

/**
 * Adds a project to a candidate's Mandate. The project must have been in the Register before the aspirant
 * declared (Article 18(2)), sit in the office's jurisdiction (Article 20(2)) and be published.
 * After signature only the Mandate Committee may add (committee = true).
 */
export async function addMandateItem(
  db: Db,
  candidateId: number,
  projectNo: string,
  targetDate: string,
  options: { committee?: boolean; actor?: string } = {},
): Promise<ItemResult> {
  const cand = await loadCandidate(db, candidateId);
  if (!cand) return { ok: false, error: "not_found" };
  if (cand.mandate_signed_at && !options.committee) return { ok: false, error: "locked" };

  const proj = await db.query<{ id: string; state_slug: string; lga_slug: string | null; created_at: Date | string; published: boolean }>(
    "SELECT id, state_slug, lga_slug, created_at, published FROM projects WHERE project_no = $1",
    [projectNo.trim()],
  );
  const p = proj.rows[0];
  if (!p || !p.published) return { ok: false, error: "no_project" };
  if (new Date(p.created_at).getTime() >= new Date(cand.declared_at).getTime()) {
    return { ok: false, error: "not_predetermined" };
  }

  const scope = scopeFor(cand.office_type);
  if (scope === "state" && p.state_slug !== cand.state_slug) return { ok: false, error: "out_of_scope" };
  if (scope === "local" && (p.state_slug !== cand.state_slug || p.lga_slug !== cand.lga_slug)) {
    return { ok: false, error: "out_of_scope" };
  }

  const target = /^\d{4}-\d{2}-\d{2}$/.test(targetDate) ? new Date(`${targetDate}T00:00:00Z`) : null;
  const latest = new Date(Date.UTC(cand.election_year + 5, 11, 31));
  if (!target || Number.isNaN(target.getTime()) || target.getTime() < new Date(cand.declared_at).getTime() || target > latest) {
    return { ok: false, error: "bad_date" };
  }

  try {
    await db.query(
      "INSERT INTO mandate_items (candidate_id, project_id, target_date, added_by) VALUES ($1, $2, $3, $4)",
      [candidateId, Number(p.id), targetDate, options.actor ?? "candidate"],
    );
  } catch (err) {
    if (err instanceof Error && /unique|duplicate/i.test(err.message)) return { ok: false, error: "duplicate" };
    throw err;
  }
  await audit(db, "mandate_item_added", "candidate", candidateId, { projectNo, committee: Boolean(options.committee) });
  return { ok: true };
}

/** Mandate Committee only: marks an item removed for lawful impossibility. The reason is public. */
export async function removeMandateItem(db: Db, itemId: number, reason: string, reviewer: string): Promise<ItemResult> {
  const text = reason.replace(/[\u0000-\u001F]/g, "").trim().slice(0, 2000);
  if (text.length < 10) return { ok: false, error: "bad_date" };
  const res = await db.query<{ candidate_id: string }>(
    `UPDATE mandate_items SET removed_at = now(), removed_reason = $2, removed_by = $3
     WHERE id = $1 AND removed_at IS NULL RETURNING candidate_id`,
    [itemId, text, reviewer],
  );
  if (!res.rows[0]) return { ok: false, error: "not_found" };
  await audit(db, "mandate_item_removed", "candidate", Number(res.rows[0].candidate_id), { itemId }, null, reviewer);
  return { ok: true };
}

export type SignError = "not_found" | "already_signed" | "too_few_items";
export type SignResult = { ok: true } | { ok: false; error: SignError; needed?: number };

/** Signing locks the Mandate (Article 20(3)). Requires at least MIN_MANDATE_ITEMS active items. */
export async function signMandate(db: Db, candidateId: number): Promise<SignResult> {
  const cand = await loadCandidate(db, candidateId);
  if (!cand) return { ok: false, error: "not_found" };
  if (cand.mandate_signed_at) return { ok: false, error: "already_signed" };
  const n = await db.query<{ n: string }>(
    "SELECT count(*) AS n FROM mandate_items WHERE candidate_id = $1 AND removed_at IS NULL",
    [candidateId],
  );
  const count = Number(n.rows[0]?.n ?? 0);
  if (count < MIN_MANDATE_ITEMS) return { ok: false, error: "too_few_items", needed: MIN_MANDATE_ITEMS - count };
  await db.query("UPDATE candidates SET mandate_signed_at = now() WHERE id = $1", [candidateId]);
  await audit(db, "mandate_signed", "candidate", candidateId, { items: count });
  return { ok: true };
}

// ------------------------------------------------------------------ screening

export type StatusError = "not_found" | "no_mandate" | "bad_transition";
export type StatusResult = { ok: true } | { ok: false; error: StatusError };

const TRANSITIONS: Record<string, string[]> = {
  aspirant: ["cleared", "disqualified", "withdrawn"],
  cleared: ["nominated", "withdrawn", "disqualified"],
  nominated: ["elected", "ended", "withdrawn", "disqualified"],
  elected: ["serving", "ended"],
  serving: ["ended"],
};

/** Screening and lifecycle. Clearing needs a signed Mandate (Article 19(2)). Clearing publishes the candidate. */
export async function setCandidateStatus(
  db: Db,
  candidateId: number,
  status: string,
  reviewer: string,
  notes = "",
): Promise<StatusResult> {
  const cand = await loadCandidate(db, candidateId);
  if (!cand) return { ok: false, error: "not_found" };
  if (!(TRANSITIONS[cand.status] ?? []).includes(status)) return { ok: false, error: "bad_transition" };
  if (status === "cleared" && !cand.mandate_signed_at) return { ok: false, error: "no_mandate" };

  const publish = (PUBLIC_CANDIDATE_STATUSES as readonly string[]).includes(status);
  const note = notes.replace(/[\u0000-\u001F]/g, "").trim().slice(0, 2000);
  await db.query(
    `UPDATE candidates SET status = $2::varchar, published = $3::boolean,
       screening_notes = CASE WHEN $4::text <> '' THEN $4::text ELSE screening_notes END,
       cleared_by = CASE WHEN $5::boolean THEN $6::varchar ELSE cleared_by END,
       cleared_at = CASE WHEN $5::boolean THEN now() ELSE cleared_at END
     WHERE id = $1`,
    [candidateId, status, publish, note, status === "cleared", reviewer],
  );
  await audit(db, "candidate_status", "candidate", candidateId, { status, publish }, null, reviewer);
  return { ok: true };
}

// ------------------------------------------------------------------- reading

export interface MandateItemView {
  id: number;
  projectNo: string;
  title: string;
  projectStatus: string;
  state: string;
  target: string;
  overdue: boolean;
  removedReason: string | null;
}

export interface MandateSummary {
  total: number;
  delivered: number;
  awaiting: number;
  overdue: number;
  deliveryRate: number | null;
}

export interface CandidateSummary {
  id: number;
  name: string;
  membershipNo: string;
  office: string;
  officeType: string;
  jurisdiction: string;
  electionYear: number;
  status: string;
  summary: MandateSummary;
}

export interface CandidateDetail extends CandidateSummary {
  constituency: string | null;
  signedAt: string | null;
  items: MandateItemView[];
}

interface ItemRow {
  id: string;
  candidate_id: string;
  project_no: string;
  title: string;
  status: string;
  target: string;
  removed_reason: string | null;
  removed: boolean;
}

function summarise(items: ItemRow[], today: string): MandateSummary {
  const active = items.filter((i) => !i.removed);
  const delivered = active.filter((i) => deliveryState(i.status) === "delivered").length;
  const awaiting = active.filter((i) => deliveryState(i.status) === "awaiting_verification").length;
  const overdue = active.filter((i) => i.target < today && deliveryState(i.status) !== "delivered").length;
  return {
    total: active.length,
    delivered,
    awaiting,
    overdue,
    deliveryRate: active.length ? Math.round((delivered / active.length) * 1000) / 10 : null,
  };
}

interface CandidateRow {
  id: string;
  name: string;
  membership_no: string;
  office_type: string;
  state_slug: string | null;
  lga_slug: string | null;
  constituency: string | null;
  election_year: number;
  status: string;
  signed_at: string | null;
}

const CAND_SELECT = `SELECT c.id, a.full_name AS name, m.membership_no, c.office_type, c.state_slug, c.lga_slug, c.constituency,
  c.election_year, c.status, c.mandate_signed_at::text AS signed_at
  FROM candidates c JOIN members m ON m.id = c.member_id JOIN membership_applications a ON a.id = m.application_id`;

async function loadItems(db: Db, candidateIds: number[]): Promise<ItemRow[]> {
  if (candidateIds.length === 0) return [];
  const r = await db.query<ItemRow>(
    `SELECT i.id, i.candidate_id, p.project_no, p.title, p.status, i.target_date::text AS target,
            i.removed_reason, (i.removed_at IS NOT NULL) AS removed
     FROM mandate_items i JOIN projects p ON p.id = i.project_id
     WHERE i.candidate_id = ANY($1::bigint[]) ORDER BY i.id`,
    [candidateIds],
  );
  return r.rows;
}

function jurisdictionOf(r: CandidateRow): string {
  return r.state_slug ? areaLabel(r.state_slug, r.lga_slug) : "Nigeria (national)";
}

function base(r: CandidateRow, items: ItemRow[], today: string): CandidateSummary {
  return {
    id: Number(r.id),
    name: r.name,
    membershipNo: r.membership_no,
    office: OFFICES[r.office_type]?.label ?? r.office_type,
    officeType: r.office_type,
    jurisdiction: jurisdictionOf(r),
    electionYear: r.election_year,
    status: r.status,
    summary: summarise(items, today),
  };
}

export interface CandidateFilters {
  state?: string;
  office?: string;
  status?: string;
}

export async function listCandidates(db: Db, filters: CandidateFilters = {}, includeDemo = false): Promise<CandidateSummary[]> {
  const where = ["c.published = true", "c.mandate_signed_at IS NOT NULL"];
  const params: unknown[] = [];
  const add = (sql: string, v: unknown) => {
    params.push(v);
    where.push(sql.replace("?", `$${params.length}`));
  };
  if (!includeDemo) where.push("c.is_demo = false");
  if (filters.state) add("c.state_slug = ?", filters.state);
  if (filters.office && filters.office in OFFICES) add("c.office_type = ?", filters.office);
  if (filters.status && (PUBLIC_CANDIDATE_STATUSES as readonly string[]).includes(filters.status)) add("c.status = ?", filters.status);
  const rows = await db.query<CandidateRow>(`${CAND_SELECT} WHERE ${where.join(" AND ")} ORDER BY c.election_year DESC, c.id DESC LIMIT 500`, params);
  const items = await loadItems(db, rows.rows.map((r) => Number(r.id)));
  const today = new Date().toISOString().slice(0, 10);
  return rows.rows.map((r) =>
    base(r, items.filter((i) => i.candidate_id === r.id), today),
  );
}

export async function getCandidate(db: Db, id: number, includeDemo = false): Promise<CandidateDetail | null> {
  const rows = await db.query<CandidateRow>(
    `${CAND_SELECT} WHERE c.id = $1 AND c.published = true AND c.mandate_signed_at IS NOT NULL ${includeDemo ? "" : "AND c.is_demo = false"}`,
    [id],
  );
  const r = rows.rows[0];
  if (!r) return null;
  const items = await loadItems(db, [id]);
  const today = new Date().toISOString().slice(0, 10);
  return {
    ...base(r, items, today),
    constituency: r.constituency,
    signedAt: r.signed_at,
    items: items.map((i) => ({
      id: Number(i.id),
      projectNo: i.project_no,
      title: i.title,
      projectStatus: i.status,
      state: i.removed ? "removed" : deliveryState(i.status),
      target: i.target,
      overdue: !i.removed && i.target < today && deliveryState(i.status) !== "delivered",
      removedReason: i.removed_reason,
    })),
  };
}

export async function candidateCounts(db: Db, includeDemo = false): Promise<{ candidates: number; mandateProjects: number }> {
  const demo = includeDemo ? "" : "AND c.is_demo = false";
  const c = await db.query<{ n: string }>(
    `SELECT count(*) AS n FROM candidates c WHERE c.published = true AND c.mandate_signed_at IS NOT NULL ${demo}`,
  );
  const i = await db.query<{ n: string }>(
    `SELECT count(*) AS n FROM mandate_items i JOIN candidates c ON c.id = i.candidate_id
     WHERE i.removed_at IS NULL AND c.published = true AND c.mandate_signed_at IS NOT NULL ${demo}`,
  );
  return { candidates: Number(c.rows[0]?.n ?? 0), mandateProjects: Number(i.rows[0]?.n ?? 0) };
}

// --------------------------------------------------------------- submission

export interface MandateLine {
  projectNo: string;
  targetDate: string;
}

export interface MandateSubmission extends AspirantInput {
  lines: MandateLine[];
  sign: boolean;
}

export type SubmissionResult =
  | {
      ok: true;
      candidateId: number;
      signed: boolean;
      needed: number;
      lineErrors: { line: number; projectNo: string; error: ItemError }[];
    }
  | { ok: false; error: AspirantError | "locked" };

/**
 * One-step registration for a member: registers (or finds) the aspirant, adds each Mandate Project,
 * and signs the Mandate when asked and every line is valid. The member's identity is checked by
 * membership number and phone before anything is written.
 */
export async function submitMandate(
  db: Db,
  input: MandateSubmission,
  options: { minMemberMonths?: number; hashedIp?: string | null } = {},
): Promise<SubmissionResult> {
  let reg = await registerAspirant(db, input, options);
  let candidateId: number;
  if (reg.ok) {
    candidateId = reg.candidateId;
  } else if (reg.error === "duplicate") {
    const phone = normalisePhone(input.phone);
    const existing = await db.query<{ id: string; mandate_signed_at: string | null }>(
      `SELECT c.id, c.mandate_signed_at::text AS mandate_signed_at
       FROM candidates c JOIN members m ON m.id = c.member_id JOIN membership_applications a ON a.id = m.application_id
       WHERE m.membership_no = $1 AND a.phone = $2 AND c.office_type = $3 AND c.election_year = $4`,
      [input.membershipNo.trim().toUpperCase(), phone, input.office, input.electionYear],
    );
    const row = existing.rows[0];
    if (!row) return { ok: false, error: "duplicate" };
    if (row.mandate_signed_at) return { ok: false, error: "locked" };
    candidateId = Number(row.id);
  } else {
    return reg;
  }

  const lineErrors: { line: number; projectNo: string; error: ItemError }[] = [];
  for (let i = 0; i < input.lines.length; i++) {
    const r = await addMandateItem(db, candidateId, input.lines[i].projectNo, input.lines[i].targetDate);
    if (!r.ok && r.error !== "duplicate") lineErrors.push({ line: i + 1, projectNo: input.lines[i].projectNo, error: r.error });
  }

  let signed = false;
  let needed = 0;
  if (input.sign && lineErrors.length === 0) {
    const s = await signMandate(db, candidateId);
    signed = s.ok;
    if (!s.ok && s.error === "too_few_items") needed = s.needed ?? 0;
  }
  return { ok: true, candidateId, signed, needed, lineErrors };
}
