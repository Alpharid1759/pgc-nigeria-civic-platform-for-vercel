import Link from "next/link";
import { CONTACT } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="grid">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.svg" alt="" width={64} height={64} />
            <p>
              <strong>The People&apos;s Governance Compact (PGC Nigeria)</strong>
              <br />
              Democracy Beyond the Ballot.
            </p>
            <p>
              A proposed, non-partisan, citizen-led institution. Not a political party, campaign organisation or
              government agency. Not yet incorporated: the proposed legal pathway is registration as Incorporated
              Trustees under CAMA 2020, subject to CAC approval.
            </p>
          </div>
          <div>
            <h3>Contact</h3>
            <ul>
              <li>
                Tel: <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>
              </li>
              <li>
                WhatsApp:{" "}
                <a href={CONTACT.whatsapp} rel="noopener">
                  Chat on WhatsApp
                </a>
              </li>
              <li>
                Email: <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
              </li>
              <li>Proposed headquarters: Abuja, FCT (subject to formal establishment)</li>
            </ul>
          </div>
          <div>
            <h3>Explore</h3>
            <ul>
              <li>
                <Link href="/states">States &amp; FCT</Link>
              </li>
              <li>
                <Link href="/scorecards">Governance Scorecards</Link>
              </li>
              <li>
                <Link href="/membership">Become a Member</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3>Institutional</h3>
            <ul>
              <li>
                <Link href="/constitution">Founding Constitution (Proposed Draft)</Link>
              </li>
              <li>
                <Link href="/methodology">Scorecard Methodology</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          &copy; {new Date().getUTCFullYear()} PGC Nigeria. Your vote is a mandate. Your participation is the
          accountability.
        </div>
      </div>
    </footer>
  );
}
