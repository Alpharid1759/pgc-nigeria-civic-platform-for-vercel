import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import DbNotice from "@/components/DbNotice";
import ProjectCard from "@/components/ProjectCard";
import { getDb, showDemo } from "@/lib/db";
import { topLevel } from "@/lib/directory";
import { one, parsePositiveInt } from "@/lib/format";
import { listProjects } from "@/lib/projects";
import { PROJECT_STATUSES, SECTORS } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Development Register",
  description: "Public register of proposed and monitored development projects across Nigeria.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function ProjectsPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const filters = {
    state: one(sp.state),
    sector: one(sp.sector),
    status: one(sp.status),
    page: parsePositiveInt(sp.page) ?? 1,
  };

  const db = getDb();
  let result: Awaited<ReturnType<typeof listProjects>> | null = null;
  let failed = false;
  if (db) {
    try {
      result = await listProjects(db, filters, showDemo());
    } catch (err) {
      console.error("PGC projects error:", err instanceof Error ? err.message : err);
      failed = true;
    }
  }

  const query = (page: number) => {
    const p = new URLSearchParams();
    if (filters.state) p.set("state", filters.state);
    if (filters.sector) p.set("sector", filters.sector);
    if (filters.status) p.set("status", filters.status);
    if (page > 1) p.set("page", String(page));
    const s = p.toString();
    return s ? `/projects?${s}` : "/projects";
  };

  const pages = result ? Math.max(1, Math.ceil(result.total / result.perPage)) : 1;

  return (
    <div className="wrap">
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Development Register" }]} />
      <h1>Development register</h1>
      <p className="section__lead">
        Projects are recorded with their status, funding source and verification. A project shown as funded or ongoing is
        not proof of completion; only independently verified records are marked as such.
      </p>

      <form className="filters" method="get" action="/projects">
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
          Sector
          <select name="sector" defaultValue={filters.sector ?? ""}>
            <option value="">All sectors</option>
            {Object.entries(SECTORS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select name="status" defaultValue={filters.status ?? ""}>
            <option value="">All statuses</option>
            {Object.entries(PROJECT_STATUSES).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
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
          <DbNotice what="The development register" />
        ) : failed ? (
          <div className="empty-state">The register could not be loaded. Please try again shortly.</div>
        ) : result && result.items.length > 0 ? (
          <>
            <p className="muted">
              {result.total} project{result.total === 1 ? "" : "s"}
              {pages > 1 ? ` · page ${result.page} of ${pages}` : ""}
            </p>
            <div className="grid">
              {result.items.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
            {pages > 1 ? (
              <p>
                {result.page > 1 ? <Link href={query(result.page - 1)}>← Previous</Link> : null}
                {result.page > 1 && result.page < pages ? " · " : null}
                {result.page < pages ? <Link href={query(result.page + 1)}>Next →</Link> : null}
              </p>
            ) : null}
          </>
        ) : (
          <div className="empty-state">No project records match these filters yet.</div>
        )}
        {showDemo() ? <p className="data-note">Demonstration records are being shown on this deployment.</p> : null}
      </section>
    </div>
  );
}
