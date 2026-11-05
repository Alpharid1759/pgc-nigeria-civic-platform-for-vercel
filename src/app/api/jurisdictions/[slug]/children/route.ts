import { NextResponse } from "next/server";
import { children, findTop, topLevel } from "@/lib/directory";

export const dynamicParams = false;

export function generateStaticParams() {
  return topLevel().map((j) => ({ slug: j.slug }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const parent = findTop(slug);
  if (!parent) {
    return NextResponse.json({ error: "Unknown jurisdiction." }, { status: 404 });
  }
  const body = children(slug).map((j) => ({ name: j.name, slug: j.slug, level: j.level, code: j.code, url: j.path }));
  return NextResponse.json(body, { headers: { "Cache-Control": "public, max-age=3600" } });
}
