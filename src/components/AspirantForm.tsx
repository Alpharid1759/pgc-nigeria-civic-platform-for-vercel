"use client";

import { useActionState, useEffect, useState } from "react";
import { submitMandateForm, type MandateCode, type MandateFormState } from "@/app/candidates/actions";

interface Option {
  slug: string;
  name: string;
}

interface Props {
  states: Option[];
  offices: { key: string; label: string; level: string }[];
  timeTrap: string;
  years: number[];
  minItems: number;
}

const MESSAGES: Record<MandateCode, string> = {
  invalid: "Some fields are missing or invalid. Check the office, year, and that each project line looks like PROJECT-NO, YYYY-MM-DD.",
  spam: "Your submission could not be verified. Please wait a few seconds and submit again.",
  rate: "Too many submissions from your network. Please try again in an hour.",
  not_member: "We could not match that membership number and phone number to an active member.",
  too_new: "Membership must be held for the minimum period before seeking the Party's ticket.",
  duplicate: "A registration already exists for this office and year.",
  locked: "Your Mandate for this office and year is already signed and locked.",
  consent: "Please accept the Candidate Code, the Party Rules and the asset declaration.",
  unavailable: "The service is temporarily unavailable. Please try again later.",
};

const ITEM_MESSAGES: Record<string, string> = {
  no_project: "is not in the public Development Register",
  not_predetermined: "was added to the Register after you registered, so it is not predetermined",
  out_of_scope: "is outside the jurisdiction of this office",
  bad_date: "has a target date that is not valid for this tenure",
  locked: "cannot be added because the Mandate is locked",
  not_found: "could not be added",
};

export default function AspirantForm({ states, offices, timeTrap, years, minItems }: Props) {
  const [state, action, pending] = useActionState(submitMandateForm, { status: "idle" } as MandateFormState);
  const v = state.values ?? {};
  const [office, setOffice] = useState(v.office ?? "");
  const [stateSlug, setStateSlug] = useState(v.state ?? "");
  const [lgas, setLgas] = useState<Option[]>([]);
  const [lga, setLga] = useState(v.lga ?? "");
  const level = offices.find((o) => o.key === office)?.level;
  const needState = Boolean(office) && office !== "president";
  const needLga = level === "local" || level === "ward";

  useEffect(() => {
    if (!stateSlug || !needLga) {
      setLgas([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/jurisdictions/${encodeURIComponent(stateSlug)}/children`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Option[]) => !cancelled && setLgas(rows))
      .catch(() => !cancelled && setLgas([]));
    return () => {
      cancelled = true;
    };
  }, [stateSlug, needLga]);

  const flag = (k: string) => v[k] === "1";
  const hasLineErrors = state.status === "success" && (state.lineErrors?.length ?? 0) > 0;

  return (
    <>
      {state.status === "success" ? (
        <div className={`pgc-notice ${hasLineErrors ? "pgc-notice--error" : "pgc-notice--success"}`} role="status">
          {state.signed ? (
            <>
              <strong>Mandate signed and locked.</strong> Your registration number is <code>{state.candidateId}</code>. The
              Screening Committee will now review it. You will appear publicly once cleared.
            </>
          ) : (
            <>
              <strong>Saved as a draft.</strong> Your registration number is <code>{state.candidateId}</code>.{" "}
              {hasLineErrors
                ? "Fix the lines below and submit again with the signing box ticked."
                : state.needed
                  ? `Add at least ${state.needed} more project${state.needed === 1 ? "" : "s"} and tick the signing box to lock your Mandate.`
                  : "Tick the signing box and submit again when you are ready to lock your Mandate."}
            </>
          )}
          {hasLineErrors ? (
            <ul>
              {state.lineErrors!.map((e) => (
                <li key={e.line}>
                  Line {e.line}: <code>{e.projectNo}</code> {ITEM_MESSAGES[e.error] ?? "could not be added"}.
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
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
          <legend>Who you are</legend>
          <p>
            <label htmlFor="a-no">Membership number *</label>
            <input id="a-no" name="membership_no" required placeholder="PGC-NG-..." defaultValue={v.membership_no} />
          </p>
          <p>
            <label htmlFor="a-phone">Phone number on your membership *</label>
            <input id="a-phone" name="phone" type="tel" required inputMode="tel" defaultValue={v.phone} />
          </p>
        </fieldset>

        <fieldset>
          <legend>The office you seek</legend>
          <p>
            <label htmlFor="a-office">Office *</label>
            <select id="a-office" name="office" required value={office} onChange={(e) => setOffice(e.target.value)}>
              <option value="">Select…</option>
              {offices.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </p>
          {needState ? (
            <p>
              <label htmlFor="a-state">State *</label>
              <select
                id="a-state"
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
          ) : null}
          {needLga ? (
            <p>
              <label htmlFor="a-lga">Local Government Area / Area Council *</label>
              <select id="a-lga" name="lga" required value={lga} onChange={(e) => setLga(e.target.value)} disabled={lgas.length === 0}>
                <option value="">{lgas.length === 0 ? "Choose a state first" : "Select…"}</option>
                {lgas.map((l) => (
                  <option key={l.slug} value={l.slug}>
                    {l.name}
                  </option>
                ))}
              </select>
            </p>
          ) : null}
          <p>
            <label htmlFor="a-const">Constituency, district or ward (optional)</label>
            <input id="a-const" name="constituency" maxLength={190} defaultValue={v.constituency} />
          </p>
          <p>
            <label htmlFor="a-year">Election year *</label>
            <select id="a-year" name="election_year" required defaultValue={v.election_year ?? ""}>
              <option value="">Select…</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </p>
        </fieldset>

        <fieldset>
          <legend>Your Governance Mandate</legend>
          <p>
            List at least {minItems} projects from the public <a href="/projects">Development Register</a>, one per line, as the
            project number, a comma, then the date you commit to deliver it (YYYY-MM-DD). Only projects that were in the Register
            before you registered, and that sit in your jurisdiction, are accepted.
          </p>
          <p>
            <label htmlFor="a-lines">Mandate Projects *</label>
            <textarea
              id="a-lines"
              name="lines"
              rows={7}
              placeholder={"PGC-PRJ-BEN-2026-000001, 2029-06-30\nPGC-PRJ-BEN-2026-000002, 2029-12-31"}
              defaultValue={v.lines}
            />
          </p>
          <p>
            <label>
              <input type="checkbox" name="sign" value="1" defaultChecked={flag("sign")} /> Sign and lock this Mandate now. Once locked, it
              is public and can be changed only by the Mandate Committee, with published reasons.
            </label>
          </p>
        </fieldset>

        <fieldset>
          <legend>Declarations *</legend>
          <p>
            <label>
              <input type="checkbox" name="accept_code" value="1" required defaultChecked={flag("accept_code")} /> I accept the Candidate Code.
            </label>
          </p>
          <p>
            <label>
              <input type="checkbox" name="accept_rules" value="1" required defaultChecked={flag("accept_rules")} /> I accept the Party Rules and
              Regulations, including quarterly delivery reports and the sanctions for failure to deliver without good cause.
            </label>
          </p>
          <p>
            <label>
              <input type="checkbox" name="accept_assets" value="1" required defaultChecked={flag("accept_assets")} /> I will declare my assets and
              interests before screening.
            </label>
          </p>
        </fieldset>

        <p>
          <button type="submit" className="pgc-btn pgc-btn--primary" disabled={pending}>
            {pending ? "Submitting…" : "Submit"}
          </button>
        </p>
      </form>
    </>
  );
}
