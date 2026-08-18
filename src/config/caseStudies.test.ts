import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  assertCaseStudiesValid,
  caseStudies,
  looksQuantified,
  publishedCaseStudies,
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
    claimIds: [...study.claimIds],
  }));
}

/**
 * Return a fully-publishable version of one study so a test can flip a single
 * gate and prove that gate is what fails. Mirrors an entry that has cleared all
 * of its section-9 research and approval gates.
 */
function approvedStudy(slug: string): CaseStudy {
  const base = cloneStudies().find((s) => s.slug === slug);
  if (!base) throw new Error(`no such study: ${slug}`);
  return {
    ...base,
    publish: true,
    approvalStatus: "approved",
    clientApproval: "approved",
    assetApproval: "approved",
    outcomeHeadline: "FROM IDEA TO A$1B+",
    currentOutcome: undefined,
    valueMultiple: undefined,
    valueCreated: undefined,
    summary: "Helix shaped the core technology and early business development.",
    helixContribution: ["Shaped the core technology."],
    claimIds: ["CLAIM-NEARA-001"],
  };
}

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

  it("publishes the owner-approved studies; the rest stay gated", () => {
    // Neara and 13SICK cleared Q-0001/Q-0003 on 2026-08-03. On 2026-08-18 the
    // owner verified Ferovinum's figures (Q-0002) and directed Origami and Veyor
    // to publish qualitatively, so all five now render; none may still be
    // publishing while its approval status says otherwise.
    const published = caseStudies.filter((s) => s.publish).map((s) => s.slug).sort();
    expect(published).toEqual([
      "13sick",
      "ferovinum",
      "neara",
      "origami",
      "veyor",
    ]);
    for (const s of caseStudies.filter((s) => s.publish)) {
      expect(s.approvalStatus, s.slug).toBe("approved");
    }
  });

  it("lets a card carry quantified copy only when claim IDs back it", () => {
    // The rule that survives every approval round: quantified copy and claim IDs
    // travel together. A card with no claim IDs must carry no multiple, no value
    // created, and no figure in its headline, summary, or contribution lines;
    // a card with figures must cite the ledger entries that verified them.
    for (const study of caseStudies) {
      const quantified = [
        study.outcomeHeadline,
        study.currentOutcome ?? "",
        study.valueMultiple ?? "",
        study.valueCreated ?? "",
        study.summary,
        ...study.helixContribution,
      ].filter((f) => looksQuantified(f));
      if (study.claimIds.length === 0) {
        expect(quantified, study.slug).toEqual([]);
      }
    }
  });

  it("names a currency on every per-study figure (D-0001)", () => {
    // D-0001 reserves the unqualified `$` for the deliberately currency-neutral
    // portfolio aggregate. A per-study value-created figure must therefore say
    // which currency it is in — A$, US$, £, or € — never a bare $. Ferovinum
    // briefly published a bare `$300m` before the owner named it GBP; this is
    // the guard that would have caught it.
    for (const study of caseStudies) {
      const figure = study.valueCreated;
      if (!figure || !looksQuantified(figure)) continue;
      expect(study.currency, study.slug).not.toBe("undecided");
      expect(figure, study.slug).not.toMatch(/(^|[^A-Za-z$])\$\d/);
    }
  });

  it("passes its own validation as authored", () => {
    expect(validateCaseStudies()).toEqual([]);
    expect(() => assertCaseStudiesValid()).not.toThrow();
  });

  it("returns the approved, published entries in order", () => {
    expect(publishedCaseStudies().map((s) => s.slug)).toEqual([
      "neara",
      "ferovinum",
      "13sick",
      "origami",
      "veyor",
    ]);
  });

  it("keeps the required and removed slug lists disjoint", () => {
    for (const removed of REMOVED_CASE_STUDY_SLUGS) {
      expect(REQUIRED_CASE_STUDY_SLUGS).not.toContain(removed);
    }
  });
});

describe("looksQuantified", () => {
  it("detects currency amounts and multiples", () => {
    expect(looksQuantified("FROM IDEA TO A$1B+")).toBe(true);
    expect(looksQuantified("$300m created")).toBe(true);
    expect(looksQuantified("approximately 20× growth")).toBe(true);
    expect(looksQuantified("5x value")).toBe(true);
  });

  it("does not flag unquantified prose", () => {
    expect(looksQuantified("FROM IDEA TO A GLOBAL CAPITAL PLATFORM")).toBe(
      false,
    );
    expect(looksQuantified("Helix shaped the core technology.")).toBe(false);
  });
});

