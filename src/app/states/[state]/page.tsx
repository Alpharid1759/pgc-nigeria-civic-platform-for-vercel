import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import JurisdictionRecords from "@/components/JurisdictionRecords";
import FilterList from "@/components/FilterList";
import { CHILD_LABEL, LEVEL_LABEL, children, findTop, topLevel } from "@/lib/directory";

export const revalidate = 300;

type Params = { state: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return topLevel().map((j) => ({ state: j.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { state } = await params;
  const j = findTop(state);
  if (!j) return {};
  return {
    title: j.name,
    description: `${j.name} — ${LEVEL_LABEL[j.level]} in Nigeria's PGC directory.`,
    robots: { index: false, follow: true },
  };
}

export default async function StatePage({ params }: { params: Promise<Params> }) {
  const { state } = await params;
  const j = findTop(state);
  if (!j || (j.level !== "state" && j.level !== "fct")) notFound();

  const kids = children(j.slug);
  const childLabel = CHILD_LABEL[j.level];

  return (
    <div className="wrap">
      <Breadcrumbs
        crumbs={[{ label: "Home", href: "/" }, { label: "States & FCT", href: "/states" }, { label: j.name }]}
      />
      <p className="badge">{LEVEL_LABEL[j.level]}</p>
      <h1>{j.name}</h1>

      <dl className="pgc-dl">
        {j.capital ? (
          <>
            <dt>Capital</dt>
            <dd>{j.capital}</dd>
          </>
        ) : null}
        {j.zone ? (
          <>
            <dt>Geopolitical zone</dt>
            <dd>{j.zone}</dd>
          </>
        ) : null}
        <dt>PGC code</dt>
        <dd>
          <code>{j.code}</code>
        </dd>
      </dl>

      <section className="section" style={{ paddingBottom: 0 }}>
        <h2>
          {childLabel} <small>({kids.length})</small>
        </h2>
        <FilterList items={kids.map((k) => ({ name: k.name, href: k.path }))} />
      </section>

      <JurisdictionRecords stateSlug={j.slug} />
    </div>
  );
}
