import { describe, expect, it } from "vitest";
import {
  assertWhyHelixValid,
  validateWhyHelix,
  whyHelixCopy,
  whyHelixPoints,
  type WhyHelixPoint,
} from "./whyHelix";
import { howWeWorkSteps } from "./howWeWork";

/** Deep-clone the canonical points so a test can mutate them safely. */
function clonePoints(): WhyHelixPoint[] {
  return whyHelixPoints.map((p) => ({
    ...p,
    requiredConcepts: [...p.requiredConcepts],
  }));
}

describe("whyHelix configuration", () => {
  it("has exactly the three proof points in order", () => {
    expect(whyHelixPoints).toHaveLength(3);
    expect(whyHelixPoints.map((p) => p.id)).toEqual([
      "take-a-position",
      "share-risk-and-upside",
      "operate-from-inside",
    ]);
  });

  it("keeps the 'different because' eyebrow framing", () => {
    expect(whyHelixCopy.eyebrow).toMatch(/different\s+because/i);
    expect(whyHelixCopy.headline.trim()).not.toBe("");
    expect(whyHelixCopy.intro.trim()).not.toBe("");
  });

  it("passes its own validation as authored", () => {
    expect(validateWhyHelix()).toEqual([]);
    expect(() => assertWhyHelixValid()).not.toThrow();
  });

  it("expresses every required concept in its point copy", () => {
    for (const point of whyHelixPoints) {
      const haystack = `${point.title} ${point.body}`.toLowerCase();
      for (const concept of point.requiredConcepts) {
        expect(haystack).toContain(concept.toLowerCase());
      }
    }
  });

  it("stays distinct from the 'How we work' operating stages", () => {
    const stageBodies = new Set(howWeWorkSteps.map((s) => s.body));
    for (const point of whyHelixPoints) {
      expect(stageBodies.has(point.body)).toBe(false);
    }
  });
});

describe("validateWhyHelix guardrails", () => {
  it("rejects a missing proof point", () => {
    const points = clonePoints().slice(0, 2);
    const errors = validateWhyHelix(points);
    expect(errors.some((e) => e.includes("exactly 3 proof points"))).toBe(true);
  });

  it("rejects a reordered proof point", () => {
    const points = clonePoints();
    [points[0], points[1]] = [points[1], points[0]];
    const errors = validateWhyHelix(points);
    expect(errors.some((e) => e.includes('must be "take-a-position"'))).toBe(
      true,
    );
  });

  it("rejects dropping a required concept from a point", () => {
    const points = clonePoints();
    points[1] = {
      ...points[1],
      title: "We share the risk and the reward.",
      body: "We charge a fixed fee and move on to the next client.",
    };
    const errors = validateWhyHelix(points);
    expect(
      errors.some((e) => e.includes('must express the concept "upside"')),
    ).toBe(true);
  });

  it("rejects a repurposed eyebrow that drops the framing", () => {
    const errors = validateWhyHelix(whyHelixPoints, {
      ...whyHelixCopy,
      eyebrow: "OUR APPROACH",
    });
    expect(errors.some((e) => e.includes('"different because" framing'))).toBe(
      true,
    );
  });

  it("rejects forbidden copy in the section", () => {
    const points = clonePoints();
    points[0] = {
      ...points[0],
      body: "We deliver world-class end-to-end solutions, forming our own view of scope.",
    };
    const errors = validateWhyHelix(points);
    expect(errors.some((e) => e.includes("forbidden copy"))).toBe(true);
  });

  it("rejects a draft marker left in a point", () => {
    const points = clonePoints();
    points[2] = { ...points[2], title: "We operate from inside the team (TBD)." };
    const errors = validateWhyHelix(points);
    expect(errors.some((e) => e.includes("draft marker"))).toBe(true);
  });

  it("rejects a point that reuses a 'How we work' stage body verbatim", () => {
    const points = clonePoints();
    // Lift stage two's body wholesale — this is exactly the collapse P4-003 bans.
    points[1] = { ...points[1], body: howWeWorkSteps[1].body };
    const errors = validateWhyHelix(points);
    expect(
      errors.some((e) => e.includes('reuses a "How we work" stage\'s body')),
    ).toBe(true);
  });

  it("rejects a point that reuses a 'How we work' stage heading verbatim", () => {
    const points = clonePoints();
    points[0] = { ...points[0], title: howWeWorkSteps[0].title };
    const errors = validateWhyHelix(points);
    expect(
      errors.some((e) => e.includes('reuses a "How we work" stage\'s heading')),
    ).toBe(true);
  });

  it("assertWhyHelixValid throws an aggregated message on bad config", () => {
    const points = clonePoints().slice(0, 1);
    expect(() => assertWhyHelixValid(points)).toThrow(
      /Invalid "We're different because/,
    );
  });
});
