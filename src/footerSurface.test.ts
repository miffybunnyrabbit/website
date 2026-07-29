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
});
