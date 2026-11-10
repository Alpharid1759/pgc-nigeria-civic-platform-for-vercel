import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Breadcrumbs from "@/components/Breadcrumbs";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Party Rules and Regulations (Proposed Draft)",
  description: "The Mandate Rules and Candidate Code that bind every PGC Nigeria candidate and office holder. A draft; not adopted.",
};

export default function RulesPage() {
  const html = readFileSync(join(process.cwd(), "src", "content", "party-rules.html"), "utf8");
  return (
    <div className="wrap">
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "The Party", href: "/party" }, { label: "Rules and Regulations" }]} />
      <h1>Party Rules and Regulations</h1>
      <div className="doc-banner">
        <span className="badge badge--pending">PROPOSED DRAFT</span>
        <span>Version 0.1</span>
        <span>Not adopted</span>
      </div>
      <p>
        <PrintButton />
      </p>
      <div className="pgc-constitution__text" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
