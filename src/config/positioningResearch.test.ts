import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  POSITIONING_RESEARCH_DOC_PATH,
  POSITIONING_RESEARCH_REVIEW,
  assertPositioningResearchValid,
  categoryCliches,
  defensibleDifferences,
  objections,
  positioningSubjects,
  referenceFirms,
  renderPositioningResearchDoc,
  validatePositioningResearch,
  type CategoryCliche,
  type DefensibleDifference,
  type Objection,
} from "./positioningResearch";
import { approvalQueue } from "./approvalQueue";
import { FORBIDDEN_PATTERNS, scanForbiddenCopy } from "./forbiddenCopy";
import { whyHelixPoints } from "./whyHelix";

/** Deep-clone the clichés so a test can mutate them safely. */
function cloneCliches(): CategoryCliche[] {
  return categoryCliches.map((c) => ({ ...c }));
}

/** Deep-clone the differences so a test can mutate them safely. */
function cloneDifferences(): DefensibleDifference[] {
  return defensibleDifferences.map((d) => ({ ...d }));
}

/** Deep-clone the objections so a test can mutate them safely. */
function cloneObjections(): Objection[] {
  return objections.map((o) => ({ ...o }));
}

/** Read the committed generated record relative to this module. */
function readCommittedDoc(): string {
  const path = fileURLToPath(
    new URL(`../../${POSITIONING_RESEARCH_DOC_PATH}`, import.meta.url),
  );
  return readFileSync(path, "utf8");
}

describe("positioning-research record (R-004)", () => {
  it("the live record is valid and complete", () => {
    expect(validatePositioningResearch()).toEqual([]);
    expect(() => assertPositioningResearchValid()).not.toThrow();
  });

  it("covers exactly the five §17.5 subjects in order", () => {
    expect(positioningSubjects.map((s) => s.id)).toEqual([
      "enterprise-value-creation",
      "operating-leverage",
      "performance-linked-fees",
      "venture-building",
      "deep-product-partnership",
    ]);
  });

  it("names five to ten reference firms, each complete", () => {
    expect(referenceFirms.length).toBeGreaterThanOrEqual(5);
    expect(referenceFirms.length).toBeLessThanOrEqual(10);
    for (const firm of referenceFirms) {
      expect(firm.name.trim(), firm.name).toBeTruthy();
      expect(firm.archetype.trim(), firm.name).toBeTruthy();
      expect(firm.languagePattern.trim(), firm.name).toBeTruthy();
      expect(firm.whatToAvoid.trim(), firm.name).toBeTruthy();
    }
  });

  it("is signed off, its governing strategic-copy item having cleared", () => {
    expect(POSITIONING_RESEARCH_REVIEW.status).toBe("approved");
    const governing = approvalQueue.find(
      (q) => q.id === POSITIONING_RESEARCH_REVIEW.governingQueueItem,
    );
    expect(governing?.status).toBe("approved");
  });

  it("tracks sign-off against a real strategic-copy queue item", () => {
    const queueIds = new Set(approvalQueue.map((q) => q.id));
    expect(queueIds.has(POSITIONING_RESEARCH_REVIEW.governingQueueItem)).toBe(true);
  });
});

describe("cross-checks against live artefacts", () => {
  it("every enforced cliché is caught by its named, existing forbiddenCopy rule", () => {
    const patternIds = new Set(FORBIDDEN_PATTERNS.map((p) => p.id));
    for (const c of categoryCliches.filter((x) => x.enforcedBy)) {
      expect(patternIds.has(c.enforcedBy as string), c.id).toBe(true);
      const hits = scanForbiddenCopy(c.probe);
      expect(hits.some((h) => h.id === c.enforcedBy), c.id).toBe(true);
    }
  });

  it("every human-review cliché is deliberately not keyword-enforced", () => {
    for (const c of categoryCliches.filter((x) => !x.enforcedBy)) {
      expect(c.humanReviewReason?.trim(), c.id).toBeTruthy();
      expect(scanForbiddenCopy(c.probe), c.id).toEqual([]);
    }
  });

  it("anchors every difference to a real whyHelix pillar and defends every pillar", () => {
    const pillarIds = new Set(whyHelixPoints.map((p) => p.id));
    for (const diff of defensibleDifferences) {
      expect(pillarIds.has(diff.whyHelixPointId), diff.id).toBe(true);
    }
    const defended = new Set(defensibleDifferences.map((d) => d.whyHelixPointId));
    for (const pillar of whyHelixPoints) {
      expect(defended.has(pillar.id), pillar.id).toBe(true);
    }
  });

  it("stress-tests every subject with at least one objection", () => {
    const challenged = new Set(objections.map((o) => o.subjectId));
    for (const subject of positioningSubjects) {
      expect(challenged.has(subject.id), subject.id).toBe(true);
    }
  });

  it("every Helix-facing response and difference claim ships clean of forbidden copy", () => {
    for (const o of objections) {
      expect(scanForbiddenCopy(o.response), o.id).toEqual([]);
    }
    for (const diff of defensibleDifferences) {
      expect(scanForbiddenCopy(diff.claim), diff.id).toEqual([]);
    }
  });
});

