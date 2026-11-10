import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import CandidateCard from "@/components/CandidateCard";
import DbNotice from "@/components/DbNotice";
import { OFFICES } from "@/lib/constants";
import { getDb, showDemo } from "@/lib/db";
import { topLevel } from "@/lib/directory";
import { one } from "@/lib/format";
import { listCandidates, type CandidateSummary } from "@/lib/mandates";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Candidates and Mandates",
  description: "Every PGC Nigeria candidate and the predetermined development projects they are bound to deliver.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function CandidatesPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const filters = { state: one(sp.state), office: one(sp.office), status: one(sp.status) };
  const db = getDb();
  let items: CandidateSummary[] | null = null;
  let failed = false;
  if (db) {
    try {
      items = await listCandidates(db, filters, showDemo());
    } catch (err) {
      console.error("PGC candidates error:", err instanceof Error ? err.message : err);
      failed = true;
    }
  }
  const elected = Object.entries(OFFICES).filter(([, o]) => o.elected);

  return (
    <div className="wrap">
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Candidates" }]} />
      <h1>Candidates and Mandates</h1>
      <p className="section__lead">
        Every candidate of the Party is cleared only after signing a public Governance Mandate: predetermined development
        projects for the jurisdiction they would represent. Progress is read from the Development Register, and a project counts
        as delivered only when independently verified.
      </p>
      <p>
        <Link className="pgc-btn pgc-btn--primary" href="/candidates/apply">
          Seek the Party&apos;s ticket
        </Link>{" "}
        <Link className="pgc-btn" href="/party">
          How Governance by Objective works
        </Link>
      </p>

      <form className="filters" method="get" action="/candidates">
        <label>
          State
          <select name="state" defaultValue={filters.state ?? ""}>
            <option value="">All states</option>
            {topLevel().map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Office
          <select name="office" defaultValue={filters.office ?? ""}>
            <option value="">All offices</option>
            {elected.map(([k, o]) => (
              <option key={k} value={k}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="pgc-btn pgc-btn--primary">
          Filter
        </button>
      </form>

      <section className="section" style={{ paddingTop: 24 }}>
        {!db ? (
          <DbNotice what="The candidate register" />
        ) : failed ? (
          <div className="empty-state">The candidate register could not be loaded. Please try again shortly.</div>
        ) : items && items.length > 0 ? (
          <div className="grid">
            {items.map((c) => (
              <CandidateCard key={c.id} candidate={c} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>No candidates cleared yet.</strong> The Party has not yet been registered with INEC and has not held
            primaries. Candidates appear here only after screening.
          </div>
        )}
      </section>
    </div>
  );
}
