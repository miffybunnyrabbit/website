import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PRIMARY_CTA_LABEL } from "./config/cta";

/**
 * Mobile horizontal-overflow regression gate (implementation plan §FX-201).
 *
 * At a 320 px viewport the page was measured rendering 503 px wide: the three
 * primary-CTA anchors (`.site-header__cta`, `.hero__cta`, `.final-cta__button`)
 * each pinned `white-space: nowrap`, so the long approved label
 * "LET’S CREATE ENTERPRISE VALUE" was forced onto a single line that ran past
 * the viewport edge, and the header's brand/nav/CTA flex row never wrapped.
 *
 * The faithful check the plan asks for — `document.documentElement.scrollWidth
 * <= clientWidth` at 320/375 px — needs a real layout engine; jsdom reports zero
 * for every box and cannot measure it. This gate instead pins the CSS
 * invariants that caused the overflow, read straight from each component's
 * scoped `<style>` the way `designTokens.test.ts` reads `global.css`: no CTA may
 * re-pin `white-space: nowrap`, and the header row must stay wrappable. A future
 * edit that reintroduces either regresses FX-201 while every rendered gate stays
 * green, so it fails here rather than shipping a page that scrolls sideways on a
 * phone.
 *
 * Like the sibling rendered gates this file lives at `src/` rather than
 * `src/pages/`: Astro treats every file under `src/pages/` as a route, so a
 * `.test.ts` there is bundled into the SSR entry and crashes `astro build`. It
 * still runs under the `src/**` vitest glob, and the pre-commit hook runs the
 * suite, so a failure blocks the commit.
 */
function readComponent(name: string): string {
  const path = fileURLToPath(new URL(`./components/${name}`, import.meta.url));
  return readFileSync(path, "utf8");
}

/** Extract the declaration body of a single CSS rule by its selector. */
function ruleBody(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  if (!match) {
    throw new Error(`Rule "${selector}" not found`);
  }
  return match[1];
}

const CTA_RULES: ReadonlyArray<{ file: string; selector: string }> = [
  { file: "Header.astro", selector: ".site-header__cta" },
  { file: "Hero.astro", selector: ".hero__cta" },
  { file: "FinalCta.astro", selector: ".final-cta__button" },
];

describe("mobile horizontal-overflow guard (FX-201)", () => {
  it("keeps the label wrappable — the risk this guard exists for", () => {
    // The overflow only bites because the approved label is long and its words
    // can only reflow at spaces; if it were a single unbreakable token the fix
    // would need `break-word` instead. Pin the assumption the fix relies on.
    expect(PRIMARY_CTA_LABEL).toContain(" ");
  });

  for (const { file, selector } of CTA_RULES) {
    it(`does not force ${selector} onto one line with white-space: nowrap`, () => {
      const body = ruleBody(readComponent(file), selector);
      expect(body).not.toMatch(/white-space\s*:\s*nowrap/);
    });
  }

  it("lets the header brand/nav/CTA row wrap instead of overflowing", () => {
    const body = ruleBody(readComponent("Header.astro"), ".site-header__inner");
    expect(body).toMatch(/flex-wrap\s*:\s*wrap/);
  });
});
