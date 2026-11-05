import { NextResponse } from "next/server";
import { getDb, showDemo } from "@/lib/db";
import { one, parsePositiveInt } from "@/lib/format";
import { listProjects } from "@/lib/projects";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const sp = new URL(req.url).searchParams;
  try {
    const out = await listProjects(
      db,
      {
        state: one(sp.get("state") ?? undefined),
        lga: one(sp.get("lga") ?? undefined),
        sector: one(sp.get("sector") ?? undefined),
        status: one(sp.get("status") ?? undefined),
        page: parsePositiveInt(sp.get("page") ?? undefined) ?? 1,
      },
      showDemo(),
    );
    return NextResponse.json(out, { headers: { "Cache-Control": "public, max-age=0, s-maxage=120" } });
  } catch (err) {
    console.error("PGC api/projects error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}
