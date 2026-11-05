import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import { PENDING_MODULES } from "@/lib/site";

type Params = { module: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return PENDING_MODULES.map((m) => ({ module: m.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { module } = await params;
  const m = PENDING_MODULES.find((x) => x.slug === module);
  return m ? { title: m.title, description: m.summary } : {};
}

export default async function PendingModulePage({ params }: { params: Promise<Params> }) {
  const { module } = await params;
  const m = PENDING_MODULES.find((x) => x.slug === module);
  if (!m) notFound();

  return (
    <div className="wrap">
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: m.title }]} />
      <p className="badge badge--pending">Not yet available in this build</p>
      <h1>{m.title}</h1>
      <p className="section__lead">{m.summary}</p>
      <div className="empty-state">
        This module stores records in a database. The Next.js build ships the public site, the national directory, the
        scoring engine and the constitution; the database-backed modules are ported next. Until then no records are
        shown here.
      </div>
      <p>
        <Link className="pgc-btn pgc-btn--primary" href="/states">
          Explore States &amp; FCT
        </Link>{" "}
        <Link className="pgc-btn" href="/methodology">
          How we assess
        </Link>
      </p>
    </div>
  );
}
