import Link from "next/link";
import { CANDIDATE_STATUSES } from "@/lib/constants";
import type { CandidateSummary } from "@/lib/mandates";

export default function CandidateCard({ candidate: c }: { candidate: CandidateSummary }) {
  return (
    <Link className="card reveal" href={`/candidates/${c.id}`}>
      <p className="project-card__no">{c.electionYear}</p>
      <h3>{c.name}</h3>
      <p className="project-card__meta">
        {c.office} · {c.jurisdiction}
      </p>
      <p>
        <span className="badge">{CANDIDATE_STATUSES[c.status] ?? c.status}</span>
      </p>
      <p className="muted">
        Mandate: {c.summary.total} project{c.summary.total === 1 ? "" : "s"}
        {c.summary.deliveryRate === null ? "" : ` · ${c.summary.delivered} delivered (${c.summary.deliveryRate}%)`}
      </p>
    </Link>
  );
}
