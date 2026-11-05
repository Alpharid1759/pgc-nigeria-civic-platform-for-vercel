import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Breadcrumbs from "@/components/Breadcrumbs";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Founding Constitution (Proposed Draft)",
  description:
    "The proposed founding constitution of PGC Nigeria. A draft for consultation; it has not been adopted.",
};

function loadConstitution(): string {
  return readFileSync(join(process.cwd(), "src", "content", "constitution.html"), "utf8");
}

export default function ConstitutionPage() {
  const html = loadConstitution();

  return (
    <div className="wrap">
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Founding Constitution" }]} />
      <h1>Founding Constitution</h1>
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
