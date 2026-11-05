import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import { GRADE_BANDS, MIN_EVIDENCE_COVERAGE, NOT_YET_RATED, defaultWeights } from "@/lib/scoring";

export const metadata: Metadata = {
  title: "Scorecard Methodology",
  description: "How PGC Nigeria weights, scores and grades elected offices, and when an office is Not Yet Rated.",
};

export default function MethodologyPage() {
  const weights = Object.entries(defaultWeights());
  const total = weights.reduce((n, [, w]) => n + w.weight, 0);
  const coverage = Math.round(MIN_EVIDENCE_COVERAGE * 100);

  return (
    <div className="wrap">
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Scorecard Methodology" }]} />
      <h1>Scorecard methodology</h1>
      <p className="section__lead">
        Scorecards are evidence-based and published quarterly, one per elected official per quarter. Where evidence is
        insufficient the result is <strong>{NOT_YET_RATED}</strong>, never zero.
      </p>

      <section className="section" style={{ paddingBottom: 0 }}>
        <h2>Default category weights</h2>
        <div className="table-scroll">
          <table className="pgc-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Weight</th>
              </tr>
            </thead>
            <tbody>
              {weights.map(([key, w]) => (
                <tr key={key}>
                  <td>
                    {key}. {w.label}
                  </td>
                  <td>{w.weight}%</td>
                </tr>
              ))}
              <tr>
                <th>Total</th>
                <th>{total}%</th>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="data-note">Office weights are editable by PGC administrators and must total 100.</p>
      </section>

      <section className="section" style={{ paddingBottom: 0 }}>
        <h2>Evidence rule</h2>
        <p>
          A category with no sufficient evidence is left blank. If the categories that do have evidence cover less than{" "}
          {coverage}% of the total weight, the office is shown as {NOT_YET_RATED}. Otherwise the overall score is
          re-normalised over the categories that have evidence.
        </p>
      </section>

      <section className="section">
        <h2>Grade bands</h2>
        <div className="table-scroll">
          <table className="pgc-table">
            <thead>
              <tr>
                <th>Grade</th>
                <th>Overall score</th>
              </tr>
            </thead>
            <tbody>
              {GRADE_BANDS.map((b) => (
                <tr key={b.grade}>
                  <td>{b.grade}</td>
                  <td>{b.range}</td>
                </tr>
              ))}
              <tr>
                <td>{NOT_YET_RATED}</td>
                <td>Insufficient verified evidence</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="disclaimer">
          Scorecards assess elected offices against their lawful responsibilities. Every assessed office has a right of
          reply, and corrections are published with a public note.
        </p>
      </section>
    </div>
  );
}
