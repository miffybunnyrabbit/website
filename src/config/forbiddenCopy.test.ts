import { describe, expect, it } from "vitest";
import {
  assertNoForbiddenCopy,
  FORBIDDEN_PATTERNS,
  isCopyClean,
  scanForbiddenCopy,
  type ForbiddenPattern,
} from "./forbiddenCopy";
import { logos, marqueeLogos } from "./logos";
import { caseStudies } from "./caseStudies";

describe("forbidden-copy rule set", () => {
  it("declares every pattern without the global flag so scans are stateless", () => {
    for (const rule of FORBIDDEN_PATTERNS) {
      expect(rule.pattern.flags.includes("g"), rule.id).toBe(false);
      expect(rule.pattern.flags.includes("i"), rule.id).toBe(true);
    }
  });

  it("uses unique, kebab-case rule ids", () => {
    const ids = FORBIDDEN_PATTERNS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id, id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it("cites a plan reference and reason for every rule", () => {
    for (const rule of FORBIDDEN_PATTERNS) {
      expect(rule.reason.trim().length, rule.id).toBeGreaterThan(0);
      expect(rule.planRef.trim().length, rule.id).toBeGreaterThan(0);
    }
  });
});

describe("scanForbiddenCopy", () => {
  it("returns no violations for clean, on-message copy", () => {
    const clean =
      "We work with businesses to create meaningful growth in enterprise value. " +
      "Over 10+ years we have helped create $500m+ through deep partnership and aligned economics.";
    expect(scanForbiddenCopy(clean)).toEqual([]);
    expect(isCopyClean(clean)).toBe(true);
  });

  it.each([
    ["Awayco", "brand-awayco"],
    ["Perion", "brand-perion"],
    ["Synaptico", "brand-synaptico"],
  ])("flags removed brand %s", (brand, id) => {
    const violations = scanForbiddenCopy(`Trusted by ${brand} and others.`);
    expect(violations.map((v) => v.id)).toContain(id);
    expect(violations[0]?.match.toLowerCase()).toBe(brand.toLowerCase());
  });

  it("matches brand names case-insensitively", () => {
    expect(scanForbiddenCopy("AWAYCO").map((v) => v.id)).toContain(
      "brand-awayco",
    );
    expect(scanForbiddenCopy("perion").map((v) => v.id)).toContain(
      "brand-perion",
    );
  });

  it("does not flag brand names embedded inside unrelated words", () => {
    // Word boundaries prevent a longer token that merely contains a brand from
    // matching: /\bperion\b/ does not fire inside "perionitis" (no boundary
    // between "perion" and "itis"), so the copy is clean.
    expect(isCopyClean("perionitis is not a real word")).toBe(true);
    // But the standalone brand token is still caught.
    expect(isCopyClean("perion shut down")).toBe(false);
  });

  it("flags the abandoned people-led positioning", () => {
    expect(scanForbiddenCopy("Meet the humans of Helix").map((v) => v.id)).toContain(
      "humans-of-helix",
    );
    expect(
      scanForbiddenCopy("Our people are our greatest asset.").map((v) => v.id),
    ).toContain("greatest-asset");
  });

  it("flags venture and human counts but keeps the required 10+ years", () => {
    expect(scanForbiddenCopy("50+ ventures delivered").map((v) => v.id)).toContain(
      "venture-count",
    );
    expect(scanForbiddenCopy("120 humans across the group").map((v) => v.id)).toContain(
      "human-count",
    );
    // The mandated proof-banner metrics must stay clean.
    expect(isCopyClean("$500m+ created over 10+ years")).toBe(true);
  });

  it.each([
    ["market domination", "market-domination"],
    ["digital transformation", "digital-transformation"],
    ["end-to-end solutions", "end-to-end-solutions"],
    ["world-class delivery", "world-class"],
    ["best-in-class outcomes", "best-in-class"],
    ["resource augmentation", "resource-augmentation"],
    ["forced exit", "forced-exit"],
  ])("flags the banned cliché %s", (phrase, id) => {
    expect(scanForbiddenCopy(phrase).map((v) => v.id)).toContain(id);
  });

  it("flags guaranteed-outcome language in several forms", () => {
    for (const phrase of [
      "guaranteed upside",
      "we guarantee enterprise value",
      "guarantees returns",
      "guaranteed growth",
    ]) {
      expect(scanForbiddenCopy(phrase).map((v) => v.id), phrase).toContain(
        "guaranteed-upside",
      );
    }
  });

  it("tolerates whitespace variations inside phrases", () => {
    // Rendered HTML can wrap or double-space between words.
    expect(scanForbiddenCopy("market   domination").map((v) => v.id)).toContain(
      "market-domination",
    );
    expect(scanForbiddenCopy("humans\nof\nHelix").map((v) => v.id)).toContain(
      "humans-of-helix",
    );
  });

  it("reports every occurrence, ordered by position", () => {
    const text = "world-class and best-in-class and world-class again";
    const violations = scanForbiddenCopy(text);
    expect(violations.map((v) => v.id)).toEqual([
      "world-class",
      "best-in-class",
      "world-class",
    ]);
    // Indexes are strictly non-decreasing.
    const indexes = violations.map((v) => v.index);
    expect([...indexes].sort((a, b) => a - b)).toEqual(indexes);
  });

  it("is stateless across calls (no shared RegExp lastIndex)", () => {
    const first = scanForbiddenCopy("world-class");
    const second = scanForbiddenCopy("world-class");
    expect(first).toEqual(second);
    expect(second.map((v) => v.id)).toContain("world-class");
  });

  it("does NOT flag Xylo — only its case study is removed, its logo is retained", () => {
    // Guarding this here prevents a future over-eager rule from breaking the
    // legitimately retained Xylo logo (D-008).
    expect(isCopyClean("Xylo")).toBe(true);
    expect(FORBIDDEN_PATTERNS.some((r) => r.id.includes("xylo"))).toBe(false);
  });

  it("honours a caller-supplied pattern set", () => {
    const custom: ForbiddenPattern[] = [
      {
        id: "no-lorem",
        pattern: /\blorem\b/i,
        reason: "Placeholder text must not ship.",
        planRef: "test",
      },
    ];
    expect(scanForbiddenCopy("lorem ipsum", custom).map((v) => v.id)).toEqual([
      "no-lorem",
    ]);
    // The default rules are not consulted when a custom set is passed.
    expect(scanForbiddenCopy("world-class", custom)).toEqual([]);
  });
});

describe("assertNoForbiddenCopy", () => {
  it("does not throw when all sources are clean", () => {
    expect(() =>
      assertNoForbiddenCopy([
        { label: "index", text: "Meaningful growth in enterprise value." },
        { label: "footer", text: "$500m+ over 10+ years." },
      ]),
    ).not.toThrow();
  });

  it("throws a report naming the source, match, and rule id", () => {
    let message = "";
    try {
      assertNoForbiddenCopy([
        { label: "src/pages/about.astro", text: "The humans of Helix ship world-class work." },
      ]);
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain("src/pages/about.astro");
    expect(message).toContain("humans-of-helix");
    expect(message).toContain("world-class");
  });
});

describe("live content is free of forbidden copy", () => {
  it("keeps every rendered logo alt/name clean", () => {
    // marqueeLogos() is what actually ships; assert its visible text is clean,
    // and separately that the auditable register never surfaces a removed brand
    // as *renderable* copy.
    for (const logo of marqueeLogos()) {
      expect(isCopyClean(`${logo.name} ${logo.alt}`), logo.name).toBe(true);
    }
    // The full register intentionally still lists removed brands as records;
    // none of those may ever be visible, which the scan-of-visible above proves.
    expect(logos.length).toBeGreaterThan(marqueeLogos().length);
  });

  it("keeps published case-study copy clean", () => {
    for (const cs of caseStudies) {
      const text = [cs.name, cs.headline ?? "", cs.summary ?? ""]
        .filter(Boolean)
        .join(" ");
      expect(scanForbiddenCopy(text), cs.name).toEqual([]);
    }
  });
});
