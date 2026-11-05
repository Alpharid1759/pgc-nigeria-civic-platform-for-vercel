import { createHmac, timingSafeEqual } from "node:crypto";
import type { Db } from "@/lib/db";

const DAY_SECONDS = 24 * 60 * 60;

/** Secret used for IP hashing and the form time-trap. Required in production. */
export function getSecret(): string | null {
  const s = process.env.PGC_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV !== "production") return "development-only-secret-not-for-production";
  return null;
}

export function hmac(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

/** Raw IP addresses are never stored, only a salted SHA-256 HMAC. */
export function ipHash(secret: string, ip: string | null | undefined): string | null {
  const clean = (ip ?? "").split(",")[0]?.trim();
  return clean ? hmac(secret, `ip|${clean}`) : null;
}

/** Nigerian phone: 0XXXXXXXXXX or +234XXXXXXXXXX normalised to +234 form, or "" if invalid. */
export function normalisePhone(raw: string | null | undefined): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  let m = /^0([789][01]\d{8})$/.exec(digits);
  if (m) return `+234${m[1]}`;
  m = /^234([789][01]\d{8})$/.exec(digits);
  if (m) return `+234${m[1]}`;
  return "";
}

/** Hidden time-trap value for public forms: "<unix seconds>.<hmac>". */
export function makeTimeTrap(secret: string, nowSeconds: number = Math.floor(Date.now() / 1000)): string {
  return `${nowSeconds}.${hmac(secret, `ts|${nowSeconds}`)}`;
}

export interface SpamInput {
  honeypot: string;
  timeTrap: string;
}

/** Honeypot must be empty, the token must be genuine, and the form must be 4 seconds to 24 hours old. */
export function passesSpamChecks(secret: string, input: SpamInput, nowSeconds: number = Math.floor(Date.now() / 1000)): boolean {
  if (input.honeypot) return false;
  const parts = input.timeTrap.split(".");
  if (parts.length !== 2) return false;
  const [ts, sig] = parts;
  if (!/^\d+$/.test(ts)) return false;
  const expected = hmac(secret, `ts|${ts}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const age = nowSeconds - Number(ts);
  return age >= 4 && age <= DAY_SECONDS;
}

/** Fixed-window rate limit per action and hashed IP. Returns true when the action is allowed. */
export async function rateLimit(
  db: Db,
  action: string,
  hashedIp: string | null,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const key = `${action}|${hashedIp ?? "unknown"}`;
  const res = await db.query<{ count: number }>(
    `INSERT INTO rate_limits (key, count, window_start) VALUES ($1, 1, now())
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2::double precision)
                    THEN 1 ELSE rate_limits.count + 1 END,
       window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2::double precision)
                           THEN now() ELSE rate_limits.window_start END
     RETURNING count`,
    [key, windowSeconds],
  );
  return Number(res.rows[0]?.count ?? 0) <= max;
}

export async function audit(
  db: Db,
  action: string,
  objectType: string | null,
  objectId: number | null,
  context: Record<string, unknown> = {},
  hashedIp: string | null = null,
  actor = "system",
): Promise<void> {
  await db.query(
    "INSERT INTO audit_log (actor, action, object_type, object_id, context, ip_hash) VALUES ($1, $2, $3, $4, $5, $6)",
    [actor, action, objectType, objectId, JSON.stringify(context), hashedIp],
  );
}
