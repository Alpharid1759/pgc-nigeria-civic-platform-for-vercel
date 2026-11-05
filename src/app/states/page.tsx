import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import FilterList from "@/components/FilterList";
import { topLevel } from "@/lib/directory";

export const metadata: Metadata = {
  title: "States & FCT",
  description: "Directory of Nigeria's 36 states and the Federal Capital Territory with their local government areas.",
};

export default function StatesPage() {
  const items = topLevel().map((j) => ({ name: j.name, href: j.path }));

  return (
    <div className="wrap">
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "States & FCT" }]} />
      <h1>States &amp; FCT</h1>
      <p className="section__lead">
        Select a state or the Federal Capital Territory to see its local government areas and recorded governance data.
      </p>
      <section className="section" style={{ paddingTop: 0 }}>
        <FilterList items={items} placeholder="Filter states…" />
      </section>
    </div>
  );
}
