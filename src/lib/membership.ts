import { randomBytes } from "node:crypto";
import type { Db } from "@/lib/db";
import { CONSENT_VERSION, MEMBERSHIP_CATEGORIES } from "@/lib/constants";
import { children, findChild, findTop } from "@/lib/directory";
import { audit, normalisePhone } from "@/lib/security";

export type ApplyError = "invalid" | "consent" | "duplicate";

export type ApplyResult = { ok: true; applicationNo: string } | { ok: false; error: ApplyError };

export interface ApplicationInput {
  full_name?: string;
  date_of_birth?: string;
  gender?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  nationality?: string;
  state_of_origin?: string;
  state?: string;
  lga?: string;
  ward?: string;
  community?: string;
  address?: string;
  category?: string;
  occupation?: string;
  education?: string;
  skills?: string;
  interests?: string;
  previous_civic?: string;
  motivation?: string;
  quarterly_monitoring?: boolean;
  volunteer_interest?: boolean;
  comm_preference?: string;
  decl_voluntary?: boolean;
  decl_democratic?: boolean;
  decl_ideology?: boolean;
  decl_constitution?: boolean;
  consent_data?: boolean;
  consent_newsletter?: boolean;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function clean(value: string | undefined, max: number): string {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim()
    .slice(0, max);
}

function orNull(value: string): string | null {
  return value === "" ? null : value;
}

/** State/FCT, then one of its LGAs / Area Councils. Wards are not yet in the directory. */
export function validChain(state: string, lga: string): boolean {
  const top = findTop(state);
  return Boolean(top && findChild(state, lga));
}

export async function createApplication(
  db: Db,
  input: ApplicationInput,
  hashedIp: string | null,
  isDemo = false,
): Promise<ApplyResult> {
  const required = [
    input.decl_voluntary,
    input.decl_democratic,
    input.decl_ideology,
    input.decl_constitution,
    input.consent_data,
  ];
  if (!required.every(Boolean)) return { ok: false, error: "consent" };

  const name = clean(input.full_name, 190);
  const email = clean(input.email, 190).toLowerCase();
  const phone = normalisePhone(input.phone);
  const whatsapp = normalisePhone(input.whatsapp);
  const state = clean(input.state, 80);
  const lga = clean(input.lga, 120);
  const category = clean(input.category, 48);
  const dob = clean(input.date_of_birth, 10);

  const dobValid = dob === "" || (/^\d{4}-\d{2}-\d{2}$/.test(dob) && !Number.isNaN(Date.parse(dob)));
  const valid =
    name !== "" &&
    EMAIL.test(email) &&
    phone !== "" &&
    category in MEMBERSHIP_CATEGORIES &&
    validChain(state, lga) &&
    dobValid;
  if (!valid) return { ok: false, error: "invalid" };

  const dupe = await db.query(
    "SELECT id FROM membership_applications WHERE lower(email) = $1 AND status IN ('pending', 'approved') LIMIT 1",
    [email],
  );
  if (dupe.rows.length > 0) return { ok: false, error: "duplicate" };

  const origin = clean(input.state_of_origin, 80);
  const gender = clean(input.gender, 20);
  const comm = clean(input.comm_preference, 20);

  const inserted = await db.query<{ id: string }>(
    `INSERT INTO membership_applications (
       application_no, full_name, date_of_birth, gender, phone, whatsapp, email, nationality,
       state_of_origin_slug, state_slug, lga_slug, community, address, category, occupation, education,
       skills, interests, previous_civic, motivation, quarterly_monitoring, volunteer_interest,
       comm_preference, consent_data, consent_newsletter, consent_version, status, ip_hash, is_demo
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
       $17, $18, $19, $20, $21, $22, $23, true, $24, $25, 'pending', $26, $27
     ) RETURNING id`,
    [
      `TMP-${randomBytes(10).toString("hex")}`,
      name,
      orNull(dob),
      gender === "Female" || gender === "Male" ? gender : null,
      phone,
      orNull(whatsapp),
      email,
      clean(input.nationality, 64) || "Nigerian",
      origin && findTop(origin) ? origin : null,
      state,
      lga,
      orNull(clean(input.community, 190)),
      orNull(clean(input.address, 2000)),
      category,
      orNull(clean(input.occupation, 190)),
      orNull(clean(input.education, 190)),
      orNull(clean(input.skills, 2000)),
      orNull(clean(input.interests, 2000)),
      orNull(clean(input.previous_civic, 2000)),
      orNull(clean(input.motivation, 2000)),
      Boolean(input.quarterly_monitoring),
      Boolean(input.volunteer_interest),
      ["email", "sms", "whatsapp"].includes(comm) ? comm : "email",
      Boolean(input.consent_newsletter),
      CONSENT_VERSION,
      hashedIp,
      isDemo,
    ],
  );

  const id = Number(inserted.rows[0].id);
  const applicationNo = `PGC-APP-${new Date().getUTCFullYear()}-${String(id).padStart(6, "0")}`;
  await db.query("UPDATE membership_applications SET application_no = $1 WHERE id = $2", [applicationNo, id]);
  await audit(db, "membership_applied", "membership_application", id, {}, hashedIp);

  return { ok: true, applicationNo };
}

export type ReviewResult = { ok: true; membershipNo?: string } | { ok: false; error: "not_found" | "not_pending" };

/** Approves a pending application and creates the member record. */
export async function approveApplication(db: Db, applicationId: number, reviewer: string, notes = ""): Promise<ReviewResult> {
  const found = await db.query<{
    id: string;
    status: string;
    category: string;
    state_slug: string;
    lga_slug: string;
    ward_slug: string | null;
    is_demo: boolean;
  }>("SELECT id, status, category, state_slug, lga_slug, ward_slug, is_demo FROM membership_applications WHERE id = $1", [
    applicationId,
  ]);
  const app = found.rows[0];
  if (!app) return { ok: false, error: "not_found" };
  if (app.status !== "pending") return { ok: false, error: "not_pending" };

  const code = findTop(app.state_slug)?.code ?? "NAT";
  const membershipNo = `PGC-NG-${code}-${new Date().getUTCFullYear()}-${String(applicationId).padStart(6, "0")}`;

  await db.query(
    `INSERT INTO members (membership_no, application_id, category, state_slug, lga_slug, ward_slug, status, approved_by, is_demo)
     VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8)`,
    [membershipNo, applicationId, app.category, app.state_slug, app.lga_slug, app.ward_slug, reviewer, app.is_demo],
  );
  await db.query(
    "UPDATE membership_applications SET status = 'approved', reviewed_by = $2, reviewed_at = now(), review_notes = $3 WHERE id = $1",
    [applicationId, reviewer, orNull(clean(notes, 2000))],
  );
  await audit(db, "membership_approved", "membership_application", applicationId, { membershipNo }, null, reviewer);
  return { ok: true, membershipNo };
}

export async function rejectApplication(db: Db, applicationId: number, reviewer: string, notes = ""): Promise<ReviewResult> {
  const found = await db.query<{ status: string }>("SELECT status FROM membership_applications WHERE id = $1", [applicationId]);
  const app = found.rows[0];
  if (!app) return { ok: false, error: "not_found" };
  if (app.status !== "pending") return { ok: false, error: "not_pending" };
  await db.query(
    "UPDATE membership_applications SET status = 'rejected', reviewed_by = $2, reviewed_at = now(), review_notes = $3 WHERE id = $1",
    [applicationId, reviewer, orNull(clean(notes, 2000))],
  );
  await audit(db, "membership_rejected", "membership_application", applicationId, {}, null, reviewer);
  return { ok: true };
}

export function lgaOptions(stateSlug: string): { slug: string; name: string }[] {
  return children(stateSlug).map((c) => ({ slug: c.slug, name: c.name }));
}
