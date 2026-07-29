import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Section eyebrow primitive gate (§16.1 mint accent, VD-102/VD-104).
 *
 * The plan's core visual complaint was that the site "renders black-on-white
 * with no mint": no component consumed the accent token beyond the CTA, so every
 * section's kicker/eyebrow label was plain tracked ink. This gate pins the fix
 * the same way `ctaButton.test.ts` pins the button — a single shared `.eyebrow`
 * primitive in the generated `global.css` carries the tracking and paints the
 * mint accent, and every section eyebrow carries that class so they can never
 * diverge (VD-104).
 *
 * Two things can silently break the accent and still leave every other gate
 * green: the primitive could stop painting the accent (drifting back off-brand),
 * or a section could keep its own scoped `X__eyebrow` class (falling back to
 * plain ink). Both are checked here. The mint is applied as a short rule *before*
 * the label rather than to the text, because mint fails WCAG AA as a text colour
 * on white — it is a surface/graphic colour (§16.2), the same rule the CTA obeys.
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

/** Every section whose eyebrow must route through the shared primitive. */
const EYEBROW_SECTIONS: readonly string[] = [
  "Hero.astro",
  "WhyHelix.astro",
  "HowWeWork.astro",
  "CaseStudies.astro",
  "Fit.astro",
];

describe("section eyebrow mint primitive (VD-102/VD-104)", () => {
  const css = read("./styles/global.css");

  it("defines the shared .eyebrow primitive with the tracking token", () => {
    const body = ruleBody(css, ".eyebrow");
    expect(body).toMatch(/letter-spacing:\s*var\(--letter-spacing-eyebrow\)/);
    expect(body).toMatch(/font-weight:\s*var\(--font-weight-bold\)/);
  });

  it("paints the mint accent as a rule before the label, not on the text", () => {
    // The accent lives on the ::before rule (a graphic surface), and the base
    // rule sets no `color`, so the label text stays inherited ink — mint on white
    // fails contrast as a text colour (§16.2).
    const marker = ruleBody(css, ".eyebrow::before");
    expect(marker).toMatch(/background-color:\s*var\(--color-accent\)/);
    expect(ruleBody(css, ".eyebrow")).not.toMatch(/(^|[^-])color:/);
  });

  for (const file of EYEBROW_SECTIONS) {
    it(`applies the shared .eyebrow primitive in ${file}`, () => {
      const source = read(`./components/${file}`);
      // The section must render its eyebrow with the shared class and must not
      // keep a scoped per-section eyebrow class that would fork the treatment.
      expect(source).toMatch(/class="eyebrow"/);
      expect(source, "scoped __eyebrow class should be gone").not.toMatch(/__eyebrow/);
    });
  }
});
