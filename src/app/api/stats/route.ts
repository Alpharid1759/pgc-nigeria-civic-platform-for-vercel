import { NextResponse } from "next/server";
import { getStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getStats(), {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=600" },
  });
}
