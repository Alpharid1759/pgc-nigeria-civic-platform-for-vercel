import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import PrintButton from "@/components/PrintButton";
import Stat from "@/components/Stat";
import { CANDIDATE_STATUSES, DELIVERY_STATES } from "@/lib/constants";
import { getDb, showDemo } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { getCandidate, type CandidateDetail } from "@/lib/mandates";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

async function load(id: string): Promise<CandidateDetail | null> {
  if (!/^\d{1,9}$/.test(id)) return null;
  const db = getDb();
  if (!db) return null;
  try {
    return await getCandidate(db, Number(id), showDemo());
  } catch (err) {
    console.error("PGC candidate error:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const c = await load(id);
  return c ? { title: `${c.name} — ${c.office}`, description: `Governance Mandate for ${c.jurisdiction}` } : {};
}

export default async function CandidatePage({ params }: { params: Params }) {
  const { id } = await params;
  const c = await load(id);
  if (!c) notFound();
  const s = c.summary;

  return (
    <div className="wrap">
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Candidates", href: "/candidates" }, { label: c.name }]} />
      <p className="project-card__no">{c.membershipNo}</p>
      <h1>{c.name}</h1>
      <p>
        <span className="badge">{CANDIDATE_STATUSES[c.status] ?? c.status}</span> {c.office} · {c.jurisdiction}
        {c.constituency ? ` · ${c.constituency}` : ""} · {c.electionYear}
      </p>

      <div className="stats" style={{ marginTop: 16 }}>
        <Stat value={s.total} label="Mandate projects" />
        <Stat value={s.delivered} label="Delivered (verified)" />
        <Stat value={s.awaiting} label="Awaiting verification" />
        <Stat value={s.overdue} label="Past target date" />
      </div>

      <section className="section" style={{ paddingBottom: 0 }}>
        <h2>Governance Mandate</h2>
        <p className="muted">Signed {formatDate(c.signedAt)}. Locked on signature; changed only by the Mandate Committee, with published reasons.</p>
        <div className="table-scroll">
          <table className="pgc-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Target date</th>
                <th>Delivery</th>
              </tr>
            </thead>
            <tbody>
              {c.items.map((i) => (
                <tr key={i.id}>
                  <td>
                    {i.state === "removed" ? (
                      i.title
                    ) : (
                      <Link href={`/projects/${encodeURIComponent(i.projectNo)}`}>{i.title}</Link>
                    )}
                    <br />
                    <small className="muted">{i.projectNo}</small>
                  </td>
                  <td>{formatDate(i.target)}</td>
                  <td>
                    {i.state === "removed" ? (
                      <>Removed by the Mandate Committee: {i.removedReason}</>
                    ) : (
                      <>
                        {DELIVERY_STATES[i.state] ?? i.state}
                        {i.overdue ? " · past target date" : ""}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="data-note">
          A project counts as delivered only after independent verification. An allocation or release of funds is never
          treated as proof of delivery. Where non-delivery is caused by matters beyond the office holder&apos;s control and
          is documented, the Mandate Committee publishes its reasons. See the <Link href="/party/rules">Party Rules</Link>.
        </p>
      </section>
      <PrintButton />
    </div>
  );
}
