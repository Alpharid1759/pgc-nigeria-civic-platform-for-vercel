import { NextResponse } from "next/server";
import { getDb, showDemo } from "@/lib/db";
import { one, parsePositiveInt } from "@/lib/format";
import { listScorecards } from "@/lib/scorecards";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const sp = new URL(req.url).searchParams;
  try {
    const items = await listScorecards(
      db,
      {
        year: parsePositiveInt(sp.get("year") ?? undefined),
        quarter: parsePositiveInt(sp.get("quarter") ?? undefined),
        state: one(sp.get("state") ?? undefined),
        office: one(sp.get("office") ?? undefined),
      },
      showDemo(),
    );
    return NextResponse.json({ items }, { headers: { "Cache-Control": "public, max-age=0, s-maxage=120" } });
  } catch (err) {
    console.error("PGC api/scorecards error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}
