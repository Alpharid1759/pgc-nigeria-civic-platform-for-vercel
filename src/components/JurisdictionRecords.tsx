import Link from "next/link";
import ProjectCard from "@/components/ProjectCard";
import ScorecardCard from "@/components/ScorecardCard";
import { safely, showDemo } from "@/lib/db";
import { listProjects } from "@/lib/projects";
import { listScorecards } from "@/lib/scorecards";

/** DB-backed project and scorecard sections for a state or LGA page. Falls back to empty states without a DB. */
export default async function JurisdictionRecords({ stateSlug, lgaSlug }: { stateSlug: string; lgaSlug?: string }) {
  const demo = showDemo();
  const projects = await safely((db) => listProjects(db, { state: stateSlug, lga: lgaSlug, perPage: 6 }, demo), null);
  const cards = lgaSlug
    ? []
    : (await safely((db) => listScorecards(db, { state: stateSlug, limit: 50 }, demo), [])).filter((c) => c.overall !== null).slice(0, 6);

  return (
    <>
      <section className="section" style={{ paddingBottom: 0 }}>
        <h2>Development project register</h2>
        {projects && projects.items.length > 0 ? (
          <>
            <div className="grid">
              {projects.items.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
            <p>
              <Link href={`/projects?state=${encodeURIComponent(stateSlug)}`}>See all {projects.total} projects</Link>
            </p>
          </>
        ) : (
          <div className="empty-state">No projects recorded for this jurisdiction yet.</div>
        )}
      </section>

      {lgaSlug ? null : (
        <section className="section">
          <h2>Governance scorecards</h2>
          {cards.length > 0 ? (
            <div className="grid">
              {cards.map((c) => (
                <ScorecardCard key={c.id} card={c} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Not yet rated.</strong> Scorecards are published only when sufficient verified evidence exists.
            </div>
          )}
        </section>
      )}
    </>
  );
}
