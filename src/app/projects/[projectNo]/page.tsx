import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import { MILESTONE_STATUSES, PRIORITIES, VERIFICATION } from "@/lib/constants";
import { getDb, showDemo } from "@/lib/db";
import { areaLabel, findTop } from "@/lib/directory";
import { formatDate, naira } from "@/lib/format";
import { getProject, type ProjectDetail } from "@/lib/projects";
import { PROJECT_STATUSES, SECTORS } from "@/lib/site";

export const dynamic = "force-dynamic";

type Params = Promise<{ projectNo: string }>;

async function load(projectNo: string): Promise<ProjectDetail | null> {
  const db = getDb();
  if (!db) return null;
  try {
    return await getProject(db, decodeURIComponent(projectNo), showDemo());
  } catch (err) {
    console.error("PGC project error:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { projectNo } = await params;
  const p = await load(projectNo);
  return p ? { title: p.title, description: `${p.projectNo} — ${PROJECT_STATUSES[p.status] ?? p.status}` } : {};
}

function Block({ title, text }: { title: string; text: string | null }) {
  if (!text) return null;
  return (
    <section>
      <h2>{title}</h2>
      <p style={{ whiteSpace: "pre-line" }}>{text}</p>
    </section>
  );
}

export default async function ProjectPage({ params }: { params: Params }) {
  const { projectNo } = await params;
  const p = await load(projectNo);
  if (!p) notFound();

  const state = findTop(p.stateSlug);

  return (
    <div className="wrap">
      <Breadcrumbs
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Development Register", href: "/projects" },
          { label: p.projectNo },
        ]}
      />
      <p className="project-card__no">{p.projectNo}</p>
      <h1>{p.title}</h1>
      <p>
        <span className={`badge status-${p.status}`}>{PROJECT_STATUSES[p.status] ?? p.status}</span>{" "}
        <span className={`badge ${p.verificationStatus === "verified" ? "badge--verified" : ""}`}>
          {VERIFICATION[p.verificationStatus] ?? p.verificationStatus}
        </span>
      </p>

      <div className="project-layout">
        <div>
          <Block title="Problem being addressed" text={p.problem} />
          <Block title="Proposed solution" text={p.solution} />
          <Block title="Expected outcomes" text={p.outcomes} />
          <Block title="Procurement information" text={p.procurement} />

          <section>
            <h2>Milestones</h2>
            {p.milestones.length > 0 ? (
              <div className="table-scroll">
                <table className="pgc-table">
                  <thead>
                    <tr>
                      <th>Milestone</th>
                      <th>Due</th>
                      <th>Completed</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.milestones.map((m, i) => (
                      <tr key={`${m.title}-${i}`}>
                        <td>{m.title}</td>
                        <td>{formatDate(m.dueDate)}</td>
                        <td>{m.completedDate ? formatDate(m.completedDate) : "—"}</td>
                        <td>{MILESTONE_STATUSES[m.status] ?? m.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">No milestones recorded yet.</div>
            )}
          </section>

          <Block title="Source references" text={p.sourceReferences} />
        </div>

        <aside className="card project-facts">
          <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Project facts</h2>
          <dl className="pgc-dl">
            <dt>Location</dt>
            <dd>
              {state ? <Link href={state.path}>{areaLabel(p.stateSlug, p.lgaSlug)}</Link> : areaLabel(p.stateSlug, p.lgaSlug)}
            </dd>
            {p.community ? (
              <>
                <dt>Community</dt>
                <dd>{p.community}</dd>
              </>
            ) : null}
            <dt>Sector</dt>
            <dd>{p.sector ? (SECTORS[p.sector] ?? p.sector) : "Not recorded"}</dd>
            {p.priority ? (
              <>
                <dt>Priority</dt>
                <dd>{PRIORITIES[p.priority] ?? p.priority}</dd>
              </>
            ) : null}
            <dt>Estimated cost</dt>
            <dd>{naira(p.estimatedCost)}</dd>
            {p.beneficiaries ? (
              <>
                <dt>Expected beneficiaries</dt>
                <dd>{p.beneficiaries}</dd>
              </>
            ) : null}
            {p.fundingSource ? (
              <>
                <dt>Funding source</dt>
                <dd>{p.fundingSource}</dd>
              </>
            ) : null}
            {p.responsibleInstitution ? (
              <>
                <dt>Responsible institution</dt>
                <dd>{p.responsibleInstitution}</dd>
              </>
            ) : null}
            {p.responsibleOffice ? (
              <>
                <dt>Responsible public office</dt>
                <dd>{p.responsibleOffice}</dd>
              </>
            ) : null}
            {p.contractor ? (
              <>
                <dt>Contractor</dt>
                <dd>{p.contractor}</dd>
              </>
            ) : null}
            <dt>Commencement</dt>
            <dd>{formatDate(p.startDate)}</dd>
            <dt>Completion</dt>
            <dd>{formatDate(p.endDate)}</dd>
            <dt>Last updated</dt>
            <dd>{formatDate(p.updatedAt)}</dd>
          </dl>
          <p className="data-note">
            An allocation or release of funds is never treated as proof of expenditure or completion.
          </p>
        </aside>
      </div>
    </div>
  );
}
