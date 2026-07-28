import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DOSSIER_DOC_DIR,
  assertCaseStudyDossiersValid,
  caseStudyDossiers,
  dossierFilename,
  dossierForStudy,
  renderDossierMarkdown,
  validateCaseStudyDossiers,
  type CaseStudyDossier,
} from "./caseStudyDossiers";
import {
  REQUIRED_CASE_STUDY_SLUGS,
  caseStudies,
  type CaseStudy,
} from "./caseStudies";

/** Read a committed generated dossier relative to this module. */
function readCommittedDossier(dossier: CaseStudyDossier): string {
  const path = fileURLToPath(
    new URL(`../../${DOSSIER_DOC_DIR}/${dossierFilename(dossier)}`, import.meta.url),
  );
  return readFileSync(path, "utf8");
}

/** Deep-clone the dossiers so a test can mutate one safely. */
function cloneDossiers(): CaseStudyDossier[] {
  return caseStudyDossiers.map((d) => ({
    ...d,
    contribution: { ...d.contribution },
    publicSources: [...d.publicSources],
  }));
}

/** Deep-clone the case studies so a test can flip one's publish flag. */
function cloneStudies(): CaseStudy[] {
  return caseStudies.map((s) => ({
    ...s,
    helixContribution: [...s.helixContribution],
    claimIds: [...s.claimIds],
  }));
}

describe("caseStudyDossiers model", () => {
  it("is well-formed and complete against the live models", () => {
    expect(validateCaseStudyDossiers()).toEqual([]);
    expect(() => assertCaseStudyDossiersValid()).not.toThrow();
  });

  it("has exactly one dossier per required case study", () => {
    const slugs = caseStudyDossiers.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(slugs)).toEqual(new Set(REQUIRED_CASE_STUDY_SLUGS));
  });

  it("only documents studies that exist in the collection", () => {
    for (const dossier of caseStudyDossiers) {
      expect(dossierForStudy(dossier.slug)).toBe(dossier);
      expect(caseStudies.some((s) => s.slug === dossier.slug)).toBe(true);
    }
  });

  it("fills every Helix-contribution bucket", () => {
    for (const dossier of caseStudyDossiers) {
      for (const value of Object.values(dossier.contribution)) {
        expect(value.trim()).not.toBe("");
      }
    }
  });

  it("uses only HTTPS public sources", () => {
    for (const dossier of caseStudyDossiers) {
      for (const url of dossier.publicSources) {
        expect(url).toMatch(/^https:\/\//);
      }
    }
  });
});

describe("validateCaseStudyDossiers — completeness and integrity", () => {
  it("flags a missing dossier for a required study", () => {
    const dossiers = cloneDossiers().filter((d) => d.slug !== "neara");
    const errors = validateCaseStudyDossiers(dossiers);
    expect(errors.some((e) => e.includes("neara") && e.includes("no research dossier"))).toBe(true);
  });

  it("rejects a duplicate dossier", () => {
    const dossiers = cloneDossiers();
    dossiers.push({ ...dossiers[0] });
    const errors = validateCaseStudyDossiers(dossiers);
    expect(errors.some((e) => e.includes("Duplicate dossier"))).toBe(true);
  });

  it("rejects a dossier for a removed case study (Xylo)", () => {
    const dossiers = cloneDossiers();
    dossiers.push({ ...dossiers[0], slug: "xylo" });
    const errors = validateCaseStudyDossiers(dossiers);
    expect(errors.some((e) => e.includes("xylo") && e.includes("removed"))).toBe(true);
  });

  it("rejects a dossier for an unknown case study", () => {
    const dossiers = cloneDossiers();
    dossiers.push({ ...dossiers[0], slug: "not-a-study" });
    const errors = validateCaseStudyDossiers(dossiers);
    expect(errors.some((e) => e.includes("not-a-study") && e.includes("unknown"))).toBe(true);
  });

  it("flags an empty required narrative field", () => {
    const dossiers = cloneDossiers();
    dossiers[0].attributionLanguage = "  ";
    const errors = validateCaseStudyDossiers(dossiers);
    expect(errors.some((e) => e.includes("attributionLanguage"))).toBe(true);
  });

  it("flags an empty contribution bucket", () => {
    const dossiers = cloneDossiers();
    dossiers[0].contribution.technology = "";
    const errors = validateCaseStudyDossiers(dossiers);
    expect(errors.some((e) => e.includes("Technology"))).toBe(true);
  });

  it("rejects a non-HTTPS public source", () => {
    const dossiers = cloneDossiers();
    dossiers[0].publicSources = ["http://insecure.example.com"];
    const errors = validateCaseStudyDossiers(dossiers);
    expect(errors.some((e) => e.includes("not an HTTPS URL"))).toBe(true);
  });

  it("enforces the R-007 gate: a published study must have a dossier", () => {
    const studies = cloneStudies().map((s) =>
      s.slug === "neara" ? { ...s, publish: true } : s,
    );
    const withoutNeara = cloneDossiers().filter((d) => d.slug !== "neara");
    const errors = validateCaseStudyDossiers(withoutNeara, studies);
    expect(errors.some((e) => e.includes("published but has no research dossier"))).toBe(true);
  });
});

describe("renderDossierMarkdown", () => {
  it("derives the study name, proposed claim, and draft copy from the live model", () => {
    const neara = dossierForStudy("neara")!;
    const md = renderDossierMarkdown(neara);
    expect(md.startsWith("# Neara\n")).toBe(true);
    expect(md).toContain("FROM IDEA TO A$1B+");
    expect(md).toContain(
      "Helix helped shape the core technology and early business development",
    );
  });

  it("lists the backing claim IDs derived from the ledger", () => {
    const neara = dossierForStudy("neara")!;
    expect(renderDossierMarkdown(neara)).toContain("C-0001-neara-enterprise-value");
  });

  it("includes every §17.8 template heading", () => {
    const md = renderDossierMarkdown(caseStudyDossiers[0]);
    for (const heading of [
      "## Proposed public claim",
      "## Why this case belongs on the site",
      "## Engagement timeline",
      "## Starting state",
      "## End-of-engagement state",
      "## Current state",
      "## Helix contribution",
      "## Valuation or value evidence",
      "## Calculation",
      "## Currency treatment",
      "## Attribution language",
      "## Public sources",
      "## Internal sources",
      "## Asset permissions",
      "## Client approval",
      "## Risks or prohibited wording",
      "## Draft copy",
      "## Approval record",
    ]) {
      expect(md).toContain(heading);
    }
  });

  it("renders the internal-sources caution and never invents a source", () => {
    const origami = dossierForStudy("origami")!;
    const md = renderDossierMarkdown(origami);
    expect(md).toContain("Do not commit sensitive source files.");
    // Origami has only internal evidence — no public sources fabricated.
    expect(md).toContain("None documented — internal evidence only.");
  });

  it("ends with a single trailing newline", () => {
    const md = renderDossierMarkdown(caseStudyDossiers[0]);
    expect(md.endsWith("\n")).toBe(true);
    expect(md.endsWith("\n\n")).toBe(false);
  });

  it("matches every committed docs/research/case-studies/<slug>.md (no drift)", () => {
    for (const dossier of caseStudyDossiers) {
      expect(renderDossierMarkdown(dossier)).toBe(readCommittedDossier(dossier));
    }
  });
});
