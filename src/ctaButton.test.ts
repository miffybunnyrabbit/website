import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  tokenValue,
  MIN_TEXT_CONTRAST,
} from "./config/designTokens";

/**
 * Primary call-to-action button gate (§16.1 mint accent, VD-102/VD-104).
 *
 * The plan's core visual complaint was that the site "renders black-on-white
 * with no mint" — no component consumed the accent token, so the one conversion
 * action looked like a plain bold link. This gate pins the fix: a single shared
 * `.cta-button` primitive in the generated `global.css` paints the mint surface,
 * and every primary-CTA anchor carries that class so they can never diverge.
 *
 * Two things can silently break the accent and still leave every other gate
 * green: the primitive could stop referencing the accent/ink tokens (drifting
 * off-brand), or a CTA element could drop the shared class (falling back to the
 * inherited-ink link). Both are checked here. The contrast assertions prove the
 * chosen surface/text pairing is legible: mint fails as a text colour on white,
 * but ink-on-mint and the inverted mint-on-ink hover both clear WCAG AA (§16.2).
 *
 * Like the sibling rendered gates this file lives at `src/` rather than
 * `src/pages/`: Astro treats every file under `src/pages/` as a route, so a
 * `.test.ts` there is bundled into the SSR entry and crashes `astro build`.
 */
function read(relative: string): string {
  return readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

/** Declaration body of a single CSS rule by exact selector. */
function ruleBody(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`Rule "${selector}" not found in stylesheet`);
  return match[1];
}

/** The three primary-CTA anchors and the section each lives in. */
const CTA_ELEMENTS: ReadonlyArray<{ file: string; scopedClass: string }> = [
  { file: "./components/Header.astro", scopedClass: "site-header__cta" },
  { file: "./components/Hero.astro", scopedClass: "hero__cta" },
  { file: "./components/FinalCta.astro", scopedClass: "final-cta__button" },
  { file: "./components/Fit.astro", scopedClass: "fit__fallback-cta" },
];

describe("primary CTA mint button (VD-102/VD-104)", () => {
  const css = read("./styles/global.css");

  it("defines the shared .cta-button primitive on the accent surface with ink text", () => {
    const body = ruleBody(css, ".cta-button");
    expect(body).toMatch(/background-color:\s*var\(--color-accent\)/);
    expect(body).toMatch(/color:\s*var\(--color-helix-ink\)/);
  });

  it("shows the pointer cursor even before a booking URL is configured", () => {
    // The CTA renders as an href-less <a> until PUBLIC_CALENDLY_URL is set
    // (§13, D-0006), and an anchor without an href gets no hand cursor from the
    // browser — so the primitive has to declare it rather than inherit it.
    expect(ruleBody(css, ".cta-button")).toMatch(/cursor:\s*pointer/);
  });

  it("inverts to a mint label on ink for hover/focus", () => {
    const body = ruleBody(css, ".cta-button:hover,\n.cta-button:focus-visible");
    expect(body).toMatch(/background-color:\s*var\(--color-helix-ink\)/);
    expect(body).toMatch(/color:\s*var\(--color-accent\)/);
  });

  it("holds the mint border through hover so the shape survives on ink surfaces", () => {
    // At rest the border matches the fill and is invisible. It earns its keep on
    // hover: the hero sits on ink (heroSurface.test.ts), so an ink-filled button
    // with no border would dissolve into the section, leaving floating mint
    // text instead of a button.
    expect(ruleBody(css, ".cta-button")).toMatch(
      /border:\s*2px solid var\(--color-accent\)/,
    );
    expect(
      ruleBody(css, ".cta-button:hover,\n.cta-button:focus-visible"),
    ).toMatch(/border-color:\s*var\(--color-accent\)/);
  });

  it("keeps ink-on-mint (rest) at or above the WCAG AA floor", () => {
    const ratio = contrastRatio(
      tokenValue("--color-helix-ink")!,
      tokenValue("--color-accent")!,
    );
    expect(ratio).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it("keeps mint-on-ink (hover) at or above the WCAG AA floor", () => {
    const ratio = contrastRatio(
      tokenValue("--color-accent")!,
      tokenValue("--color-helix-ink")!,
    );
    expect(ratio).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  for (const { file, scopedClass } of CTA_ELEMENTS) {
    it(`applies the shared primitive to .${scopedClass}`, () => {
      const source = read(file);
      // The anchor's class attribute must carry both its scoped class and the
      // shared primitive, so the mint treatment reaches every conversion point.
      const classMatch = source.match(
        new RegExp(`class="([^"]*\\b${scopedClass}\\b[^"]*)"`),
      );
      expect(classMatch, `no class attribute containing ${scopedClass}`).not.toBeNull();
      expect(classMatch![1].split(/\s+/)).toContain("cta-button");
    });
  }
});
