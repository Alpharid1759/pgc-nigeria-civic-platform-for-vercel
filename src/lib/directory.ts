import raw from "@/data/nigeria-directory.json";

export type Level = "state" | "fct" | "lga" | "area_council";

export interface Jurisdiction {
  name: string;
  slug: string;
  code: string;
  level: Level;
  capital?: string;
  zone?: string;
  parent?: { name: string; slug: string };
  path: string;
}

interface RawState {
  name: string;
  slug: string;
  code: string;
  capital: string;
  zone: string;
  lgas: string[];
}

interface RawCouncil {
  name: string;
  slug: string;
  code: string;
}

interface RawFct {
  name: string;
  slug: string;
  code: string;
  capital: string;
  zone: string;
  area_councils: RawCouncil[];
}

const data = raw as unknown as { states: RawState[]; fct: RawFct };

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function lgaCode(stateCode: string, index: number): string {
  return `${stateCode}-${String(index + 1).padStart(3, "0")}`;
}

const states: Jurisdiction[] = data.states.map((s) => ({
  name: s.name,
  slug: s.slug,
  code: s.code,
  level: "state",
  capital: s.capital,
  zone: s.zone,
  path: `/states/${s.slug}`,
}));

const fct: Jurisdiction = {
  name: data.fct.name,
  slug: data.fct.slug,
  code: data.fct.code,
  level: "fct",
  capital: data.fct.capital,
  zone: data.fct.zone,
  path: `/states/${data.fct.slug}`,
};

const childrenByParent = new Map<string, Jurisdiction[]>();

for (const s of data.states) {
  childrenByParent.set(
    s.slug,
    s.lgas.map((name, i) => ({
      name,
      slug: slugify(name),
      code: lgaCode(s.code, i),
      level: "lga" as const,
      zone: s.zone,
      parent: { name: s.name, slug: s.slug },
      path: `/states/${s.slug}/${slugify(name)}`,
    })),
  );
}

childrenByParent.set(
  data.fct.slug,
  data.fct.area_councils.map((c) => ({
    name: c.name,
    slug: c.slug,
    code: c.code,
    level: "area_council" as const,
    zone: data.fct.zone,
    parent: { name: data.fct.name, slug: data.fct.slug },
    path: `/states/${data.fct.slug}/${c.slug}`,
  })),
);

export function topLevel(): Jurisdiction[] {
  return [...states, fct];
}

export function findTop(slug: string): Jurisdiction | undefined {
  return topLevel().find((j) => j.slug === slug);
}

export function children(parentSlug: string): Jurisdiction[] {
  return childrenByParent.get(parentSlug) ?? [];
}

export function findChild(parentSlug: string, slug: string): Jurisdiction | undefined {
  return children(parentSlug).find((j) => j.slug === slug);
}

export interface DirectoryCounts {
  states: number;
  fct: number;
  lgas: number;
  area_councils: number;
  wards: number;
}

export function counts(): DirectoryCounts {
  return {
    states: states.length,
    fct: 1,
    lgas: states.reduce((n, s) => n + (childrenByParent.get(s.slug)?.length ?? 0), 0),
    area_councils: childrenByParent.get(fct.slug)?.length ?? 0,
    wards: 0,
  };
}

export const LEVEL_LABEL: Record<Level, string> = {
  state: "State",
  fct: "Federal Capital Territory",
  lga: "Local Government Area",
  area_council: "FCT Area Council",
};

export const CHILD_LABEL: Record<"state" | "fct", string> = {
  state: "Local Government Areas",
  fct: "Area Councils",
};
