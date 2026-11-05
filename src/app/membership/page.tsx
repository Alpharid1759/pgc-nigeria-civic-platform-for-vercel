import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import DbNotice from "@/components/DbNotice";
import MembershipForm from "@/components/MembershipForm";
import { MEMBERSHIP_CATEGORIES } from "@/lib/constants";
import { dbConfigured } from "@/lib/db";
import { topLevel } from "@/lib/directory";
import { getSecret, makeTimeTrap } from "@/lib/security";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Membership",
  description: "Apply to become a member or volunteer of PGC Nigeria.",
};

export default async function MembershipPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const secret = getSecret();
  const ready = dbConfigured() && secret !== null;

  return (
    <div className="wrap">
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Membership" }]} />
      <h1>Membership</h1>
      <p className="section__lead">
        Apply to join PGC Nigeria as a member or volunteer. Applications are reviewed by a membership officer. Your
        details are used only to manage your membership.
      </p>
      {ready && secret ? (
        <MembershipForm
          states={topLevel().map((s) => ({ slug: s.slug, name: s.name }))}
          categories={Object.entries(MEMBERSHIP_CATEGORIES).map(([key, label]) => ({ key, label }))}
          timeTrap={makeTimeTrap(secret)}
          defaultCategory={category && category in MEMBERSHIP_CATEGORIES ? category : undefined}
        />
      ) : (
        <DbNotice what="Membership applications" />
      )}
    </div>
  );
}
