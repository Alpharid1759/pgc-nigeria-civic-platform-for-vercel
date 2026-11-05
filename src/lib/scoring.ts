export const NOT_YET_RATED = "Not Yet Rated";

/** Minimum share of total weight that must have evidence before an overall score is produced. */
export const MIN_EVIDENCE_COVERAGE = 0.6;

export type Category = "A" | "B" | "C" | "D" | "E" | "F";

export interface WeightEntry {
  label: string;
  weight: number;
}

export function defaultWeights(): Record<Category, WeightEntry> {
  return {
    A: { label: "Project Delivery", weight: 30 },
    B: { label: "Financial Transparency", weight: 20 },
    C: { label: "Policy and Programme Implementation", weight: 15 },
    D: { label: "Public Service Delivery", weight: 15 },
    E: { label: "Citizen Engagement and Responsiveness", weight: 10 },
    F: { label: "Institutional Accountability", weight: 10 },
  };
}

export type Scores = Partial<Record<string, number | null>>;

/**
 * Weighted overall score. A null score means insufficient evidence for that category.
 * Returns null (NOT YET RATED) when evidence covers less than MIN_EVIDENCE_COVERAGE of the weight.
 */
export function overall(scores: Scores, weights: Record<string, number>): number | null {
  const totalWeight = Object.values(weights).reduce((a, w) => a + Number(w), 0);
  if (totalWeight <= 0) return null;

  let covered = 0;
  let sum = 0;
  for (const [cat, w] of Object.entries(weights)) {
    const raw = scores[cat];
    if (raw === undefined || raw === null) continue;
    const s = Math.max(0, Math.min(100, Number(raw)));
    sum += s * w;
    covered += w;
  }
  if (covered === 0 || covered / totalWeight < MIN_EVIDENCE_COVERAGE) return null;

  return Math.round((sum / covered) * 10) / 10;
}

export type Grade = "Excellent" | "Good" | "Moderate" | "Below Expectations" | "Poor" | typeof NOT_YET_RATED;

export function grade(score: number | null): Grade {
  if (score === null) return NOT_YET_RATED;
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Moderate";
  if (score >= 40) return "Below Expectations";
  return "Poor";
}

export const GRADE_BANDS: { grade: Exclude<Grade, typeof NOT_YET_RATED>; range: string }[] = [
  { grade: "Excellent", range: "90 – 100" },
  { grade: "Good", range: "75 – 89.9" },
  { grade: "Moderate", range: "60 – 74.9" },
  { grade: "Below Expectations", range: "40 – 59.9" },
  { grade: "Poor", range: "0 – 39.9" },
];

export type Trend = "up" | "down" | "steady" | "n/a";

export function trend(current: number | null, previous: number | null): Trend {
  if (current === null || previous === null) return "n/a";
  const d = current - previous;
  if (Math.abs(d) < 0.5) return "steady";
  return d > 0 ? "up" : "down";
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface Funding {
  total_project_cost: number;
  available_development_resources: number;
  funding_gap: number;
}

/**
 * Funding feasibility for a jurisdiction.
 * Only verified revenue counts as available; allocations are never treated as expenditure.
 */
export function funding(
  projectCosts: number[],
  verifiedRevenue: number,
  obligations: number,
  committed: number,
): Funding {
  const total = projectCosts.reduce((a, c) => a + Number(c), 0);
  const available = Number(verifiedRevenue) - Number(obligations) - Number(committed);
  return {
    total_project_cost: round2(total),
    available_development_resources: round2(available),
    funding_gap: round2(Math.max(0, total - Math.max(0, available))),
  };
}

const QUARTER_MONTHS: Record<number, string> = {
  1: "January–March",
  2: "April–June",
  3: "July–September",
  4: "October–December",
};

export function quarterLabel(year: number, quarter: number): string {
  return `Q${quarter} ${year} (${QUARTER_MONTHS[quarter] ?? ""})`;
}
