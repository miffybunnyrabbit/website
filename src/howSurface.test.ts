import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  tokenValue,
  MIN_TEXT_CONTRAST,
} from "./config/designTokens";

/**
 * Soft-grey "How we work" surface gate (§16.1 neutral ramp, VD-102).
 *
 * The plan's core visual complaint was that the site "renders black-on-white
 * with no mint" — every section defaulted to the white body background. The
 * 2026-07-29 live-site computed-value audit (RW-001/RW-002, recorded in
 * `currentSiteAudit.ts:colour-usage`) took the neutral `#f3f3f3` "light section
 * background" straight from the live stylesheet, and the RW-002 desktop
 * screenshot shows the process block as the one lifted grey panel between the
 * white manifesto above it and the white fit qualifier below it. The mint
 * surfaces are pinned by the `proofBannerSurface`/`casesSurface` gates and the
 * dark surfaces by `heroSurface`/`footerSurface`; this gate pins the third kind
 * of surface the audit records — the soft neutral panel — so the "How we work"
 * section can never silently revert to the white body or drift off the
 * surface-soft/ink tokens.
 *
 * Two things could break the treatment while every other gate stays green: the
 * `.how` rule could stop painting the soft surface (falling back to the white
 * body background), or it could paint the surface but leave the text on the
 * inherited body colour — which happens to already be ink, so it would look
 * right yet not be pinned, and a later ink-token change would silently un-pin
 * it. Both are checked. The contrast assertion proves the pairing is legible:
 * ink on `#f3f3f3` clears WCAG AA comfortably (§16.2).
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
  if (!match) throw new Error(`Rule "${selector}" not found in HowWeWork.astro`);
  return match[1];
}

describe("soft-grey How-we-work surface (VD-102)", () => {
  const source = read("./components/HowWeWork.astro");

  it("paints the section on the soft neutral surface", () => {
    const body = ruleBody(source, ".how");
    expect(body).toMatch(/background-color:\s*var\(--color-surface-soft\)/);
  });

  it("pins the section's text to ink rather than inheriting it", () => {
    const body = ruleBody(source, ".how");
    expect(body).toMatch(/color:\s*var\(--color-helix-ink\)/);
  });

  it("keeps ink on the soft surface at or above the WCAG AA floor", () => {
    const ratio = contrastRatio(
      tokenValue("--color-helix-ink")!,
      tokenValue("--color-surface-soft")!,
    );
    expect(ratio).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });
});
