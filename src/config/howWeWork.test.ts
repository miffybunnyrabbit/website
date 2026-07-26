import { describe, expect, it } from "vitest";
import {
  assertHowWeWorkValid,
  howWeWorkCopy,
  howWeWorkSteps,
  validateHowWeWork,
  type HowWeWorkStep,
} from "./howWeWork";

/** Deep-clone the canonical steps so a test can mutate them safely. */
function cloneSteps(): HowWeWorkStep[] {
  return howWeWorkSteps.map((step) => ({
    ...step,
    requiredConcepts: [...step.requiredConcepts],
  }));
}

describe("howWeWork configuration", () => {
  it("has exactly four stages in the fixed operating order", () => {
    expect(howWeWorkSteps).toHaveLength(4);
    expect(howWeWorkSteps.map((s) => s.id)).toEqual([
      "build-case",
      "align-incentives",
      "deliver",
      "sustain-and-realise",
    ]);
    expect(howWeWorkSteps.map((s) => s.number)).toEqual([
      "01",
      "02",
      "03",
      "04",
    ]);
  });

  it("passes its own validation as authored", () => {
    expect(validateHowWeWork()).toEqual([]);
    expect(() => assertHowWeWorkValid()).not.toThrow();
  });

  it("uses a single closing line, not both alternatives at equal weight", () => {
    // The simplest-version alternative doubles as the headline; the closing
    // line must not simply repeat it (section 11.5).
    expect(howWeWorkCopy.closing).not.toEqual(howWeWorkCopy.headline);
    expect(howWeWorkCopy.headline).toContain("MONEY WHERE OUR MOUTH");
  });
});

describe("validateHowWeWork guardrails", () => {
  it("rejects a configuration that is not exactly four stages", () => {
    const short = cloneSteps().slice(0, 3);
    const errors = validateHowWeWork(short);
    expect(errors.some((e) => e.includes("exactly 4"))).toBe(true);
  });

  it("rejects a changed stage order", () => {
    const steps = cloneSteps();
    [steps[0], steps[1]] = [steps[1], steps[0]];
    const errors = validateHowWeWork(steps);
    expect(errors.some((e) => e.includes('must be "build-case"'))).toBe(true);
  });

  it("rejects a mismatched stage number", () => {
    const steps = cloneSteps();
    steps[2].number = "01";
    const errors = validateHowWeWork(steps);
    expect(errors.some((e) => e.includes('numbered "03"'))).toBe(true);
  });

  it("rejects stage one when it drops the self-funded preparation concept", () => {
    const steps = cloneSteps();
    steps[0].body = "We build a case for where enterprise value can be created.";
    const errors = validateHowWeWork(steps);
    expect(errors.some((e) => e.includes('"own cost"'))).toBe(true);
  });

  it("rejects stage two when it drops back-end upside", () => {
    const steps = cloneSteps();
    steps[1].body =
      "We agree the objectives and pricing, are paid as we deliver, and align with the board.";
    const errors = validateHowWeWork(steps);
    expect(errors.some((e) => e.includes('"back-end upside"'))).toBe(true);
  });

  it("rejects stage four when it drops gain-share realisation", () => {
    const steps = cloneSteps();
    steps[3].body =
      "We build capability the business can sustain without us, then plan a clean exit.";
    const errors = validateHowWeWork(steps);
    expect(errors.some((e) => e.includes('"gain-share"'))).toBe(true);
  });

  it("rejects a missing title or body", () => {
    const steps = cloneSteps();
    steps[0].title = "   ";
    steps[1].body = "";
    const errors = validateHowWeWork(steps);
    expect(errors.some((e) => e.includes("missing a title"))).toBe(true);
    expect(errors.some((e) => e.includes("missing body copy"))).toBe(true);
  });

  it("rejects draft markers left in production copy", () => {
    const steps = cloneSteps();
    steps[2].body = `DRAFT — NOT FOR PUBLICATION. ${steps[2].body}`;
    const errors = validateHowWeWork(steps);
    expect(errors.some((e) => e.includes("draft marker"))).toBe(true);
  });

  it("assertHowWeWorkValid throws with an aggregated message on bad config", () => {
    const steps = cloneSteps().slice(0, 2);
    expect(() => assertHowWeWorkValid(steps)).toThrow(
      /Invalid "How we work" configuration/,
    );
  });
});
