import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import { MIN_MANDATE_ITEMS } from "@/lib/constants";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "The Party: Governance by Objective",
  description:
    "PGC Nigeria is a proposed political party whose candidates are bound to deliver predetermined development projects for the jurisdictions they represent.",
};

const STEPS: { title: string; text: string }[] = [
  { title: "Communities set the objectives", text: "Ward, Local Government and State consultations record needs and priorities in the public Development Register, with costs and sources." },
  { title: "Objectives become the manifesto", text: "State Chapters publish an Objectives Schedule. The Party's manifesto is the sum of its candidates' Mandates." },
  { title: "Candidates sign a Mandate", text: `No aspirant is cleared without a signed Governance Mandate of at least ${MIN_MANDATE_ITEMS} projects that were in the Register before they declared.` },
  { title: "Voters see the Mandate before they vote", text: "Every cleared aspirant's Mandate is published before any primary and stays with the candidate's profile through the election." },
  { title: "Delivery is measured", text: "Progress is read from the Development Register. A project is delivered only when independently verified; a release of funds is never proof." },
  { title: "Failure has consequences", text: "Quarterly reports, a mid-tenure review and a published sanction ladder apply, with a fair hearing and a good-cause protection for obstacles beyond the office holder's control." },
];

export default function PartyPage() {
  return (
    <div className="wrap">
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "The Party" }]} />
      <p className="badge badge--pending">Proposed political party · not yet registered with INEC</p>
      <h1>Governance by Objective</h1>
      <p className="section__lead">
        Our ideology is simple: elected office is a mandate to deliver agreed development objectives. Every successfully
        elected representative of PGC Nigeria is bound to deliver the predetermined projects they committed to for the
        jurisdiction they represent, and the public can see, project by project, whether they did.
      </p>

      <section className="section" style={{ paddingBottom: 0 }}>
        <h2>How it works</h2>
        <div className="grid stages">
          {STEPS.map((s) => (
            <div className="card stage reveal" key={s.title}>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section" style={{ paddingBottom: 0 }}>
        <h2>What a Mandate does and does not do</h2>
        <div className="grid">
          <div className="card">
            <h3>It does</h3>
            <p>Name specific, costed projects for the jurisdiction, with dates inside the tenure, and tie the Party&apos;s support to delivering them.</p>
          </div>
          <div className="card">
            <h3>It does not</h3>
            <p>
              Override the Constitution, appropriation law or procurement rules, or let the Party remove anyone from office. The Party
              will not demand undated resignation letters. Sanctions are internal: caution, censure, loss of Party support and of the
              Party&apos;s ticket, and membership.
            </p>
          </div>
        </div>
        <p className="data-note">
          Citizens may use the recall process where the Constitution provides for it. The Party supports civic education about it
          and does not use it as a party tool.
        </p>
      </section>

      <section className="section" style={{ paddingBottom: 0 }}>
        <h2>Where the Party stands legally</h2>
        <p>
          PGC Nigeria is a proposal. It is not yet registered with the Independent National Electoral Commission, cannot sponsor
          candidates and has not held primaries. Registration as a political party follows sections 222 to 229 of the Constitution
          and the Electoral Act. In outline, the Party must:
        </p>
        <ul>
          <li>adopt a constitution and manifesto and file them with INEC;</li>
          <li>have a name, motto, emblem and logo with no ethnic or religious connotation;</li>
          <li>keep its headquarters in the Federal Capital Territory and be open to every Nigerian citizen;</li>
          <li>build a membership register and offices across the States and the FCT, to the extent INEC&apos;s current requirements ask;</li>
          <li>keep to the Electoral Act on funding, primaries and returns.</li>
        </ul>
        <p className="data-note">
          Check the current requirements with INEC and a Nigerian lawyer before applying. The draft Constitution and Rules are for
          consultation and have not been adopted.
        </p>
      </section>

      <p>
        <Link className="pgc-btn pgc-btn--primary" href="/membership">
          Join the Party
        </Link>{" "}
        <Link className="pgc-btn" href="/constitution">
          Read the Constitution
        </Link>{" "}
        <Link className="pgc-btn" href="/party/rules">
          Party Rules and Regulations
        </Link>{" "}
        <Link className="pgc-btn" href="/candidates">
          Candidates and Mandates
        </Link>
      </p>
    </div>
  );
}
