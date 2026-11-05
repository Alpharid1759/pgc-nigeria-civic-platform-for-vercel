import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import DbNotice from "@/components/DbNotice";
import Stat from "@/components/Stat";
import { topLevel } from "@/lib/directory";
import { one } from "@/lib/format";
import { PROJECT_STATUSES, SECTORS } from "@/lib/site";
import { getDashboard, getStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "National Dashboard",
  description: "Live national figures drawn from PGC records.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

function Rows({ rows }: { rows: { key: string; label: string; total: number }[] }) {
  if (rows.length === 0) return <div className="empty-state">No records yet.</div>;
  return (
    <table className="pgc-table">
      <tbody>
        {rows.map((r) => (
          <tr key={r.key}>
            <td>{r.label}</td>
            <td style={{ textAlign: "right" }}>{r.total}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const filters = { state: one(sp.state), sector: one(sp.sector), status: one(sp.status) };
  const dash = await getDashboard(filters);
  const stats = dash?.stats ?? (await getStats());
  const dir = stats.directory;

  return (
    <div className="wrap">
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Dashboard" }]} />
      <h1>National dashboard</h1>
      <p className="section__lead">{stats.note}</p>

      <form className="filters" method="get" action="/dashboard">
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
            {Object.entries(SECTORS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select name="status" defaultValue={filters.status ?? ""}>
            <option value="">All statuses</option>
            {Object.entries(PROJECT_STATUSES).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="pgc-btn pgc-btn--primary">
          Apply
        </button>
      </form>

      <div className="stats" style={{ marginTop: 24 }}>
        <Stat value={stats.members.total} label="Registered members" />
        <Stat value={dir.states + dir.fct} label="States & FCT" />
        <Stat value={dir.lgas + dir.area_councils} label="LGAs & Area Councils" />
        <Stat value={dir.wards} label="Wards recorded" />
        <Stat value={stats.projects.total} label="Projects on register" />
        <Stat value={stats.projects.verified} label="Verified projects" />
        <Stat value={stats.scorecards_published} label="Published scorecards" />
      </div>

      {!dash ? (
        <DbNotice what="Detailed breakdowns" />
      ) : (
        <>
          <div className="grid" style={{ marginTop: 32 }}>
            <section>
              <h2>Projects by sector</h2>
              <Rows rows={dash.projectsBySector} />
            </section>
            <section>
              <h2>Projects by status</h2>
              <Rows rows={dash.projectsByStatus} />
            </section>
            <section>
              <h2>Members by state</h2>
              <Rows rows={dash.membersByState.map((m) => ({ key: m.slug, label: m.state, total: m.total }))} />
            </section>
          </div>
          <section>
            <h2>Scorecards</h2>
            <p>
              {dash.scorecards.published} published
              {dash.scorecards.latestPeriod
                ? `; latest period ${dash.scorecards.latestPeriod} has ${dash.scorecards.ratedLatestQuarter} rated`
                : ""}
              {dash.scorecards.averageLatestQuarter !== null ? ` (average ${dash.scorecards.averageLatestQuarter})` : ""}.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
