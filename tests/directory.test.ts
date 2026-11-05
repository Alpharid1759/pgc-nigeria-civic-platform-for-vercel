import { describe, expect, it } from "vitest";
import raw from "@/data/nigeria-directory.json";
import { children, counts, findChild, findTop, slugify, topLevel } from "@/lib/directory";

describe("directory data", () => {
  it("matches the expected national totals", () => {
    const c = counts();
    expect(c.states).toBe(36);
    expect(c.fct).toBe(1);
    expect(c.lgas).toBe(768);
    expect(c.area_councils).toBe(6);
    expect(c.states + c.fct).toBe(37);
  });

  it("agrees with the expected figures declared in the data file", () => {
    const expected = (raw as { _meta: { expected: Record<string, number> } })._meta.expected;
    const c = counts();
    expect(c.states).toBe(expected.states);
    expect(c.fct).toBe(expected.fct);
    expect(c.lgas).toBe(expected.lgas);
    expect(c.area_councils).toBe(expected.area_councils);
  });

  it("has unique state slugs and unique child slugs within each parent", () => {
    const top = topLevel();
    expect(new Set(top.map((j) => j.slug)).size).toBe(top.length);
    for (const t of top) {
      const kids = children(t.slug);
      expect(new Set(kids.map((k) => k.slug)).size).toBe(kids.length);
    }
  });

  it("lets same-named LGAs exist under different states", () => {
    expect(findChild("benue", "obi")).toBeDefined();
    expect(findChild("nasarawa", "obi")).toBeDefined();
    expect(findChild("benue", "obi")?.path).toBe("/states/benue/obi");
    expect(findChild("nasarawa", "obi")?.path).toBe("/states/nasarawa/obi");
  });

  it("serves the FCT area councils at the expected URL", () => {
    expect(findTop("abuja-fct")?.level).toBe("fct");
    expect(findChild("abuja-fct", "gwagwalada")?.path).toBe("/states/abuja-fct/gwagwalada");
  });

  it("builds Makurdi under Benue", () => {
    expect(findChild("benue", "makurdi")?.path).toBe("/states/benue/makurdi");
  });
});

describe("slugify", () => {
  it("normalises punctuation", () => {
    expect(slugify("Urue-Offong/Oruko")).toBe("urue-offong-oruko");
    expect(slugify("Jama'are")).toBe("jama-are");
  });
});
