import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import DbNotice from "@/components/DbNotice";
import ScorecardCard from "@/components/ScorecardCard";
import { OFFICES } from "@/lib/constants";
import { getDb, showDemo } from "@/lib/db";
import { topLevel } from "@/lib/directory";
import { one, parsePositiveInt } from "@/lib/format";
import { listScorecards, type ScorecardSummary } from "@/lib/scorecards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Governance Scorecards",
  description: "Quarterly, evidence-based scorecards for elected offices.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function ScorecardsPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const year = parsePositiveInt(sp.year);
  const quarter = parsePositiveInt(sp.quarter);
  const state = one(sp.state);
  const office = one(sp.office);

  const db = getDb();
  let items: ScorecardSummary[] | null = null;
  let failed = false;
  if (db) {
    try {
      items = await listScorecards(db, { year, quarter, state, office }, showDemo());
    } catch (err) {
      console.error("PGC scorecards error:", err instanceof Error ? err.message : err);
      failed = true;
    }
  }
  const thisYear = new Date().getFullYear();

  return (
    <div className="wrap">
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Scorecards" }]} />
      <h1>Governance scorecards</h1>
      <p className="section__lead">
        Scorecards assess how elected officials perform against their lawful responsibilities. An office is shown as{" "}
        <strong>Not Yet Rated</strong> until enough verified evidence exists. Scorecards are not political endorsements.
      </p>

      <form className="filters" method="get" action="/scorecards">
        <label>
          Year
          <select name="year" defaultValue={year ? String(year) : ""}>
            <option value="">All years</option>
            {[thisYear, thisYear - 1, thisYear - 2].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label>
          Quarter
          <select name="quarter" defaultValue={quarter ? String(quarter) : ""}>
            <option value="">All quarters</option>
            {[1, 2, 3, 4].map((q) => (
              <option key={q} value={q}>
                Q{q}
              </option>
            ))}
          </select>
        </label>
        <label>
          State
          <select name="state" defaultValue={state ?? ""}>
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
          <select name="office" defaultValue={office ?? ""}>
            <option value="">All offices</option>
            {Object.entries(OFFICES).map(([k, info]) => (
              <option key={k} value={k}>
                {info.label}
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
          <DbNotice what="Scorecards" />
        ) : failed ? (
          <div className="empty-state">Scorecards could not be loaded. Please try again shortly.</div>
        ) : items && items.length > 0 ? (
          <div className="grid">
            {items.map((c) => (
              <ScorecardCard key={c.id} card={c} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>No scorecards published yet.</strong> Scorecards appear only after evidence review.
          </div>
        )}
      </section>
    </div>
  );
}
