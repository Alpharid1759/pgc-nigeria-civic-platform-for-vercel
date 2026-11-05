import Link from "next/link";
import { gradeClass } from "@/lib/format";
import type { ScorecardSummary } from "@/lib/scorecards";
import { quarterLabel } from "@/lib/scoring";

const TREND: Record<string, string> = { up: "▲ Improving", down: "▼ Declining", steady: "● Steady", "n/a": "No prior quarter" };

export default function ScorecardCard({ card }: { card: ScorecardSummary }) {
  return (
    <Link className="card reveal" href={`/scorecards/${card.id}`}>
      <p className="project-card__no">{quarterLabel(card.year, card.quarter)}</p>
      <h3>{card.official}</h3>
      <p className="project-card__meta">
        {card.office} · {card.jurisdiction}
      </p>
      <p>
        <span className={`badge ${gradeClass(card.grade)}`}>{card.grade}</span>{" "}
        <strong>{card.overall === null ? "—" : card.overall.toFixed(1)}</strong>
      </p>
      <p className="muted">{TREND[card.trend]}</p>
    </Link>
  );
}
