import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  tokenValue,
  MIN_TEXT_CONTRAST,
} from "./config/designTokens";

/**
 * Black-on-mint case-studies band gate (§16.1 mint accent, VD-102).
 *
 * The plan's core visual complaint was that the site "renders black-on-white
 * with no mint". The 2026-07-29 live-site computed-value audit (RW-001/RW-002,
 * recorded in `currentSiteAudit.ts:colour-usage`) fixes the reference: mint
 * `#5affba` runs on *three* full-bleed section backgrounds. The sibling
 * `proofBannerSurface.test.ts` pins the proof strip — the first of the three —
 * black-on-mint; this gate pins the case-studies band, the second, which the
 * RW-002 desktop screenshot shows as a full-bleed mint block — in the rebuild it
 * falls after the "How we work" section, before the fit qualifier. Without it
 * the band silently defaults to the white body background, so only one of the
 * live site's mint surfaces would survive the rebuild.
 *
 * Two things could break the treatment while every other gate stays green: the
 * `.cases` rule could stop painting the accent surface (falling back to white),
 * or it could paint the surface but leave the text on the inherited body colour
 * — which happens to already be ink, so it would look right yet not be pinned,
 * and a later ink-token change would silently un-pin it. Both are checked. The
 * contrast assertion proves the pairing is legible: mint fails as a text colour
 * on white, but ink-on-mint clears WCAG AA (§16.2).
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
  if (!match) throw new Error(`Rule "${selector}" not found in CaseStudies.astro`);
  return match[1];
}

describe("black-on-mint case-studies band (VD-102)", () => {
  const source = read("./components/CaseStudies.astro");

  it("paints the case-studies band on the mint accent surface", () => {
    const body = ruleBody(source, ".cases");
    expect(body).toMatch(/background-color:\s*var\(--color-accent\)/);
  });

  it("pins the band's text to ink rather than inheriting it", () => {
    const body = ruleBody(source, ".cases");
    expect(body).toMatch(/color:\s*var\(--color-helix-ink\)/);
  });

  it("keeps ink-on-mint at or above the WCAG AA floor", () => {
    const ratio = contrastRatio(
      tokenValue("--color-helix-ink")!,
      tokenValue("--color-accent")!,
    );
    expect(ratio).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });
});
