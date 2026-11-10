import Link from "next/link";
import ProjectCard from "@/components/ProjectCard";
import ScorecardCard from "@/components/ScorecardCard";
import Stat from "@/components/Stat";
import { safely, showDemo } from "@/lib/db";
import { recentProjects } from "@/lib/projects";
import { listScorecards } from "@/lib/scorecards";
import { STAGES } from "@/lib/site";
import { getStats } from "@/lib/stats";

export const revalidate = 300;

export default async function HomePage() {
  const stats = await getStats();
  const cards = (await safely((db) => listScorecards(db, { limit: 50 }, showDemo()), [])).filter((c) => c.overall !== null).slice(0, 3);
  const recent = await safely((db) => recentProjects(db, 3, showDemo()), []);
  const dir = stats.directory;

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">Democracy Beyond the Ballot</p>
          <h1>
            Your vote elects them. <span>Your voice holds them accountable.</span>
          </h1>
          <p>
            PGC Nigeria is a proposed political party built on Governance by Objective: every candidate commits, in public,
            to deliver predetermined development projects for the people they would represent, and every project is
            tracked until it is independently verified.
          </p>
          <div className="actions">
            <Link className="pgc-btn pgc-btn--gold" href="/membership">
              Join the Party
            </Link>
            <Link className="pgc-btn pgc-btn--light" href="/candidates">
              See Candidates and Mandates
            </Link>
            <Link className="pgc-btn pgc-btn--light" href="/states">
              Explore Your Local Government
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2>Why democracy must go beyond elections</h2>
          <p className="section__lead">
            PGC Nigeria is a proposed political party built on <strong>Governance by Objective</strong>: citizens identify
            community needs and agree realistic priorities, candidates adopt those priorities as a signed Governance
            Mandate, and elected representatives are measured against it, and sanctioned by the Party if they fail to
            deliver without good cause, every quarter of every tenure.
          </p>
          <div className="grid">
            <div className="card reveal">
              <h3>Citizen participation</h3>
              <p>Communities define development priorities through ward and LGA consultations.</p>
            </div>
            <div className="card reveal">
              <h3>Measurable development</h3>
              <p>Priorities become costed commitments with timelines and performance indicators.</p>
            </div>
            <div className="card reveal">
              <h3>Continuous accountability</h3>
              <p>Evidence-based quarterly scorecards with right of reply for every assessed office.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--grey" id="how-it-works">
        <div className="wrap">
          <h2>How the People&apos;s Governance Compact works</h2>
          <div className="grid stages">
            {STAGES.map((s) => (
              <div className="card stage reveal" key={s.title}>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
          <p className="data-note">
            Community compacts are citizen-generated priorities. They do not replace constitutional mandates, statutory
            responsibilities or approved government budgets.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2>National dashboard</h2>
          <div className="stats">
            <Stat value={stats.members.total} label="Registered members" />
            <Stat value={dir.states + dir.fct} label="States & FCT in directory" />
            <Stat value={dir.lgas + dir.area_councils} label="LGAs & Area Councils" />
            <Stat value={dir.wards} label="Wards recorded" />
            <Stat value={stats.projects.total} label="Projects on register" />
            <Stat value={stats.projects.verified} label="Independently verified projects" />
            <Stat value={stats.scorecards_published} label="Published scorecards" />
            <Stat value={stats.candidates.total} label="Candidates with signed Mandates" />
            <Stat value={stats.candidates.mandate_projects} label="Mandate projects tracked" />
          </div>
          <p className="data-note">
            Directory figures are counted from the bundled directory data. Figures marked Unavailable need the
            database connection. Demonstration data is never counted.
          </p>
          <p>
            <Link className="pgc-btn pgc-btn--primary" href="/dashboard">
              Open the full national dashboard
            </Link>
          </p>
        </div>
      </section>

      <section className="section section--grey">
        <div className="wrap">
          <h2>Featured governance scorecards</h2>
          {cards.length > 0 ? (
            <div className="grid">
              {cards.map((c) => (
                <ScorecardCard key={c.id} card={c} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>No scorecards published yet.</strong> Scorecards appear only after evidence review.{" "}
              <Link href="/methodology">How we assess</Link>.
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2>Recently updated projects</h2>
          {recent.length > 0 ? (
            <div className="grid">
              {recent.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              No project records have been published yet. <Link href="/projects">Development register</Link>.
            </div>
          )}
        </div>
      </section>

      <section className="section section--grey">
        <div className="wrap">
          <div className="grid">
            <div>
              <h2>Citizen reports</h2>
              <div className="empty-state">No citizen reports have been published yet.</div>
            </div>
            <div>
              <h2>Upcoming community meetings</h2>
              <div className="empty-state">No meetings scheduled yet.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section declaration">
        <div className="wrap">
          <p
            className="eyebrow"
            style={{ color: "var(--gold)", textTransform: "uppercase", letterSpacing: ".18em", fontWeight: 700 }}
          >
            National launch campaign · Democracy Beyond the Ballot
          </p>
          <h2>You voted. They were elected. Now, let&apos;s work together to ensure they deliver.</h2>
          <p>
            The People&apos;s Governance Compact is a proposed political party. It is not yet registered with INEC and it is
            not a government agency. Its single rule is that whoever carries its name into office must deliver the
            projects they promised, and show the evidence.
          </p>
          <p>
            <Link className="pgc-btn pgc-btn--gold" href="/membership">
              Become a Founding Member
            </Link>{" "}
            <Link className="pgc-btn pgc-btn--light" href="/constitution">
              Read the proposed party constitution
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
