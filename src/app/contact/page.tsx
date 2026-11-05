import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import { CONTACT } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact PGC Nigeria by phone, WhatsApp or email.",
};

export default function ContactPage() {
  return (
    <div className="wrap">
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]} />
      <h1>Contact</h1>
      <dl className="pgc-dl">
        <dt>Phone</dt>
        <dd>
          <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>
        </dd>
        <dt>WhatsApp</dt>
        <dd>
          <a href={CONTACT.whatsapp} rel="noopener">
            Chat on WhatsApp
          </a>
        </dd>
        <dt>Email</dt>
        <dd>
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
        </dd>
        <dt>Proposed headquarters</dt>
        <dd>Abuja, FCT (subject to formal establishment)</dd>
      </dl>
    </div>
  );
}
