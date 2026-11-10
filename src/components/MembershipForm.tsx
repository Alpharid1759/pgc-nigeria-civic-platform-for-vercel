"use client";

import { useActionState, useEffect, useState } from "react";
import { submitApplication, type ApplyCode, type ApplyState } from "@/app/membership/actions";

interface Option {
  slug: string;
  name: string;
}

interface Props {
  states: Option[];
  categories: { key: string; label: string }[];
  timeTrap: string;
  defaultCategory?: string;
}

const MESSAGES: Record<ApplyCode, string> = {
  invalid: "Some required fields are missing or invalid. Please check and try again.",
  spam: "Your submission could not be verified. Please wait a few seconds and submit again.",
  rate: "Too many submissions from your network. Please try again in an hour.",
  duplicate: "An application or membership already exists for this email address.",
  consent: "Please confirm all required declarations.",
  unavailable: "The membership service is temporarily unavailable. Please try again later.",
};

const initial: ApplyState = { status: "idle" };

export default function MembershipForm({ states, categories, timeTrap, defaultCategory }: Props) {
  const [state, action, pending] = useActionState(submitApplication, initial);
  const v = state.values ?? {};
  const [stateSlug, setStateSlug] = useState(v.state ?? "");
  const [lgas, setLgas] = useState<Option[]>([]);
  const [lga, setLga] = useState(v.lga ?? "");

  useEffect(() => {
    if (!stateSlug) {
      setLgas([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/jurisdictions/${encodeURIComponent(stateSlug)}/children`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Option[]) => {
        if (!cancelled) setLgas(rows);
      })
      .catch(() => {
        if (!cancelled) setLgas([]);
      });
    return () => {
      cancelled = true;
    };
  }, [stateSlug]);

  if (state.status === "success") {
    return (
      <div className="pgc-notice pgc-notice--success" role="status">
        <strong>Application received.</strong> Your application number is <code>{state.applicationNo}</code>. Please keep
        it. A membership officer will review your application.
      </div>
    );
  }

  const flag = (k: string) => v[k] === "1";

  return (
    <>
      {state.status === "error" && state.code ? (
        <div className="pgc-notice pgc-notice--error" role="alert">
          {MESSAGES[state.code]}
        </div>
      ) : null}
      <form className="pgc-form" action={action} noValidate>
        <div aria-hidden="true" style={{ position: "absolute", left: "-9999px" }}>
          <label>
            Leave empty
            <input type="text" name="pgc_website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <input type="hidden" name="pgc_ts" value={timeTrap} />

        <fieldset>
          <legend>Personal information</legend>
          <p>
            <label htmlFor="pgc-name">Full name *</label>
            <input id="pgc-name" name="full_name" required maxLength={190} autoComplete="name" defaultValue={v.full_name} />
          </p>
          <p>
            <label htmlFor="pgc-dob">Date of birth</label>
            <input id="pgc-dob" name="date_of_birth" type="date" defaultValue={v.date_of_birth} />
          </p>
          <p>
            <label htmlFor="pgc-gender">Gender (optional)</label>
            <select id="pgc-gender" name="gender" defaultValue={v.gender ?? ""}>
              <option value="">Prefer not to say</option>
              <option>Female</option>
              <option>Male</option>
            </select>
          </p>
          <p>
            <label htmlFor="pgc-phone">Phone number *</label>
            <input id="pgc-phone" name="phone" type="tel" required inputMode="tel" autoComplete="tel" placeholder="080..." defaultValue={v.phone} />
          </p>
          <p>
            <label htmlFor="pgc-wa">WhatsApp number</label>
            <input id="pgc-wa" name="whatsapp" type="tel" inputMode="tel" defaultValue={v.whatsapp} />
          </p>
          <p>
            <label htmlFor="pgc-email">Email *</label>
            <input id="pgc-email" name="email" type="email" required autoComplete="email" defaultValue={v.email} />
          </p>
          <p>
            <label htmlFor="pgc-nat">Nationality *</label>
            <input id="pgc-nat" name="nationality" required defaultValue={v.nationality || "Nigerian"} />
          </p>
          <p>
            <label htmlFor="pgc-origin">State of origin (optional)</label>
            <select id="pgc-origin" name="state_of_origin" defaultValue={v.state_of_origin ?? ""}>
              <option value="">Select…</option>
              {states.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          </p>
          <p>
            <label htmlFor="pgc-state">State of residence *</label>
            <select
              id="pgc-state"
              name="state"
              required
              value={stateSlug}
              onChange={(e) => {
                setStateSlug(e.target.value);
                setLga("");
              }}
            >
              <option value="">Select…</option>
              {states.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          </p>
          <p>
            <label htmlFor="pgc-lga">LGA / Area Council *</label>
            <select id="pgc-lga" name="lga" required disabled={!stateSlug} value={lga} onChange={(e) => setLga(e.target.value)}>
              <option value="">{stateSlug ? "Select…" : "Select state first"}</option>
              {lgas.map((l) => (
                <option key={l.slug} value={l.slug}>
                  {l.name}
                </option>
              ))}
            </select>
          </p>
          <p>
            <label htmlFor="pgc-community">Community</label>
            <input id="pgc-community" name="community" maxLength={190} defaultValue={v.community} />
          </p>
          <p>
            <label htmlFor="pgc-address">Residential address (optional)</label>
            <textarea id="pgc-address" name="address" rows={2} defaultValue={v.address} />
          </p>
        </fieldset>

        <fieldset>
          <legend>Membership information</legend>
          <p>
            <label htmlFor="pgc-cat">Preferred membership category *</label>
            <select id="pgc-cat" name="category" required defaultValue={v.category || defaultCategory || "ordinary"}>
              {categories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </p>
          <p>
            <label htmlFor="pgc-occ">Occupation</label>
            <input id="pgc-occ" name="occupation" maxLength={190} defaultValue={v.occupation} />
          </p>
          <p>
            <label htmlFor="pgc-edu">Educational background (optional)</label>
            <input id="pgc-edu" name="education" maxLength={190} defaultValue={v.education} />
          </p>
          <p>
            <label htmlFor="pgc-skills">Skills</label>
            <textarea id="pgc-skills" name="skills" rows={2} defaultValue={v.skills} />
          </p>
          <p>
            <label htmlFor="pgc-int">Areas of interest</label>
            <textarea id="pgc-int" name="interests" rows={2} defaultValue={v.interests} />
          </p>
          <p>
            <label htmlFor="pgc-prev">Previous civic participation (optional)</label>
            <textarea id="pgc-prev" name="previous_civic" rows={2} defaultValue={v.previous_civic} />
          </p>
          <p>
            <label htmlFor="pgc-mot">Motivation for joining</label>
            <textarea id="pgc-mot" name="motivation" rows={3} defaultValue={v.motivation} />
          </p>
          <p>
            <label>
              <input type="checkbox" name="quarterly_monitoring" value="1" defaultChecked={flag("quarterly_monitoring")} /> I am willing to
              participate in quarterly monitoring
            </label>
          </p>
          <p>
            <label>
              <input type="checkbox" name="volunteer_interest" value="1" defaultChecked={flag("volunteer_interest")} /> I am interested in
              volunteering
            </label>
          </p>
          <p>
            <label htmlFor="pgc-comm">Preferred communication method</label>
            <select id="pgc-comm" name="comm_preference" defaultValue={v.comm_preference || "email"}>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </p>
        </fieldset>

        <fieldset>
          <legend>Declaration and consent *</legend>
          <p>
            <label>
              <input type="checkbox" name="decl_voluntary" value="1" required defaultChecked={flag("decl_voluntary")} /> My membership is voluntary.
            </label>
          </p>
          <p>
            <label>
              <input type="checkbox" name="decl_democratic" value="1" required defaultChecked={flag("decl_democratic")} /> I commit to peaceful,
              lawful democratic participation.
            </label>
          </p>
          <p>
            <label>
              <input type="checkbox" name="decl_ideology" value="1" required defaultChecked={flag("decl_ideology")} /> I accept the
              Party&apos;s ideology of Governance by Objective, and I do not belong to another political party.
            </label>
          </p>
          <p>
            <label>
              <input type="checkbox" name="decl_constitution" value="1" required defaultChecked={flag("decl_constitution")} /> I agree to the
              proposed party constitution and code of conduct.
            </label>
          </p>
          <p>
            <label>
              <input type="checkbox" name="consent_data" value="1" required defaultChecked={flag("consent_data")} /> I consent to PGC Nigeria
              processing the personal data above to manage my membership (Nigeria Data Protection Act 2023).
            </label>
          </p>
          <p>
            <label>
              <input type="checkbox" name="consent_newsletter" value="1" defaultChecked={flag("consent_newsletter")} /> (Optional) Send me
              newsletters and campaign updates.
            </label>
          </p>
        </fieldset>

        <p>
          <button type="submit" className="pgc-btn pgc-btn--primary" disabled={pending}>
            {pending ? "Submitting…" : "Submit application"}
          </button>
        </p>
      </form>
    </>
  );
}
