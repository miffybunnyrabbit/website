import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  assertCaseStudiesValid,
  caseStudies,
  orderedCaseStudies,
  REMOVED_CASE_STUDY_SLUGS,
  REQUIRED_CASE_STUDY_SLUGS,
  STAGE_LABELS,
  stageLabel,
  validateCaseStudies,
  type CaseStudy,
} from "./caseStudies";

/** Deep-clone the canonical studies so a test can mutate them safely. */
function cloneStudies(): CaseStudy[] {
  return caseStudies.map((study) => ({
    ...study,
    helixContribution: [...study.helixContribution],
  }));
}

/** `public/logos/`, where every referenced logo file must exist. */
const logoDir = new URL("../../public/logos/", import.meta.url);

describe("caseStudies configuration", () => {
  it("features exactly the five required studies in the recommended order", () => {
    expect(caseStudies.map((s) => s.slug)).toEqual([
      "neara",
      "ferovinum",
      "13sick",
      "origami",
      "veyor",
    ]);
    // Neara and Ferovinum lead (section 8.5).
    expect(caseStudies[0].slug).toBe("neara");
    expect(caseStudies[1].slug).toBe("ferovinum");
  });

  it("renders every required study, in display order", () => {
    const ordered = orderedCaseStudies();
    expect(ordered.map((s) => s.order)).toEqual([...ordered.map((s) => s.order)].sort((a, b) => a - b));
    for (const slug of REQUIRED_CASE_STUDY_SLUGS) {
      expect(ordered.some((s) => s.slug === slug), slug).toBe(true);
    }
    // Ordering is by `order`, not array position, so a reordered array still
    // renders the plan's sequence.
    const shuffled = [...caseStudies].reverse();
    expect(orderedCaseStudies(shuffled).map((s) => s.slug)).toEqual(
      ordered.map((s) => s.slug),
    );
  });

  it("keeps the removed studies out of the collection (§9.6)", () => {
    const slugs = new Set(caseStudies.map((s) => s.slug.toLowerCase()));
    expect(REMOVED_CASE_STUDY_SLUGS.length).toBeGreaterThan(0);
    for (const removed of REMOVED_CASE_STUDY_SLUGS) {
      expect(slugs.has(removed), removed).toBe(false);
    }
  });

  it("uses the brand spelling 'Veyor', not 'Veyordigital'", () => {
    const veyor = caseStudies.find((s) => s.slug === "veyor");
    expect(veyor?.name).toBe("Veyor Digital");
    expect(veyor?.name.toLowerCase()).not.toContain("veyordigital");
  });

  it("does not include Xylo as a case study", () => {
    const slugs = caseStudies.map((s) => s.slug.toLowerCase());
    const names = caseStudies.map((s) => s.name.toLowerCase());
    expect(slugs).not.toContain("xylo");
    expect(names).not.toContain("xylo");
  });

  it("passes its own validation as authored", () => {
    expect(validateCaseStudies()).toEqual([]);
    expect(() => assertCaseStudiesValid()).not.toThrow();
  });

  it("rejects a missing required case study", () => {
    const studies = cloneStudies().filter((s) => s.slug !== "neara");
    const errors = validateCaseStudies(studies);
    expect(errors.some((e) => e.includes('Required case study "neara"'))).toBe(
      true,
    );
  });

  it("rejects duplicate slugs and duplicate orders", () => {
    const studies = cloneStudies();
    studies.push({ ...cloneStudies()[0] });
    const errors = validateCaseStudies(studies);
    expect(errors.some((e) => e.includes("Duplicate case-study slug"))).toBe(
      true,
    );
    expect(errors.some((e) => e.includes("Duplicate case-study order"))).toBe(
      true,
    );
  });

  it("assertCaseStudiesValid throws an aggregated message on bad content", () => {
    const studies = cloneStudies().filter((s) => s.slug !== "neara");
    expect(() => assertCaseStudiesValid(studies)).toThrow(
      /Invalid case-study content/,
    );
  });

  it("maps every engagement stage to a human-facing label", () => {
    // Every stage a study can carry must resolve to a non-empty display tag, so
    // no card can render a blank stage (section 8.5 visual pattern).
    for (const study of caseStudies) {
      expect(stageLabel(study.engagementStage)).toBe(
        STAGE_LABELS[study.engagementStage],
      );
      expect(stageLabel(study.engagementStage).trim().length).toBeGreaterThan(0);
    }
  });

  it("commits every referenced logo file under public/logos/", () => {
    for (const study of caseStudies) {
      const path = fileURLToPath(new URL(study.logo, logoDir));
      expect(existsSync(path), `${study.slug}: missing public/logos/${study.logo}`).toBe(true);
    }
  });
});
