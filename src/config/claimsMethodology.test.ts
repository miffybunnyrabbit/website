import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CLAIMS_METHODOLOGY_DOC_PATH,
  CLAIMS_METHODOLOGY_REVIEW,
  assertClaimsMethodologyValid,
  methodologyDefinitions,
  metricTypeDefinitions,
  renderClaimsMethodologyDoc,
  validateClaimsMethodology,
  type MethodologyDefinition,
} from "./claimsMethodology";
import { decisions } from "./decisions";
import { claimsLedger, type ClaimRecord } from "./claimsLedger";

/** Deep-clone the definitions so a test can mutate them safely. */
function cloneDefs(): MethodologyDefinition[] {
  return methodologyDefinitions.map((d) => ({ ...d }));
}

/** Read the committed generated record relative to this module. */
function readCommittedDoc(): string {
  const path = fileURLToPath(
    new URL(`../../${CLAIMS_METHODOLOGY_DOC_PATH}`, import.meta.url),
  );
  return readFileSync(path, "utf8");
}

describe("claims methodology (R-005)", () => {
  it("the live methodology is valid and complete", () => {
    expect(validateClaimsMethodology()).toEqual([]);
    expect(() => assertClaimsMethodologyValid()).not.toThrow();
  });

  it("documents every §17.6 topic, free of draft markers", () => {
    for (const def of methodologyDefinitions) {
      expect(def.title.trim(), def.id).toBeTruthy();
      expect(def.definition.trim(), def.id).toBeTruthy();
      const lower = def.definition.toLowerCase();
      for (const marker of ["[verify", "[research", "todo", "tbd", "placeholder"]) {
        expect(lower, def.id).not.toContain(marker);
      }
    }
  });

  it("links the three §6 ambiguities it resolves to real decisions", () => {
    const decisionIds = new Set(decisions.map((d) => d.id));
    const governed = new Map(
      methodologyDefinitions
        .filter((d) => d.governingDecision)
        .map((d) => [d.id, d.governingDecision as string]),
    );
    expect(governed.get("currency-treatment")).toBe("D-0001-currency");
    expect(governed.get("enterprise-value-definition")).toBe(
      "D-0002-enterprise-value-terminology",
    );
    expect(governed.get("attribution-standard")).toBe("D-0003-attribution");
    for (const id of governed.values()) {
      expect(decisionIds.has(id), id).toBe(true);
    }
  });

  it("is not yet signed off (working baseline)", () => {
    expect(CLAIMS_METHODOLOGY_REVIEW.status).toBe("pending");
  });
});

describe("metric-type glossary cross-check", () => {
  it("defines every metric type the live claims ledger asserts", () => {
    const defined = new Set(metricTypeDefinitions.map((m) => m.metricType));
    for (const claim of claimsLedger) {
      expect(defined.has(claim.metricType), claim.id).toBe(true);
    }
  });

  it("fails when the ledger asserts an undefined metric type", () => {
    const rogue: ClaimRecord = {
      id: "C-9999-rogue-metric",
      target: { kind: "proof-metric", ref: "enterprise-value" },
      // A metric type with no methodology definition.
      metricType: "value-multiple",
      publishStatus: "researching",
      queueItem: "Q-0007-proof-enterprise-value",
    };
    const withoutMultiple = metricTypeDefinitions.filter(
      (m) => m.metricType !== "value-multiple",
    );
    const errors = validateClaimsMethodology(
      methodologyDefinitions,
      withoutMultiple,
      decisions,
      [rogue],
    );
    expect(errors.join("\n")).toMatch(/does not define/);
  });
});

describe("methodology validation guards", () => {
  it("fails when a topic is missing (R-005 completeness)", () => {
    const short = cloneDefs().slice(0, -1);
    expect(validateClaimsMethodology(short).join("\n")).toMatch(
      /Expected exactly 10 R-005 methodology topics/,
    );
  });

  it("fails when the topics are reordered", () => {
    const swapped = cloneDefs();
    [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
    const errors = validateClaimsMethodology(swapped);
    expect(errors.some((e) => e.includes("must be"))).toBe(true);
  });

  it("fails when a definition loses its text", () => {
    const defs = cloneDefs();
    defs[3] = { ...defs[3], definition: "  " };
    expect(validateClaimsMethodology(defs).join("\n")).toMatch(
      /missing its definition/,
    );
  });

  it("fails when a definition carries a draft marker", () => {
    const defs = cloneDefs();
    defs[3] = { ...defs[3], definition: "TODO: write the real convention." };
    expect(validateClaimsMethodology(defs).join("\n")).toMatch(
      /forbidden draft marker/,
    );
  });

  it("fails when a governing decision does not exist", () => {
    const defs = cloneDefs();
    const i = defs.findIndex((d) => d.id === "currency-treatment");
    defs[i] = { ...defs[i], governingDecision: "D-9999-nonexistent" };
    expect(validateClaimsMethodology(defs).join("\n")).toMatch(
      /must be governed by decision "D-0001-currency"/,
    );
  });
});

describe("generated docs/research/claims-methodology.md", () => {
  it("renders with the expected shape", () => {
    const doc = renderClaimsMethodologyDoc();
    expect(doc).toContain("# Claims methodology (R-005)");
    expect(doc).toContain("do not edit by hand");
    expect(doc).toContain("## Definitions");
    expect(doc).toContain("## Metric-type glossary");
    expect(doc).toMatch(/\n$/);
  });

  it("matches the committed file (no drift)", () => {
    expect(renderClaimsMethodologyDoc()).toBe(readCommittedDoc());
  });
});
