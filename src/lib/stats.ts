import { counts, type DirectoryCounts } from "@/lib/directory";

export interface PublicStats {
  generated_at: string;
  directory: DirectoryCounts;
  members: { total: number | null };
  projects: { total: number | null; verified: number | null };
  scorecards_published: number | null;
  note: string;
}

/**
 * Directory figures come from the bundled directory data. Member, project and scorecard
 * figures need the database and are reported as null (shown as "Unavailable") until it is connected.
 */
export function getStats(): PublicStats {
  return {
    generated_at: new Date().toISOString(),
    directory: counts(),
    members: { total: null },
    projects: { total: null, verified: null },
    scorecards_published: null,
    note: "Directory counts are computed from bundled directory data. Member, project and scorecard counts are unavailable until a database is connected.",
  };
}
