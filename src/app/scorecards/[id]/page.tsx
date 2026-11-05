import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import PrintButton from "@/components/PrintButton";
import { getDb, showDemo } from "@/lib/db";
import { formatDate, gradeClass } from "@/lib/format";
import { getScorecard, type ScorecardDetail } from "@/lib/scorecards";
import { NOT_YET_RATED, quarterLabel } from "@/lib/scoring";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

async function load(id: string): Promise<ScorecardDetail | null> {
  if (!/^\d{1,9}$/.test(id)) return null;
  const db = getDb();
  if (!db) return null;
  try {
    return await getScorecard(db, Number(id), showDemo());
  } catch (err) {
    console.error("PGC scorecard error:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const c = await load(id);
  return c ? { title: `${c.official} — ${quarterLabel(c.year, c.quarter)}`, description: `${c.office}, ${c.jurisdiction}` } : {};
}

const TREND: Record<string, string> = { up: "▲ Improving", down: "▼ Declining", steady: "● Steady", "n/a": "No prior quarter" };

function Text({ title, text }: { title: string; text: string | null }) {
  if (!text) return null;
  return (
    <section>
      <h2>{title}</h2>
      <p style={{ whiteSpace: "pre-line" }}>{text}</p>
    </section>
  );
}

export default async function ScorecardPage({ params }: { params: Params }) {
  const { id } = await params;
  const c = await load(id);
  if (!c) notFound();

  return (
    <div className="wrap">
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Scorecards", href: "/scorecards" }, { label: c.official }]} />
      <div className="score-head" style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
        <div className={`score-dial ${gradeClass(c.grade)}`}>
          <div className="score-dial__value">{c.overall === null ? "—" : c.overall.toFixed(1)}</div>
          <div className="score-dial__grade">{c.grade}</div>
          <div className="score-dial__trend">{TREND[c.trend]}</div>
        </div>
        <div>
          <p className="project-card__no">{quarterLabel(c.year, c.quarter)}</p>
          <h1 style={{ margin: 0 }}>{c.official}</h1>
          <p>
            {c.office} · {c.jurisdiction}
          </p>
          <p className="muted">Published {formatDate(c.publishedOn)}</p>
        </div>
      </div>

      {c.grade === NOT_YET_RATED ? (
        <div className="empty-state">
          <strong>Not Yet Rated.</strong> Verified evidence covers too little of the scorecard to produce a fair overall
          score.
        </div>
      ) : null}

      <section className="section" style={{ paddingBottom: 0 }}>
        <h2>Category scores</h2>
        <div className="table-scroll">
          <table className="pgc-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Weight</th>
                <th>Score</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {c.categoryDetails.map((d) => (
                <tr key={d.category}>
                  <td>
                    {d.category}. {d.label}
                  </td>
                  <td>{d.weight}%</td>
                  <td>
                    {d.score === null ? (
                      "Not assessed"
                    ) : (
                      <span className="bar" style={{ ["--v" as string]: `${d.score}%` }}>
                        <span>{d.score}</span>
                      </span>
                    )}
                  </td>
                  <td>{d.evidence || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Text title="Evaluator comments" text={c.evaluatorComments} />
      <Text title="Citizen feedback" text={c.citizenFeedback} />
      <Text title="Official's response" text={c.officialResponse} />

      {c.history.length > 1 ? (
        <section>
          <h2>History</h2>
          <ul>
            {c.history.map((h) => (
              <li key={h.id}>
                <Link href={`/scorecards/${h.id}`}>{quarterLabel(h.year, h.quarter)}</Link>:{" "}
                {h.overall === null ? "—" : h.overall.toFixed(1)} ({h.grade})
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="data-note">
        This scorecard assesses performance against lawful responsibilities using documented evidence. It is not an
        endorsement of, or opposition to, any person or party. See the <Link href="/methodology">methodology</Link>.
      </p>
      <PrintButton />
    </div>
  );
}
