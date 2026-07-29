import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DESIGN_TOKENS_DOC_PATH,
  DESIGN_TOKENS_REVIEW,
  FONT_TOKEN_NAMES,
  GOVERNING_DECISION_ID,
  OMITTED_CATEGORIES,
  PROVENANCE_VALUES,
  assertDesignTokensRecordValid,
  renderDesignTokensDoc,
  tokenProvenance,
  validateDesignTokensRecord,
  type TokenProvenance,
} from "./designTokensRecord";
import { REQUIRED_BRAND_COLORS, allTokens } from "./designTokens";
import { decisions } from "./decisions";

/** Deep-clone the provenance list so a test can mutate it safely. */
function cloneProvenance(): TokenProvenance[] {
  return tokenProvenance.map((p) => ({ ...p }));
}

/** Read the committed generated record relative to this module. */
function readCommittedDoc(): string {
  const path = fileURLToPath(
    new URL(`../../${DESIGN_TOKENS_DOC_PATH}`, import.meta.url),
  );
  return readFileSync(path, "utf8");
}

describe("design-token inventory (R-002)", () => {
  it("the live record is valid and complete", () => {
    expect(validateDesignTokensRecord()).toEqual([]);
    expect(() => assertDesignTokensRecordValid()).not.toThrow();
  });

  it("covers exactly the live designTokens.ts token set, once each", () => {
    const documented = tokenProvenance.map((p) => p.name).sort();
    const live = allTokens()
      .map((t) => t.name)
      .sort();
    expect(documented).toEqual(live);
    expect(new Set(documented).size).toBe(documented.length);
  });

  it("classifies every token with a valid provenance and a note", () => {
    for (const entry of tokenProvenance) {
      expect(PROVENANCE_VALUES, entry.name).toContain(entry.provenance);
      expect(entry.note.trim(), entry.name).toBeTruthy();
      const lower = entry.note.toLowerCase();
      for (const marker of ["[verify", "[research", "todo", "tbd", "placeholder"]) {
        expect(lower, entry.name).not.toContain(marker);
      }
    }
  });

  it("catches a live token with no provenance entry", () => {
    // Drop the focus colour from the inventory: it is still a live token.
    const trimmed = cloneProvenance().filter((p) => p.name !== "--color-focus");
    const errors = validateDesignTokensRecord(trimmed);
    expect(errors.join("\n")).toContain("exactly the live designTokens.ts tokens");
    expect(errors.join("\n")).toContain("--color-focus");
  });

  it("catches a provenance entry for a token that no longer exists", () => {
    const extra = cloneProvenance();
    extra.push({ name: "--color-ghost", provenance: "new", note: "not a real token" });
    const errors = validateDesignTokensRecord(extra);
    expect(errors.join("\n")).toContain("--color-ghost");
    expect(errors.join("\n")).toContain("Extra");
  });

  it("catches a duplicate provenance entry", () => {
    const dup = cloneProvenance();
    dup.push({ ...dup[0] });
    const errors = validateDesignTokensRecord(dup);
    expect(errors.join("\n")).toContain("duplicate");
  });

  it("refuses to call a brand colour newly introduced", () => {
    const p = cloneProvenance();
    const mint = p.find((e) => e.name === "--color-helix-mint")!;
    mint.provenance = "new";
    const errors = validateDesignTokensRecord(p);
    expect(errors.join("\n")).toContain("must be \"exact\" or \"approximated\"");
    // Every required brand colour is inventoried.
    for (const name of Object.keys(REQUIRED_BRAND_COLORS)) {
      expect(tokenProvenance.some((e) => e.name === name), name).toBe(true);
    }
  });

  it("requires the font tokens to be exact and governed by D-010 now it is decided", () => {
    for (const name of FONT_TOKEN_NAMES) {
      const entry = tokenProvenance.find((e) => e.name === name)!;
      expect(entry.provenance, name).toBe("exact");
      expect(entry.governingDecision, name).toBe(GOVERNING_DECISION_ID);
    }
    // Sliding a font token back to its pre-decision placeholder state is caught.
    const p = cloneProvenance();
    const body = p.find((e) => e.name === "--font-body")!;
    body.provenance = "licence-pending";
    delete body.governingDecision;
    const errors = validateDesignTokensRecord(p).join("\n");
    expect(errors).toContain('must be "exact"');
    expect(errors).toContain(`governed by ${GOVERNING_DECISION_ID}`);
  });

  it("catches a token linking a decision that does not exist", () => {
    const p = cloneProvenance();
    const display = p.find((e) => e.name === "--font-display")!;
    display.governingDecision = "D-9999-nope";
    const errors = validateDesignTokensRecord(p);
    expect(errors.join("\n")).toContain("not in the decisions register");
  });

  it("records the §17.3 categories it intentionally does not tokenise", () => {
    const categories = OMITTED_CATEGORIES.map((c) => c.category.toLowerCase());
    expect(categories).toContain("shadows");
    expect(categories).toContain("breakpoints");
    expect(categories).toContain("z-index layers");
    expect(OMITTED_CATEGORIES.every((c) => c.reason.trim().length > 0)).toBe(true);
  });

  it("links the real, now-decided D-010 decision", () => {
    const governing = decisions.find((d) => d.id === GOVERNING_DECISION_ID);
    expect(governing, GOVERNING_DECISION_ID).toBeDefined();
    // D-010 was decided on 2026-07-29, so R-002 may (and does) read approved.
    expect(governing!.status).toBe("decided");
    expect(DESIGN_TOKENS_REVIEW.status).toBe("approved");
  });

  it("accepts the approved record now D-010 is decided", () => {
    const original = DESIGN_TOKENS_REVIEW.status;
    try {
      (DESIGN_TOKENS_REVIEW as { status: string }).status = "approved";
      const errors = validateDesignTokensRecord();
      expect(errors.join("\n")).not.toContain("marked approved");
    } finally {
      (DESIGN_TOKENS_REVIEW as { status: string }).status = original;
    }
  });

  it("the committed generated doc matches the model", () => {
    expect(renderDesignTokensDoc()).toBe(readCommittedDoc());
  });
});
