import { NextResponse } from "next/server";
import { topLevel } from "@/lib/directory";

export const dynamic = "force-static";

export function GET() {
  const body = topLevel().map((j) => ({ name: j.name, slug: j.slug, level: j.level, code: j.code, url: j.path }));
  return NextResponse.json(body, { headers: { "Cache-Control": "public, max-age=3600" } });
}