describe("positioning-research validation guards", () => {
  it("fails when a subject is dropped (completeness)", () => {
    const short = positioningSubjects.slice(0, -1);
    expect(validatePositioningResearch(short).join("\n")).toMatch(
      /Expected exactly 5 §17.5 positioning subjects/,
    );
  });

  it("fails when the subjects are reordered", () => {
    const swapped = positioningSubjects.map((s) => ({ ...s }));
    [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
    const errors = validatePositioningResearch(swapped);
    expect(errors.some((e) => e.includes("must be"))).toBe(true);
  });

  it("fails when there are too few reference firms", () => {
    const errors = validatePositioningResearch(
      positioningSubjects,
      referenceFirms.slice(0, 3),
    );
    expect(errors.join("\n")).toMatch(/five to ten reference firms/);
  });

  it("fails when an enforced cliché's rule is removed", () => {
    const withoutWorldClass = FORBIDDEN_PATTERNS.filter(
      (p) => p.id !== "world-class",
    );
    const errors = validatePositioningResearch(
      positioningSubjects,
      referenceFirms,
      categoryCliches,
      defensibleDifferences,
      objections,
      withoutWorldClass,
    );
    expect(errors.join("\n")).toMatch(/world-class/);
  });

  it("fails when a human-review cliché claims a probe that is actually caught", () => {
    const defs = cloneCliches();
    const i = defs.findIndex((c) => c.id === "generic-venture-studio");
    defs[i] = { ...defs[i], probe: "world-class" };
    const errors = validatePositioningResearch(
      positioningSubjects,
      referenceFirms,
      defs,
    );
    expect(errors.join("\n")).toMatch(/documented as human-review but/);
  });

  it("fails when a difference anchors to a non-existent whyHelix pillar", () => {
    const defs = cloneDifferences();
    defs[0] = { ...defs[0], whyHelixPointId: "not-a-pillar" as never };
    const errors = validatePositioningResearch(
      positioningSubjects,
      referenceFirms,
      categoryCliches,
      defs,
    );
    expect(errors.join("\n")).toMatch(/does not exist/);
  });

  it("fails when a whyHelix pillar is left undefended", () => {
    // Drop the difference that defends "operate-from-inside".
    const defs = cloneDifferences().filter(
      (d) => d.whyHelixPointId !== "operate-from-inside",
    );
    const errors = validatePositioningResearch(
      positioningSubjects,
      referenceFirms,
      categoryCliches,
      defs,
    );
    expect(errors.join("\n")).toMatch(/has no defensible difference/);
  });

  it("fails when a subject is left without an objection", () => {
    const objs = cloneObjections().filter(
      (o) => o.subjectId !== "operating-leverage",
    );
    const errors = validatePositioningResearch(
      positioningSubjects,
      referenceFirms,
      categoryCliches,
      defensibleDifferences,
      objs,
    );
    expect(errors.join("\n")).toMatch(/has no objection/);
  });

  it("fails when a response contains a forbidden cliché", () => {
    const objs = cloneObjections();
    objs[0] = {
      ...objs[0],
      response: "We deliver world-class end-to-end solutions.",
    };
    const errors = validatePositioningResearch(
      positioningSubjects,
      referenceFirms,
      categoryCliches,
      defensibleDifferences,
      objs,
    );
    expect(errors.join("\n")).toMatch(/response contains forbidden copy/);
  });

  it("fails when the strategic-copy queue item does not exist", () => {
    const errors = validatePositioningResearch(
      positioningSubjects,
      referenceFirms,
      categoryCliches,
      defensibleDifferences,
      objections,
      FORBIDDEN_PATTERNS,
      whyHelixPoints,
      approvalQueue.filter(
        (q) => q.id !== POSITIONING_RESEARCH_REVIEW.governingQueueItem,
      ),
    );
    expect(errors.join("\n")).toMatch(/not in the approval queue/);
  });
});

describe("generated docs/research/positioning-research.md", () => {
  it("renders with the expected shape", () => {
    const doc = renderPositioningResearchDoc();
    expect(doc).toContain("# Positioning research (R-004)");
    expect(doc).toContain("do not edit by hand");
    expect(doc).toContain("## Subjects researched (§17.5)");
    expect(doc).toContain("## Reference firms and their language patterns");
    expect(doc).toContain("## Category clichés to avoid (§17.5)");
    expect(doc).toContain("## Where Helix has a defensible difference");
    expect(doc).toContain("## Objections and copy responses");
    expect(doc).toMatch(/\n$/);
  });

  it("matches the committed file (no drift)", () => {
    expect(renderPositioningResearchDoc()).toBe(readCommittedDoc());
  });
});
