const NAIRA = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 2 });

export function naira(value: number | null | undefined): string {
  return value === null || value === undefined ? "Not recorded" : `₦${NAIRA.format(value)}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "Not recorded";
  const d = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(d.getTime())) return "Not recorded";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function gradeClass(grade: string): string {
  return `grade-${grade.toLowerCase().replace(/\s+/g, "-")}`;
}

export function parsePositiveInt(value: string | string[] | undefined): number | undefined {
  const s = Array.isArray(value) ? value[0] : value;
  if (!s || !/^\d{1,6}$/.test(s)) return undefined;
  const n = Number(s);
  return n > 0 ? n : undefined;
}

export function one(value: string | string[] | undefined): string | undefined {
  const s = Array.isArray(value) ? value[0] : value;
  return s && s.length <= 120 ? s : undefined;
}
