import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import JurisdictionRecords from "@/components/JurisdictionRecords";
import { LEVEL_LABEL, children, findChild, findTop, topLevel } from "@/lib/directory";

export const revalidate = 300;

type Params = { state: string; lga: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return topLevel().flatMap((s) => children(s.slug).map((c) => ({ state: s.slug, lga: c.slug })));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { state, lga } = await params;
  const j = findChild(state, lga);
  if (!j || !j.parent) return {};
  return {
    title: `${j.name}, ${j.parent.name}`,
    description: `${j.name} — ${LEVEL_LABEL[j.level]} in ${j.parent.name}.`,
    robots: { index: false, follow: true },
  };
}

export default async function LgaPage({ params }: { params: Promise<Params> }) {
  const { state, lga } = await params;
  const parent = findTop(state);
  const j = findChild(state, lga);
  if (!parent || !j) notFound();

  return (
    <div className="wrap">
      <Breadcrumbs
        crumbs={[
          { label: "Home", href: "/" },
          { label: "States & FCT", href: "/states" },
          { label: parent.name, href: parent.path },
          { label: j.name },
        ]}
      />
      <p className="badge">{LEVEL_LABEL[j.level]}</p>
      <h1>{j.name}</h1>

      <dl className="pgc-dl">
        <dt>{parent.level === "fct" ? "Territory" : "State"}</dt>
        <dd>{parent.name}</dd>
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
        <h2>Wards</h2>
        <div className="empty-state">
          No wards recorded yet. Ward lists are added from verified INEC/SIEC records.
        </div>
      </section>

      <JurisdictionRecords stateSlug={parent.slug} lgaSlug={j.slug} />

      <section className="section">
        <h2>Governance scorecards</h2>
        <div className="empty-state">
          <strong>Not yet rated.</strong> Scorecards are published only when sufficient verified evidence exists.
        </div>
      </section>
    </div>
  );
}
