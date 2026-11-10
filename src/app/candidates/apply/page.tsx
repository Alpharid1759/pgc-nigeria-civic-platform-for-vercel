import type { Metadata } from "next";
import Link from "next/link";
import AspirantForm from "@/components/AspirantForm";
import Breadcrumbs from "@/components/Breadcrumbs";
import DbNotice from "@/components/DbNotice";
import { MIN_MANDATE_ITEMS, MIN_MEMBER_MONTHS, OFFICES } from "@/lib/constants";
import { dbConfigured } from "@/lib/db";
import { topLevel } from "@/lib/directory";
import { getSecret, makeTimeTrap } from "@/lib/security";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Seek the Party's ticket",
  description: "Register as an aspirant and sign your Governance Mandate.",
};

export default function ApplyPage() {
  const secret = getSecret();
  const ready = dbConfigured() && secret !== null;
  const year = new Date().getUTCFullYear();

  return (
    <div className="wrap">
      <Breadcrumbs
        crumbs={[{ label: "Home", href: "/" }, { label: "Candidates", href: "/candidates" }, { label: "Seek the Party's ticket" }]}
      />
      <h1>Seek the Party&apos;s ticket</h1>
      <p className="section__lead">
        Only members in good standing for at least {MIN_MEMBER_MONTHS} months may seek the Party&apos;s ticket, and no one is cleared
        without a signed Governance Mandate of at least {MIN_MANDATE_ITEMS} predetermined projects. Read the{" "}
        <Link href="/constitution">Constitution</Link> and the <Link href="/party/rules">Party Rules</Link> first. The Party is
        not yet registered with INEC, so no primaries have been held.
      </p>
      {ready && secret ? (
        <AspirantForm
          states={topLevel().map((s) => ({ slug: s.slug, name: s.name }))}
          offices={Object.entries(OFFICES)
            .filter(([, o]) => o.elected)
            .map(([key, o]) => ({ key, label: o.label, level: o.level }))}
          timeTrap={makeTimeTrap(secret)}
          years={[year, year + 1, year + 2, year + 3, year + 4]}
          minItems={MIN_MANDATE_ITEMS}
        />
      ) : (
        <DbNotice what="Aspirant registration" />
      )}
    </div>
  );
}
