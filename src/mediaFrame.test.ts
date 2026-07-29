import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Responsive media-frame primitive gate (VD-104).
 *
 * The case-study section places a per-study photograph beneath its headline
 * numbers. That frame — scale to the column's full width, keep the intrinsic
 * aspect ratio, and round the corner the §16.4 case-study visuals call for —
 * lived in `CaseStudies.astro`'s scoped styles (`.cases__image`), so any future
 * section placing an editorial picture would have re-declared the width, the
 * height rule, and the rounding by hand and drifted. This gate pins the
 * extraction the same way `metricFigure.test.ts` and `eyebrow.test.ts` pin
 * theirs: a single shared `.media-frame` in the generated `global.css` owns the
 * frame, and the case-study section routes through it so the two can never
 * diverge.
 *
 * Two things can silently regress and leave every other gate green: the
 * primitive could drop the intrinsic-ratio rule (`height: auto`) and start
 * distorting pictures, or the case-study section could keep its own scoped
 * width/height/rounding (forking the frame back apart). Both are checked. The
 * card keeps its `cases__image` class as a spacing hook alongside the shared
 * `.media-frame` — the same scoped-class-plus-primitive pattern the proof
 * banner's metric follows.
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

describe("responsive media-frame primitive (VD-104)", () => {
  const css = read("./styles/global.css");

  it("scales the shared .media-frame to its column and keeps the intrinsic ratio", () => {
    const body = ruleBody(css, ".media-frame");
    expect(body).toMatch(/display:\s*block/);
    expect(body).toMatch(/width:\s*100%/);
    // height: auto is the load-bearing rule — it lets the picture keep its
    // intrinsic aspect ratio instead of being squashed to a fixed height.
    expect(body).toMatch(/height:\s*auto/);
  });

  it("gives the frame the §16.4 rounded corner via the largest radius token", () => {
    // The frame is the one intended consumer of --radius-lg ("rounded
    // case-study visuals"), routed through the token rather than a literal.
    expect(ruleBody(css, ".media-frame")).toMatch(
      /border-radius:\s*var\(--radius-lg\)/,
    );
  });

  it("routes the case-study image through the shared primitive", () => {
    const source = read("./components/CaseStudies.astro");
    // The image carries both its scoped spacing hook and the primitive.
    expect(source).toMatch(/class="cases__image media-frame"/);
  });

  it("keeps no scoped frame rules in the section that would fork the treatment", () => {
    const source = read("./components/CaseStudies.astro");
    const scoped = source.match(/\.cases__image\s*\{([^}]*)\}/);
    expect(scoped, "the cases__image spacing hook should remain").not.toBeNull();
    const body = scoped![1];
    // The frame's width/height/rounding must be gone from the scoped rule — the
    // primitive owns them now, not a per-section copy that could drift.
    expect(body, "scoped width should be gone").not.toMatch(/width:/);
    expect(body, "scoped height should be gone").not.toMatch(/height:/);
    expect(body, "scoped border-radius should be gone").not.toMatch(
      /border-radius:/,
    );
    // It keeps only the card's own spacing beneath the picture.
    expect(body).toMatch(/margin:/);
  });
});
