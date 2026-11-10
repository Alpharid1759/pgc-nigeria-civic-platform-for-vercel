"use server";

import { headers } from "next/headers";
import { getDb } from "@/lib/db";
import { submitMandate, type MandateLine } from "@/lib/mandates";
import { getSecret, ipHash, passesSpamChecks, rateLimit } from "@/lib/security";

export type MandateCode =
  | "invalid"
  | "spam"
  | "rate"
  | "not_member"
  | "too_new"
  | "duplicate"
  | "locked"
  | "consent"
  | "unavailable";

export interface MandateFormState {
  status: "idle" | "success" | "error";
  code?: MandateCode;
  candidateId?: number;
  signed?: boolean;
  needed?: number;
  lineErrors?: { line: number; projectNo: string; error: string }[];
  values?: Record<string, string>;
}

const TEXT_FIELDS = ["membership_no", "phone", "office", "state", "lga", "constituency", "election_year", "lines"] as const;
const FLAG_FIELDS = ["sign", "accept_code", "accept_rules", "accept_assets"] as const;

function text(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}

function parseLines(raw: string): MandateLine[] | null {
  const out: MandateLine[] = [];
  for (const row of raw.split(/\r?\n/)) {
    const t = row.trim();
    if (!t) continue;
    const m = /^([A-Za-z0-9-]{3,40})[\s,;]+(\d{4}-\d{2}-\d{2})$/.exec(t);
    if (!m) return null;
    out.push({ projectNo: m[1], targetDate: m[2] });
  }
  return out.length <= 20 ? out : null;
}

export async function submitMandateForm(_prev: MandateFormState, form: FormData): Promise<MandateFormState> {
  const values: Record<string, string> = {};
  for (const k of TEXT_FIELDS) values[k] = text(form, k);
  for (const k of FLAG_FIELDS) values[k] = text(form, k) === "1" ? "1" : "";

  const secret = getSecret();
  const db = getDb();
  if (!secret || !db) return { status: "error", code: "unavailable", values };

  const h = await headers();
  const hashed = ipHash(secret, h.get("x-forwarded-for") ?? h.get("x-real-ip"));
  if (!passesSpamChecks(secret, { honeypot: text(form, "pgc_website"), timeTrap: text(form, "pgc_ts") })) {
    return { status: "error", code: "spam", values };
  }

  const lines = parseLines(values.lines);
  const year = Number(values.election_year);
  if (!lines || !/^\d{4}$/.test(values.election_year) || !values.membership_no.trim() || !values.office) {
    return { status: "error", code: "invalid", values };
  }
  if (!values.accept_code || !values.accept_rules || !values.accept_assets) {
    return { status: "error", code: "consent", values };
  }

  try {
    if (!(await rateLimit(db, "mandate", hashed, 10, 3600))) return { status: "error", code: "rate", values };
    const result = await submitMandate(
      db,
      {
        membershipNo: values.membership_no,
        phone: values.phone,
        office: values.office,
        state: values.state || undefined,
        lga: values.lga || undefined,
        constituency: values.constituency,
        electionYear: year,
        lines,
        sign: values.sign === "1",
      },
      { hashedIp: hashed },
    );
    if (!result.ok) return { status: "error", code: result.error, values };
    return {
      status: "success",
      candidateId: result.candidateId,
      signed: result.signed,
      needed: result.needed,
      lineErrors: result.lineErrors,
      values,
    };
  } catch (err) {
    console.error("PGC mandate error:", err instanceof Error ? err.message : err);
    return { status: "error", code: "unavailable", values };
  }
}
