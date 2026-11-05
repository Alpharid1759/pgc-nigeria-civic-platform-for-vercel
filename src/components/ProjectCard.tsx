import Link from "next/link";
import { areaLabel } from "@/lib/directory";
import { naira } from "@/lib/format";
import type { ProjectSummary } from "@/lib/projects";
import { PROJECT_STATUSES, SECTORS } from "@/lib/site";

export default function ProjectCard({ project }: { project: ProjectSummary }) {
  const statusLabel = PROJECT_STATUSES[project.status] ?? project.status;
  return (
    <Link className="card project-card reveal" href={`/projects/${encodeURIComponent(project.projectNo)}`}>
      <p className="project-card__no">{project.projectNo}</p>
      <h3>{project.title}</h3>
      <p className="project-card__meta">
        {[project.sector ? (SECTORS[project.sector] ?? project.sector) : "", areaLabel(project.stateSlug, project.lgaSlug)]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <span className={`badge status-${project.status}`}>{statusLabel}</span>
      <p className="project-card__cost">{naira(project.estimatedCost)}</p>
    </Link>
  );
}
