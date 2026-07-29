import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  TOKEN_GROUPS,
  REQUIRED_BRAND_COLORS,
  MIN_FOCUS_CONTRAST,
  MIN_TEXT_CONTRAST,
  allTokens,
  tokenValue,
  contrastRatio,
  relativeLuminance,
  validateDesignTokens,
  assertDesignTokensValid,
  renderGlobalStylesheet,
  type TokenGroup,
} from "./designTokens";

/**
 * Guards the validated design-token model (Phase 3 — P3-001/P3-002/P3-005, §16)
 * and the drift between it and the committed `src/styles/global.css`. The model
 * validates itself; here we pin the invariants the plan makes explicit and prove
 * the rendered stylesheet still matches the file `BaseLayout.astro` imports.
 */

function readGlobalCss(): string {
  const path = fileURLToPath(new URL("../styles/global.css", import.meta.url));
  return readFileSync(path, "utf8");
}

describe("design-token model", () => {
  it("passes its own validation", () => {
    expect(validateDesignTokens()).toEqual([]);
    expect(() => assertDesignTokensValid()).not.toThrow();
  });

  it("carries every required brand colour from §16.1 unchanged", () => {
    for (const [name, value] of Object.entries(REQUIRED_BRAND_COLORS)) {
      expect(tokenValue(name)).toBe(value);
    }
  });

  it("defines each token name exactly once", () => {
    const names = allTokens().map((token) => token.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("names every token in --lower-kebab-case", () => {
    for (const token of allTokens()) {
      expect(token.name).toMatch(/^--[a-z][a-z0-9-]*$/);
    }
  });

  it("uses valid hex for every colour token", () => {
    const colorGroup = TOKEN_GROUPS.find((group) => group.key === "color");
    for (const token of colorGroup?.tokens ?? []) {
      expect(token.value).toMatch(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i);
    }
  });

  it("gives every duration token a positive time value", () => {
    const motionGroup = TOKEN_GROUPS.find((group) => group.key === "motion");
    const durations = (motionGroup?.tokens ?? []).filter((token) =>
      token.name.startsWith("--duration-"),
    );
    expect(durations.length).toBeGreaterThan(0);
    for (const token of durations) {
      const match = /^(\d*\.?\d+)(ms|s)$/.exec(token.value);
      expect(match).not.toBeNull();
      expect(Number(match![1])).toBeGreaterThan(0);
    }
  });
});

describe("contrast (the §16.2 check the sample focus colour requires)", () => {
  it("computes a known contrast ratio (black on white ≈ 21:1)", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
  });

  it("expands 3-digit hex the same as its 6-digit form", () => {
    expect(relativeLuminance("#fff")).toBeCloseTo(relativeLuminance("#ffffff"), 10);
  });

  it("keeps the focus ring at or above the WCAG 1.4.11 floor on white", () => {
    const ratio = contrastRatio(tokenValue("--color-focus")!, tokenValue("--color-white")!);
    expect(ratio).toBeGreaterThanOrEqual(MIN_FOCUS_CONTRAST);
  });

  it("keeps body text at or above the WCAG AA floor on the surface", () => {
    const ratio = contrastRatio(tokenValue("--color-text")!, tokenValue("--color-surface")!);
    expect(ratio).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it("rejects a focus colour that fails the contrast floor", () => {
    const groups: TokenGroup[] = [
      {
        key: "color",
        title: "Colour",
        tokens: [
          { name: "--color-white", value: "#ffffff" },
          { name: "--color-helix-mint", value: "#5affba" },
          { name: "--color-helix-ink", value: "#000000" },
          { name: "--color-surface", value: "#ffffff" },
          { name: "--color-text", value: "#000000" },
          { name: "--color-focus", value: "#eeeeee" }, // far too light on white
        ],
      },
    ];
    const errors = validateDesignTokens(groups);
    expect(errors.some((e) => e.includes("Focus colour"))).toBe(true);
  });
});

describe("validation failure modes", () => {
  function colorGroup(focus: DesignTokenOverride = {}): TokenGroup {
    return {
      key: "color",
      title: "Colour",
      tokens: [
        { name: "--color-white", value: "#ffffff" },
        { name: "--color-surface", value: "#ffffff" },
        { name: "--color-text", value: "#000000" },
        { name: "--color-focus", value: "#00a864" },
        { name: focus.mintName ?? "--color-helix-mint", value: focus.mintValue ?? "#5affba" },
        { name: "--color-helix-ink", value: "#000000" },
      ],
    };
  }
  interface DesignTokenOverride {
    mintName?: string;
    mintValue?: string;
  }

  it("flags a missing required brand colour", () => {
    const groups: TokenGroup[] = [colorGroup({ mintName: "--color-not-mint" })];
    expect(validateDesignTokens(groups).some((e) => e.includes("--color-helix-mint"))).toBe(true);
  });

  it("flags an altered brand colour", () => {
    const groups: TokenGroup[] = [colorGroup({ mintValue: "#00ff00" })];
    expect(validateDesignTokens(groups).some((e) => e.includes("must be"))).toBe(true);
  });

  it("flags a malformed hex colour", () => {
    const groups: TokenGroup[] = [
      {
        key: "color",
        title: "Colour",
        tokens: [
          { name: "--color-white", value: "#ffffff" },
          { name: "--color-surface", value: "#ffffff" },
          { name: "--color-text", value: "#000000" },
          { name: "--color-focus", value: "#00a864" },
          { name: "--color-helix-mint", value: "not-a-colour" },
          { name: "--color-helix-ink", value: "#000000" },
        ],
      },
    ];
    expect(validateDesignTokens(groups).some((e) => e.includes("not a valid hex"))).toBe(true);
  });

  it("flags a duplicate token name", () => {
    const groups: TokenGroup[] = [
      colorGroup(),
      { key: "extra", title: "Extra", tokens: [{ name: "--color-text", value: "#000000" }] },
    ];
    expect(validateDesignTokens(groups).some((e) => e.includes("Duplicate token"))).toBe(true);
  });
});

describe("rendered stylesheet", () => {
  it("declares every token inside :root", () => {
    const css = renderGlobalStylesheet();
    expect(css).toContain(":root {");
    for (const token of allTokens()) {
      expect(css).toContain(`${token.name}: ${token.value};`);
    }
  });

  it("includes the reset, focus ring, skip link and reduced-motion override", () => {
    const css = renderGlobalStylesheet();
    expect(css).toContain("box-sizing: border-box;");
    expect(css).toContain(":focus-visible {");
    expect(css).toContain(".skip-link {");
    expect(css).toContain(".skip-link:focus {");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("ends with a single trailing newline", () => {
    const css = renderGlobalStylesheet();
    expect(css.endsWith("}\n")).toBe(true);
    expect(css.endsWith("}\n\n")).toBe(false);
  });

  it("matches the committed src/styles/global.css (no drift)", () => {
    expect(readGlobalCss()).toBe(renderGlobalStylesheet());
  });
});
