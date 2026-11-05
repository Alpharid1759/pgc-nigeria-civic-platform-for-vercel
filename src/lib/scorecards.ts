import type { Db } from "@/lib/db";
import { OFFICES, officeLabel } from "@/lib/constants";
import { areaLabel } from "@/lib/directory";
import { grade, overall as computeOverall, trend as computeTrend, type Grade, type Trend } from "@/lib/scoring";

export interface ScorecardSummary {
  id: number;
  officialId: number;
  official: string;
  officeType: string;
  office: string;
  jurisdiction: string;
  year: number;
  quarter: number;
  overall: number | null;
  grade: Grade;
  previous: number | null;
  trend: Trend;
  categories: Record<string, number | null>;
  verification: string | null;
  publishedOn: string | null;
}

export interface CategoryDetail {
  category: string;
  label: string;
  weight: number;
  score: number | null;
  evidence: string;
}

export interface ScorecardDetail extends ScorecardSummary {
  categoryDetails: CategoryDetail[];
  citizenFeedback: string | null;
  evaluatorComments: string | null;
  officialResponse: string | null;
  history: { id: number; year: number; quarter: number; overall: number | null; grade: Grade }[];
}

export interface ScorecardFilters {
  year?: number;
  quarter?: number;
  state?: string;
  office?: string;
  limit?: number;
}

interface CardRow {
  id: string;
  official_id: string;
  name: string;
  office_type: string;
  state_slug: string | null;
  lga_slug: string | null;
  year: number;
  quarter: number;
  verification_status: string | null;
  published_on: Date | string | null;
  citizen_feedback?: string | null;
  evaluator_comments?: string | null;
  official_response?: string | null;
}

interface Evaluated {
  scores: Record<string, number | null>;
  evidence: Record<string, string>;
  overall: number | null;
}

type Weights = Map<string, Record<string, { label: string; weight: number }>>;

async function loadWeights(db: Db): Promise<Weights> {
  const res = await db.query<{ office_type: string; category: string; label: string; weight: string }>(
    "SELECT office_type, category, label, weight FROM scorecard_indicators WHERE active = true ORDER BY category",
  );
  const out: Weights = new Map();
  for (const r of res.rows) {
    const entry = out.get(r.office_type) ?? {};
    entry[r.category] = { label: r.label, weight: Number(r.weight) };
    out.set(r.office_type, entry);
  }
  return out;
}

async function evaluate(
  db: Db,
  cards: { id: string; office_type: string }[],
  weights: Weights,
): Promise<Map<string, Evaluated>> {
  const out = new Map<string, Evaluated>();
  if (cards.length === 0) return out;

  const ids = cards.map((c) => Number(c.id));
  const rows = await db.query<{ scorecard_id: string; category: string; score: string | null; evidence: string | null }>(
    `SELECT a.scorecard_id, i.category, a.score, a.evidence
     FROM assessments a JOIN scorecard_indicators i ON i.id = a.indicator_id
     WHERE a.scorecard_id = ANY($1::bigint[])`,
    [ids],
  );

  const byCard = new Map<string, { scores: Record<string, number | null>; evidence: Record<string, string> }>();
  for (const r of rows.rows) {
    const entry = byCard.get(r.scorecard_id) ?? { scores: {}, evidence: {} };
    entry.scores[r.category] = r.score === null ? null : Number(r.score);
    entry.evidence[r.category] = r.evidence ?? "";
    byCard.set(r.scorecard_id, entry);
  }

  for (const c of cards) {
    const entry = byCard.get(c.id) ?? { scores: {}, evidence: {} };
    const w = weights.get(c.office_type) ?? {};
    const flat = Object.fromEntries(Object.entries(w).map(([k, v]) => [k, v.weight]));
    out.set(c.id, { ...entry, overall: computeOverall(entry.scores, flat) });
  }
  return out;
}

const iso = (v: Date | string | null): string | null => (v === null ? null : v instanceof Date ? v.toISOString() : String(v));

function previousPeriod(year: number, quarter: number): [number, number] {
  return quarter === 1 ? [year - 1, 4] : [year, quarter - 1];
}

async function previousScores(db: Db, rows: CardRow[], weights: Weights): Promise<Map<string, number | null>> {
  const out = new Map<string, number | null>();
  if (rows.length === 0) return out;

  const officialIds = [...new Set(rows.map((r) => Number(r.official_id)))];
  const history = await db.query<{ id: string; official_id: string; year: number; quarter: number; office_type: string }>(
    `SELECT s.id, s.official_id, s.year, s.quarter, o.office_type
     FROM scorecards s JOIN officials o ON o.id = s.official_id
     WHERE s.status = 'published' AND s.official_id = ANY($1::bigint[])`,
    [officialIds],
  );
  const evaluated = await evaluate(db, history.rows, weights);

  for (const r of rows) {
    const [py, pq] = previousPeriod(r.year, r.quarter);
    const prev = history.rows.find((h) => h.official_id === r.official_id && h.year === py && h.quarter === pq);
    out.set(r.id, prev ? (evaluated.get(prev.id)?.overall ?? null) : null);
  }
  return out;
}

