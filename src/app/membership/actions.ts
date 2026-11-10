"use server";

import { headers } from "next/headers";
import { getDb } from "@/lib/db";
import { createApplication, type ApplicationInput } from "@/lib/membership";
import { getSecret, ipHash, passesSpamChecks, rateLimit } from "@/lib/security";

export type ApplyCode = "invalid" | "spam" | "rate" | "duplicate" | "consent" | "unavailable";

export interface ApplyState {
  status: "idle" | "success" | "error";
  code?: ApplyCode;
  applicationNo?: string;
  values?: Record<string, string>;
}

const TEXT_FIELDS = [
  "full_name",
  "date_of_birth",
  "gender",
  "phone",
  "whatsapp",
  "email",
  "nationality",
  "state_of_origin",
  "state",
  "lga",
  "community",
  "address",
  "category",
  "occupation",
  "education",
  "skills",
  "interests",
  "previous_civic",
  "motivation",
  "comm_preference",
] as const;

const FLAG_FIELDS = [
  "quarterly_monitoring",
  "volunteer_interest",
  "decl_voluntary",
  "decl_democratic",
  "decl_ideology",
  "decl_constitution",
  "consent_data",
  "consent_newsletter",
] as const;

function text(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}

export async function submitApplication(_prev: ApplyState, form: FormData): Promise<ApplyState> {
  const values: Record<string, string> = {};
  const input: Record<string, string | boolean> = {};
  for (const k of TEXT_FIELDS) {
    values[k] = text(form, k);
    input[k] = values[k];
  }
  for (const k of FLAG_FIELDS) {
    const on = text(form, k) === "1";
    values[k] = on ? "1" : "";
    input[k] = on;
  }

  const secret = getSecret();
  const db = getDb();
  if (!secret || !db) return { status: "error", code: "unavailable", values };

  const h = await headers();
  const hashed = ipHash(secret, h.get("x-forwarded-for") ?? h.get("x-real-ip"));

  if (!passesSpamChecks(secret, { honeypot: text(form, "pgc_website"), timeTrap: text(form, "pgc_ts") })) {
    return { status: "error", code: "spam", values };
  }

  try {
    if (!(await rateLimit(db, "apply", hashed, 5, 3600))) {
      return { status: "error", code: "rate", values };
    }
    const result = await createApplication(db, input as ApplicationInput, hashed);
    if (!result.ok) return { status: "error", code: result.error, values };
    return { status: "success", applicationNo: result.applicationNo };
  } catch (err) {
    console.error("PGC membership error:", err instanceof Error ? err.message : err);
    return { status: "error", code: "unavailable", values };
  }
}
