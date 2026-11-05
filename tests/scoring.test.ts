import { describe, expect, it } from "vitest";
import { MIN_EVIDENCE_COVERAGE, defaultWeights, funding, grade, overall, quarterLabel, trend } from "@/lib/scoring";

const weights = Object.fromEntries(Object.entries(defaultWeights()).map(([k, v]) => [k, v.weight]));

describe("default weights", () => {
  it("total 100", () => {
    expect(Object.values(weights).reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe("overall", () => {
  it("weights all categories when all have evidence", () => {
    const scores = { A: 80, B: 70, C: 60, D: 50, E: 40, F: 30 };
    expect(overall(scores, weights)).toBe(61.5);
  });

  it("re-normalises over categories with evidence", () => {
    expect(overall({ A: 80, B: 60, C: 100, D: null, E: null, F: null }, weights)).toBe(78.5);
  });

  it("returns null below minimum evidence coverage", () => {
    expect(MIN_EVIDENCE_COVERAGE).toBe(0.6);
    expect(overall({ A: 100, B: 100, C: null, D: null, E: null, F: null }, weights)).toBeNull();
  });

  it("accepts exactly 60% coverage", () => {
    expect(overall({ A: 90, B: 90, C: null, D: null, E: 90, F: null }, weights)).toBe(90);
    expect(overall({ A: 90, B: 90, C: null, D: null, E: null, F: null }, weights)).toBeNull();
  });

  it("clamps scores to 0-100", () => {
    expect(overall({ A: 150, B: -20, C: 100, D: 100, E: 100, F: 100 }, weights)).toBe(80);
  });

  it("returns null when there are no weights", () => {
    expect(overall({ A: 90 }, {})).toBeNull();
  });
});

describe("grade", () => {
  it("maps score bands", () => {
    expect(grade(null)).toBe("Not Yet Rated");
    expect(grade(95)).toBe("Excellent");
    expect(grade(90)).toBe("Excellent");
    expect(grade(89.9)).toBe("Good");
    expect(grade(75)).toBe("Good");
    expect(grade(60)).toBe("Moderate");
    expect(grade(40)).toBe("Below Expectations");
    expect(grade(39.9)).toBe("Poor");
  });
});

describe("trend", () => {
  it("compares current with previous", () => {
    expect(trend(null, 50)).toBe("n/a");
    expect(trend(50, null)).toBe("n/a");
    expect(trend(50.3, 50)).toBe("steady");
    expect(trend(55, 50)).toBe("up");
    expect(trend(45, 50)).toBe("down");
  });
});

describe("funding", () => {
  it("counts only verified revenue after obligations and commitments", () => {
    expect(funding([100, 200], 1000, 300, 200)).toEqual({
      total_project_cost: 300,
      available_development_resources: 500,
      funding_gap: 0,
    });
  });

  it("reports a gap when resources fall short", () => {
    expect(funding([600, 400], 500, 100, 100)).toEqual({
      total_project_cost: 1000,
      available_development_resources: 300,
      funding_gap: 700,
    });
  });

  it("never treats negative resources as available", () => {
    expect(funding([100], 50, 100, 0).funding_gap).toBe(100);
  });
});

describe("quarterLabel", () => {
  it("formats the quarter", () => {
    expect(quarterLabel(2026, 3)).toBe("Q3 2026 (July–September)");
  });
});
