import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  tokenValue,
  MIN_TEXT_CONTRAST,
} from "./config/designTokens";

/**
 * White-on-black footer gate (§16.1 black surfaces, VD-102).
 *
 * The plan's core visual complaint was that the site "renders black-on-white
 * with no mint" — every section defaulted to the white body background. The
 * 2026-07-29 live-site computed-value audit (RW-001/RW-002, recorded in
 * `currentSiteAudit.ts:colour-usage`) fixes the reference: "the hero and footer
 * run white-on-black" on pure black `#000000` (the `--color-ink-900` token).
 * The sibling `heroSurface.test.ts` pins the hero half of that finding; this
 * gate pins the footer half so it can never silently revert to the white body
 * background or drift off the ink/white tokens.
 *
 * Two things could break the treatment while every other gate stays green: the
 * `.site-footer` rule could stop painting the black surface (falling back to the
 * white body background), or it could paint the surface but leave the text on the
 * inherited body colour — which is ink, so white-on-black text would flip to
 * ink-on-black and vanish. Both are checked. The footer's links inherit their
 * colour (`a { color: inherit }`), so pinning the footer text to white carries
 * every link with it; the pin is what keeps them legible. The contrast assertion
 * proves the pairing clears WCAG AA at the maximum ratio (§16.2).
 *
 * Like the sibling `.astro`-source gates this file lives at `src/` rather than
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
  if (!match) throw new Error(`Rule "${selector}" not found in Footer.astro`);
  return match[1];
}

/** The `opacity` value declared in a rule body, or throws if absent. */
function opacityOf(css: string, selector: string): number {
  const match = ruleBody(css, selector).match(/opacity:\s*([\d.]+)/);
  if (!match) throw new Error(`No opacity in "${selector}"`);
  return Number(match[1]);
}

/**
 * The effective `#rrggbb` colour of `fg` composited over `bg` at `alpha`.
 * Browsers composite `opacity` in gamma-encoded sRGB byte space, so each channel
 * blends as `fg*alpha + bg*(1-alpha)` on the 0–255 bytes before luminance is
 * computed — which is exactly what an `opacity`-dimmed footer label renders as.
 */
function compositeOver(fg: string, bg: string, alpha: number): string {
  const channels = (hex: string) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [fr, fg_, fb] = channels(fg);
  const [br, bg_, bb] = channels(bg);
  const blend = (f: number, b: number) =>
    Math.round(f * alpha + b * (1 - alpha))
      .toString(16)
      .padStart(2, "0");
  return `#${blend(fr, br)}${blend(fg_, bg_)}${blend(fb, bb)}`;
}

describe("white-on-black footer (VD-102)", () => {
  const source = read("./components/Footer.astro");

  it("paints the footer on the black ink surface", () => {
    const body = ruleBody(source, ".site-footer");
    expect(body).toMatch(/background-color:\s*var\(--color-ink-900\)/);
  });

  it("pins the footer's text to white rather than inheriting it", () => {
    const body = ruleBody(source, ".site-footer");
    expect(body).toMatch(/color:\s*var\(--color-white\)/);
  });

  it("keeps white-on-black at or above the WCAG AA floor", () => {
    const ratio = contrastRatio(
      tokenValue("--color-white")!,
      tokenValue("--color-ink-900")!,
    );
    expect(ratio).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  /**
   * The base white-on-black pairing clears AA at the maximum 21:1, but the
   * footer's fine print is not full-opacity white: `.site-footer__fact dt` and
   * `.site-footer__copyright` dim their text with `opacity` (a deliberate
   * hierarchy cue carried over from the old white-background footer). On the
   * new black surface an `opacity`-dimmed white label composites toward grey,
   * not white, so its real contrast is far below 21:1 — and small legal/eyebrow
   * copy still owes the AA text floor. These gates read the actual declared
   * opacity and pin the *composited* colour above AA, so dropping either value
   * past the ~0.46 legibility floor fails the build rather than shipping
   * unreadable fine print that every other footer gate would wave through.
   */
  it.each([
    [".site-footer__fact dt", "uppercase eyebrow labels"],
    [".site-footer__copyright", "the copyright line"],
  ])("keeps %s legible on black once opacity is applied (%s)", (selector) => {
    const alpha = opacityOf(source, selector);
    const dimmed = compositeOver(
      tokenValue("--color-white")!,
      tokenValue("--color-ink-900")!,
      alpha,
    );
    expect(contrastRatio(dimmed, tokenValue("--color-ink-900")!)).toBeGreaterThanOrEqual(
      MIN_TEXT_CONTRAST,
    );
  });
});