function toSummary(r: CardRow, ev: Evaluated, previous: number | null): ScorecardSummary {
  return {
    id: Number(r.id),
    officialId: Number(r.official_id),
    official: r.name,
    officeType: r.office_type,
    office: officeLabel(r.office_type),
    jurisdiction: areaLabel(r.state_slug, r.lga_slug),
    year: r.year,
    quarter: r.quarter,
    overall: ev.overall,
    grade: grade(ev.overall),
    previous,
    trend: computeTrend(ev.overall, previous),
    categories: ev.scores,
    verification: r.verification_status,
    publishedOn: iso(r.published_on),
  };
}

const CARD_COLUMNS = `s.id, s.official_id, o.name, o.office_type, o.state_slug, o.lga_slug, s.year, s.quarter,
  s.verification_status, s.published_on`;

export async function listScorecards(db: Db, filters: ScorecardFilters = {}, includeDemo = false): Promise<ScorecardSummary[]> {
  const where = ["s.status = 'published'"];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    where.push(sql.replace("?", `$${params.length}`));
  };
  if (!includeDemo) where.push("s.is_demo = false");
  if (filters.year) add("s.year = ?", filters.year);
  if (filters.quarter && filters.quarter >= 1 && filters.quarter <= 4) add("s.quarter = ?", filters.quarter);
  if (filters.state) add("o.state_slug = ?", filters.state);
  if (filters.office && filters.office in OFFICES) add("o.office_type = ?", filters.office);

  const limit = Math.max(1, Math.min(1000, filters.limit ?? 200));
  const res = await db.query<CardRow>(
    `SELECT ${CARD_COLUMNS} FROM scorecards s JOIN officials o ON o.id = s.official_id
     WHERE ${where.join(" AND ")} ORDER BY s.year DESC, s.quarter DESC, s.id DESC LIMIT ${limit}`,
    params,
  );

  const weights = await loadWeights(db);
  const evaluated = await evaluate(db, res.rows, weights);
  const previous = await previousScores(db, res.rows, weights);

  const items = res.rows.map((r) => toSummary(r, evaluated.get(r.id)!, previous.get(r.id) ?? null));
  return items.sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1));
}

export async function getScorecard(db: Db, id: number, includeDemo = false): Promise<ScorecardDetail | null> {
  const res = await db.query<CardRow>(
    `SELECT ${CARD_COLUMNS}, s.citizen_feedback, s.evaluator_comments, s.official_response
     FROM scorecards s JOIN officials o ON o.id = s.official_id
     WHERE s.id = $1 AND s.status = 'published' ${includeDemo ? "" : "AND s.is_demo = false"}`,
    [id],
  );
  const r = res.rows[0];
  if (!r) return null;

  const weights = await loadWeights(db);
  const evaluated = await evaluate(db, [r], weights);
  const ev = evaluated.get(r.id)!;
  const previous = (await previousScores(db, [r], weights)).get(r.id) ?? null;

  const w = weights.get(r.office_type) ?? {};
  const categoryDetails: CategoryDetail[] = Object.entries(w).map(([category, info]) => ({
    category,
    label: info.label,
    weight: info.weight,
    score: ev.scores[category] ?? null,
    evidence: ev.evidence[category] ?? "",
  }));

  const hist = await db.query<{ id: string; official_id: string; year: number; quarter: number; office_type: string }>(
    `SELECT s.id, s.official_id, s.year, s.quarter, o.office_type
     FROM scorecards s JOIN officials o ON o.id = s.official_id
     WHERE s.status = 'published' AND s.official_id = $1 ${includeDemo ? "" : "AND s.is_demo = false"}
     ORDER BY s.year DESC, s.quarter DESC`,
    [Number(r.official_id)],
  );
  const histEval = await evaluate(db, hist.rows, weights);

  return {
    ...toSummary(r, ev, previous),
    categoryDetails,
    citizenFeedback: r.citizen_feedback ?? null,
    evaluatorComments: r.evaluator_comments ?? null,
    officialResponse: r.official_response ?? null,
    history: hist.rows.map((h) => {
      const o = histEval.get(h.id)?.overall ?? null;
      return { id: Number(h.id), year: h.year, quarter: h.quarter, overall: o, grade: grade(o) };
    }),
  };
}