describe("validateCaseStudies guardrails", () => {
  it("rejects a missing required case study", () => {
    const studies = cloneStudies().filter((s) => s.slug !== "neara");
    const errors = validateCaseStudies(studies);
    expect(errors.some((e) => e.includes('Required case study "neara"'))).toBe(
      true,
    );
  });

  it("rejects a removed case study reappearing", () => {
    const studies = cloneStudies();
    studies.push({
      ...approvedStudy("neara"),
      name: "Xylo",
      slug: "xylo",
      order: 99,
      publish: false,
    });
    const errors = validateCaseStudies(studies);
    expect(errors.some((e) => e.includes("Xylo") && e.includes("removed"))).toBe(
      true,
    );
  });

  it("rejects a removed study matched by name even under a different slug", () => {
    const studies = cloneStudies();
    studies.push({
      ...approvedStudy("neara"),
      name: "Xylo",
      slug: "xylo-inc",
      order: 98,
      publish: false,
    });
    const errors = validateCaseStudies(studies);
    expect(errors.some((e) => e.includes("removed"))).toBe(true);
  });

  it("rejects a publish:true study that is not approved", () => {
    const studies = cloneStudies();
    const idx = studies.findIndex((s) => s.slug === "neara");
    studies[idx] = { ...approvedStudy("neara"), approvalStatus: "researching" };
    const errors = validateCaseStudies(studies);
    expect(
      errors.some(
        (e) => e.includes("neara") && e.includes("approval status"),
      ),
    ).toBe(true);
  });

  it("rejects a published study with pending client approval", () => {
    const studies = cloneStudies();
    const idx = studies.findIndex((s) => s.slug === "neara");
    studies[idx] = { ...approvedStudy("neara"), clientApproval: "pending" };
    const errors = validateCaseStudies(studies);
    expect(
      errors.some((e) => e.includes("client approval is still pending")),
    ).toBe(true);
  });

  it("rejects a published study with unapproved assets", () => {
    const studies = cloneStudies();
    const idx = studies.findIndex((s) => s.slug === "neara");
    studies[idx] = { ...approvedStudy("neara"), assetApproval: "pending" };
    const errors = validateCaseStudies(studies);
    expect(errors.some((e) => e.includes("asset approval"))).toBe(true);
  });

  it("rejects a published quantified claim with no claim IDs", () => {
    const studies = cloneStudies();
    const idx = studies.findIndex((s) => s.slug === "neara");
    studies[idx] = { ...approvedStudy("neara"), claimIds: [] };
    const errors = validateCaseStudies(studies);
    expect(
      errors.some((e) => e.includes("quantified claim") && e.includes("neara")),
    ).toBe(true);
  });

  it("allows a published study whose copy carries no quantified claim without claim IDs", () => {
    const studies = cloneStudies();
    const idx = studies.findIndex((s) => s.slug === "neara");
    studies[idx] = {
      ...approvedStudy("neara"),
      outcomeHeadline: "FROM IDEA TO A GLOBAL PLATFORM",
      claimIds: [],
    };
    const errors = validateCaseStudies(studies);
    expect(errors.some((e) => e.includes("quantified claim"))).toBe(false);
  });

  it("rejects a published study that still carries a [VERIFY:] placeholder", () => {
    const studies = cloneStudies();
    const idx = studies.findIndex((s) => s.slug === "neara");
    studies[idx] = {
      ...approvedStudy("neara"),
      summary: "Value grew [VERIFY: 20×] during the engagement.",
      claimIds: ["CLAIM-NEARA-001"],
    };
    const errors = validateCaseStudies(studies);
    expect(errors.some((e) => e.includes("placeholder"))).toBe(true);
  });

  it("rejects a published study that does not say what Helix did", () => {
    const studies = cloneStudies();
    const idx = studies.findIndex((s) => s.slug === "neara");
    studies[idx] = { ...approvedStudy("neara"), helixContribution: [] };
    const errors = validateCaseStudies(studies);
    expect(
      errors.some((e) => e.includes("what Helix actually did")),
    ).toBe(true);
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

  it("lets an unpublished draft keep its placeholders and pending approvals", () => {
    // The canonical collection is entirely unpublished drafts and must pass.
    expect(validateCaseStudies(cloneStudies())).toEqual([]);
  });

  it("assertCaseStudiesValid throws an aggregated message on bad content", () => {
    const studies = cloneStudies().filter((s) => s.slug !== "neara");
    expect(() => assertCaseStudiesValid(studies)).toThrow(
      /Invalid case-study content/,
    );
  });

  it("accepts a fully-approved, well-formed published study", () => {
    const studies = cloneStudies();
    const idx = studies.findIndex((s) => s.slug === "neara");
    studies[idx] = approvedStudy("neara");
    expect(validateCaseStudies(studies)).toEqual([]);
    expect(publishedCaseStudies(studies).map((s) => s.slug)).toEqual([
      "neara",
      "ferovinum",
      "13sick",
      "origami",
      "veyor",
    ]);
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

  it("uses the plan's `0 → 1 → 10` worked example as a stage label", () => {
    expect(stageLabel("0-to-1-to-10")).toBe("0 → 1 → 10");
    expect(stageLabel("0-to-1")).toBe("0 → 1");
    expect(stageLabel("scale")).toBe("Scale");
  });
});

describe("case-study logo assets", () => {
  // `CaseStudies.astro` renders `/logos/<study.logo>` verbatim, so a logo
  // filename that names a file not committed under public/logos/ ships a broken
  // image the moment a study publishes. `publishedAssets` only gates the assets
  // of *published* studies, and every study is `publish: false` today — so that
  // gate is silent about drift here. This gate is publish-state-independent:
  // it caught the Q-0006 flip that renamed the committed assets to `.png`
  // (logos.ts was updated; these `logo:` fields were left naming `.svg`).
  const logoDir = new URL("../../public/logos/", import.meta.url);

  it("commits every referenced logo file under public/logos/", () => {
    for (const study of caseStudies) {
      const path = fileURLToPath(new URL(study.logo, logoDir));
      expect(existsSync(path), `${study.slug}: missing public/logos/${study.logo}`).toBe(true);
    }
  });
});
