import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { approveApplication, createApplication, rejectApplication, type ApplicationInput } from "@/lib/membership";
import { ipHash, makeTimeTrap, normalisePhone, passesSpamChecks, rateLimit } from "@/lib/security";
import { createTestDb } from "./helpers/db";

let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(async () => {
  await close();
});

const base = (over: Partial<ApplicationInput> = {}): ApplicationInput => ({
  full_name: "Amina Yusuf",
  email: "amina@example.org",
  phone: "08031234567",
  state: "benue",
  lga: "makurdi",
  category: "ordinary",
  decl_voluntary: true,
  decl_democratic: true,
  decl_ideology: true,
  decl_constitution: true,
  consent_data: true,
  ...over,
});

describe("normalisePhone", () => {
  it("normalises Nigerian numbers", () => {
    expect(normalisePhone("08031234567")).toBe("+2348031234567");
    expect(normalisePhone("+234 803 123 4567")).toBe("+2348031234567");
    expect(normalisePhone("2348031234567")).toBe("+2348031234567");
  });
  it("rejects invalid numbers", () => {
    expect(normalisePhone("12345")).toBe("");
    expect(normalisePhone("")).toBe("");
    expect(normalisePhone("06031234567")).toBe("");
  });
});

describe("spam checks", () => {
  const secret = "test-secret-1234567890";
  it("accepts a genuine token that is old enough", () => {
    const token = makeTimeTrap(secret, 1_000_000);
    expect(passesSpamChecks(secret, { honeypot: "", timeTrap: token }, 1_000_010)).toBe(true);
  });
  it("rejects the honeypot, instant submits, stale tokens and forgeries", () => {
    const token = makeTimeTrap(secret, 1_000_000);
    expect(passesSpamChecks(secret, { honeypot: "x", timeTrap: token }, 1_000_010)).toBe(false);
    expect(passesSpamChecks(secret, { honeypot: "", timeTrap: token }, 1_000_002)).toBe(false);
    expect(passesSpamChecks(secret, { honeypot: "", timeTrap: token }, 1_000_000 + 86_401)).toBe(false);
    expect(passesSpamChecks(secret, { honeypot: "", timeTrap: "1000000.deadbeef" }, 1_000_010)).toBe(false);
    expect(passesSpamChecks("other-secret-1234567890", { honeypot: "", timeTrap: token }, 1_000_010)).toBe(false);
    expect(passesSpamChecks(secret, { honeypot: "", timeTrap: "" }, 1_000_010)).toBe(false);
  });
});

describe("rateLimit", () => {
  it("allows up to the maximum then blocks", async () => {
    const results: boolean[] = [];
    for (let i = 0; i < 7; i++) results.push(await rateLimit(db, "apply", "hash-a", 5, 3600));
    expect(results).toEqual([true, true, true, true, true, false, false]);
  });
  it("counts each address separately", async () => {
    expect(await rateLimit(db, "apply", "hash-b", 5, 3600)).toBe(true);
  });
});

describe("createApplication", () => {
  it("stores a pending application with a formatted application number", async () => {
    const hashed = ipHash("test-secret-1234567890", "203.0.113.7");
    expect(hashed).toHaveLength(64);
    const res = await createApplication(db, base(), hashed);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.applicationNo).toMatch(/^PGC-APP-\d{4}-\d{6}$/);

    const row = (await db.query<{ status: string; phone: string; consent_version: string; ip_hash: string }>(
      "SELECT status, phone, consent_version, ip_hash FROM membership_applications WHERE application_no = $1",
      [res.applicationNo],
    )).rows[0];
    expect(row.status).toBe("pending");
    expect(row.phone).toBe("+2348031234567");
    expect(row.consent_version).toBe("2026-11");
    expect(row.ip_hash).toBe(hashed);
  });

  it("requires every declaration and the data consent", async () => {
    for (const k of ["decl_voluntary", "decl_democratic", "decl_ideology", "decl_constitution", "consent_data"] as const) {
      const res = await createApplication(db, base({ email: `c-${k}@example.org`, [k]: false }), null);
      expect(res).toEqual({ ok: false, error: "consent" });
    }
  });

  it("rejects invalid input", async () => {
    const bad: Partial<ApplicationInput>[] = [
      { full_name: "" },
      { email: "not-an-email" },
      { phone: "123" },
      { category: "emperor" },
      { state: "narnia" },
      { lga: "not-an-lga" },
      { state: "lagos", lga: "makurdi" },
      { date_of_birth: "12/05/1990" },
    ];
    for (const [i, over] of bad.entries()) {
      const res = await createApplication(db, base({ email: `bad${i}@example.org`, ...over }), null);
      expect(res).toEqual({ ok: false, error: "invalid" });
    }
  });

  it("blocks a second pending or approved application for the same email", async () => {
    const first = await createApplication(db, base({ email: "dupe@example.org" }), null);
    expect(first.ok).toBe(true);
    expect(await createApplication(db, base({ email: "DUPE@example.org" }), null)).toEqual({ ok: false, error: "duplicate" });
  });

  it("accepts FCT area councils", async () => {
    const res = await createApplication(db, base({ email: "fct@example.org", state: "abuja-fct", lga: "gwagwalada" }), null);
    expect(res.ok).toBe(true);
  });

  it("ignores unknown gender and communication values", async () => {
    const res = await createApplication(db, base({ email: "g@example.org", gender: "Other", comm_preference: "pigeon" }), null);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const row = (await db.query<{ gender: string | null; comm_preference: string }>(
      "SELECT gender, comm_preference FROM membership_applications WHERE application_no = $1",
      [res.applicationNo],
    )).rows[0];
    expect(row.gender).toBeNull();
    expect(row.comm_preference).toBe("email");
  });
});

describe("review", () => {
  it("approves a pending application and creates the member", async () => {
    const created = await createApplication(db, base({ email: "approve@example.org" }), null);
    if (!created.ok) throw new Error("setup failed");
    const id = (await db.query<{ id: string }>("SELECT id FROM membership_applications WHERE application_no = $1", [created.applicationNo])).rows[0].id;

    const res = await approveApplication(db, Number(id), "officer@pgc", "ok");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.membershipNo).toMatch(/^PGC-NG-BEN-\d{4}-\d{6}$/);

    const member = (await db.query<{ status: string; state_slug: string }>("SELECT status, state_slug FROM members WHERE membership_no = $1", [res.membershipNo])).rows[0];
    expect(member).toEqual({ status: "active", state_slug: "benue" });

    expect(await approveApplication(db, Number(id), "officer@pgc")).toEqual({ ok: false, error: "not_pending" });
    expect(await createApplication(db, base({ email: "approve@example.org" }), null)).toEqual({ ok: false, error: "duplicate" });
  });

  it("rejects a pending application and frees the email", async () => {
    const created = await createApplication(db, base({ email: "reject@example.org" }), null);
    if (!created.ok) throw new Error("setup failed");
    const id = (await db.query<{ id: string }>("SELECT id FROM membership_applications WHERE application_no = $1", [created.applicationNo])).rows[0].id;
    expect(await rejectApplication(db, Number(id), "officer@pgc", "incomplete")).toEqual({ ok: true });
    expect((await createApplication(db, base({ email: "reject@example.org" }), null)).ok).toBe(true);
  });

  it("reports unknown applications", async () => {
    expect(await approveApplication(db, 999999, "officer@pgc")).toEqual({ ok: false, error: "not_found" });
    expect(await rejectApplication(db, 999999, "officer@pgc")).toEqual({ ok: false, error: "not_found" });
  });
});
