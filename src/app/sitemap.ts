import type { MetadataRoute } from "next";
import { topLevel } from "@/lib/directory";
import { PENDING_MODULES, SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const fixed = ["/", "/states", "/constitution", "/methodology", "/contact", ...PENDING_MODULES.map((m) => `/${m.slug}`)];
  const states = topLevel().map((j) => j.path);
  return [...fixed, ...states].map((path) => ({ url: `${SITE_URL}${path}` }));
}
