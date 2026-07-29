import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Proof-metric figure primitive gate (VD-104).
 *
 * The proof banner states its two quantified claims — `$500M+` enterprise value
 * and `10+` years — as oversized figures with a short tracked label beneath
 * each. That figure shape was scoped inside `ProofBanner.astro` (`.proof__value`
 * / `.proof__label`), so any future section leading with a headline number would
 * have re-declared the display size, weight, and label tracking by hand and
 * drifted. This gate pins the extraction the same way `eyebrow.test.ts` and
 * `ctaButton.test.ts` pin their primitives: a single shared `.metric` figure in
 * the generated `global.css` owns the treatment, and the banner routes through
 * it so the two can never diverge.
 *
 * Two things can silently regress and leave every other gate green: the
 * primitive could stop riding the display type scale (losing the figure's
 * presence), or the banner could keep its own scoped `proof__value`/
 * `proof__label` rules (forking the treatment back apart). Both are checked. The
 * banner keeps its `proof__metric` block class as a layout/count hook alongside
 * the shared `.metric` — the same scoped-class-plus-primitive pattern the CTA
 * anchors follow — so `ProofBanner.test.ts`'s metric count still holds.
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

describe("proof-metric figure primitive (VD-104)", () => {
  const css = read("./styles/global.css");

  it("gives the shared .metric figure a centred block", () => {
    expect(ruleBody(css, ".metric")).toMatch(/text-align:\s*center/);
  });

  it("rides the value on the display type scale", () => {
    const body = ruleBody(css, ".metric__value");
    expect(body).toMatch(/font-size:\s*var\(--font-size-display\)/);
    expect(body).toMatch(/font-weight:\s*var\(--font-weight-bold\)/);
    expect(body).toMatch(/line-height:\s*var\(--line-height-display\)/);
  });

  it("gives the label the shared bold tracked micro-label treatment", () => {
    const body = ruleBody(css, ".metric__label");
    expect(body).toMatch(/font-weight:\s*var\(--font-weight-bold\)/);
    expect(body).toMatch(/letter-spacing:\s*var\(--letter-spacing-eyebrow\)/);
  });

  it("routes the proof banner through the shared primitive", () => {
    const source = read("./components/ProofBanner.astro");
    // The block carries both its scoped hook and the primitive; the value/label
    // carry the primitive's element classes.
    expect(source).toMatch(/class="proof__metric metric"/);
    expect(source).toMatch(/class="metric__value"/);
    expect(source).toMatch(/class="metric__label"/);
  });

  it("keeps no scoped figure rules in the banner that would fork the treatment", () => {
    const source = read("./components/ProofBanner.astro");
    // The scoped `.proof__value` / `.proof__label` declarations must be gone —
    // the primitive owns the figure now, not a per-section copy of it.
    expect(source, "scoped proof__value rule should be gone").not.toMatch(
      /\.proof__value\s*\{/,
    );
    expect(source, "scoped proof__label rule should be gone").not.toMatch(
      /\.proof__label\s*\{/,
    );
  });
});
