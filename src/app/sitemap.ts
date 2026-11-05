import type { MetadataRoute } from "next";
import { topLevel } from "@/lib/directory";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const fixed = ["/", "/states", "/constitution", "/methodology", "/contact", "/projects", "/scorecards", "/dashboard", "/membership"];
  const states = topLevel().map((j) => j.path);
  return [...fixed, ...states].map((path) => ({ url: `${SITE_URL}${path}` }));
}
