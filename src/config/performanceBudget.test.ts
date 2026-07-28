import { describe, it, expect } from "vitest";
import {
  LIGHTHOUSE_THRESHOLDS,
  WEB_VITAL_THRESHOLDS,
  INITIAL_JS_BUDGET_KB,
  FORBIDDEN_EMBED_TAGS,
  HYDRATED_ISLAND_COMPONENT,
  MAX_HYDRATED_ISLANDS,
  DEFERRED_HYDRATION_DIRECTIVES,
  validatePerformanceBudget,
  assertPerformanceBudgetValid,
  auditRenderedPerformance,
  assertRenderedWithinBudget,
  type LighthouseThreshold,
  type WebVitalThreshold,
} from "./performanceBudget";

/**
 * Unit tests for the P7-006 performance budget. The first half pins the
 * documented budget's self-consistency against hand-built fixtures — good and
 * incoherent — and the second exercises the rendered-page scanner against fake
 * HTML. `renderedPerformance.test.ts` then runs the same scanner over the actual
 * rendered routes.
 */

describe("the documented budget", () => {
  it("is coherent as shipped", () => {
    expect(validatePerformanceBudget()).toEqual([]);
    expect(() => assertPerformanceBudgetValid()).not.toThrow();
  });

  it("encodes the P7-006 targets", () => {
    const byId = new Map(LIGHTHOUSE_THRESHOLDS.map((t) => [t.id, t.minScore]));
    expect(byId.get("performance-mobile")).toBe(90);
    expect(byId.get("performance-desktop")).toBe(95);
    expect(byId.get("accessibility")).toBe(95);
    expect(byId.get("best-practices")).toBe(95);
    expect(byId.get("seo")).toBe(95);

    const vitals = new Map(WEB_VITAL_THRESHOLDS.map((v) => [v.id, v]));
    expect(vitals.get("lcp")).toMatchObject({ max: 2500, unit: "ms" });
    expect(vitals.get("cls")).toMatchObject({ max: 0.1, unit: "score" });
    expect(vitals.get("inp")).toMatchObject({ max: 200, unit: "ms" });

    expect(INITIAL_JS_BUDGET_KB).toBe(120);
  });
});

describe("validatePerformanceBudget", () => {
  const goodLighthouse = (): LighthouseThreshold[] =>
    LIGHTHOUSE_THRESHOLDS.map((t) => ({ ...t }));
  const goodVitals = (): WebVitalThreshold[] =>
    WEB_VITAL_THRESHOLDS.map((v) => ({ ...v }));

  it("rejects a Lighthouse score outside 0–100", () => {
    const lh = goodLighthouse();
    lh[0] = { ...lh[0], minScore: 120 };
    expect(validatePerformanceBudget(lh).some((e) => e.includes("0–100"))).toBe(true);
  });

  it("rejects a non-integer Lighthouse score", () => {
    const lh = goodLighthouse();
    lh[0] = { ...lh[0], minScore: 90.5 };
    expect(validatePerformanceBudget(lh).some((e) => e.includes("integer"))).toBe(true);
  });

  it("rejects a missing Lighthouse category", () => {
    const lh = goodLighthouse().filter((t) => t.id !== "seo");
    expect(validatePerformanceBudget(lh).some((e) => e.includes('"seo"'))).toBe(true);
  });

  it("rejects a non-positive Web Vital ceiling", () => {
    const v = goodVitals();
    v[0] = { ...v[0], max: 0 };
    expect(
      validatePerformanceBudget(undefined, v).some((e) => e.includes("greater than zero")),
    ).toBe(true);
  });

  it("rejects a unitless score that exceeds 1", () => {
    const v = goodVitals();
    // CLS is a unitless score; a value above 1 is a units mistake.
    const cls = v.findIndex((x) => x.id === "cls");
    v[cls] = { ...v[cls], max: 100 };
    expect(
      validatePerformanceBudget(undefined, v).some((e) => e.includes("exceeds 1")),
    ).toBe(true);
  });

  it("rejects a non-positive initial-JS ceiling", () => {
    expect(
      validatePerformanceBudget(undefined, undefined, 0).some((e) =>
        e.includes("greater than zero"),
      ),
    ).toBe(true);
  });

  it("assertPerformanceBudgetValid throws on an incoherent budget", () => {
    const lh = goodLighthouse();
    lh[0] = { ...lh[0], minScore: -1 };
    expect(() => assertPerformanceBudgetValid(lh)).toThrow(/Invalid performance budget/);
  });
});

/** A minimal rendered page that stays within the rendered-page budget. */
function soundPage(): string {
  return `<!doctype html><html lang="en-AU"><body>
    <main id="main">
      <astro-island component-url="/src/components/fit/FitQualifier.tsx" client="visible" opts='{"name":"FitQualifier"}'></astro-island>
    </main>
  </body></html>`;
}

describe("auditRenderedPerformance", () => {
  it("passes a sound page with one deferred fit-qualifier island", () => {
    expect(auditRenderedPerformance(soundPage())).toEqual([]);
  });

  it("passes a page with no island at all (e.g. the 404)", () => {
    expect(
      auditRenderedPerformance(`<html lang="en"><main id="main"></main></html>`),
    ).toEqual([]);
  });

  it.each(FORBIDDEN_EMBED_TAGS)("flags a third-party <%s> embed", (tag) => {
    const html = soundPage().replace("</main>", `<${tag} src="https://x"></${tag}></main>`);
    const violations = auditRenderedPerformance(html);
    expect(violations.some((v) => v.rule === "third-party-embed")).toBe(true);
  });

  it("flags an embed tag regardless of case", () => {
    const html = soundPage().replace("</main>", `<IFRAME src="x"></IFRAME></main>`);
    expect(
      auditRenderedPerformance(html).some((v) => v.rule === "third-party-embed"),
    ).toBe(true);
  });

  it("flags more than one hydrated island", () => {
    const html = soundPage().replace(
      "</main>",
      `<astro-island component-url="/x/FitQualifier.tsx" client="visible"></astro-island></main>`,
    );
    expect(
      auditRenderedPerformance(html).some((v) => v.rule === "island-count"),
    ).toBe(true);
    expect(MAX_HYDRATED_ISLANDS).toBe(1);
  });

  it("flags a hydrated island that is not the fit qualifier", () => {
    const html = `<html><main id="main"><astro-island component-url="/src/components/Other.tsx" client="visible" opts='{"name":"Other"}'></astro-island></main></html>`;
    expect(
      auditRenderedPerformance(html).some((v) => v.rule === "island-component"),
    ).toBe(true);
  });

  it("flags eager hydration directives", () => {
    for (const eager of ["load", "only"]) {
      const html = soundPage().replace('client="visible"', `client="${eager}"`);
      expect(
        auditRenderedPerformance(html).some((v) => v.rule === "eager-hydration"),
      ).toBe(true);
    }
  });

  it("accepts every deferred hydration directive", () => {
    for (const directive of DEFERRED_HYDRATION_DIRECTIVES) {
      const html = soundPage().replace('client="visible"', `client="${directive}"`);
      expect(
        auditRenderedPerformance(html).some((v) => v.rule === "eager-hydration"),
      ).toBe(false);
    }
  });

  it("names the fit qualifier as the sole hydrated component", () => {
    expect(HYDRATED_ISLAND_COMPONENT).toBe("FitQualifier");
  });
});

describe("assertRenderedWithinBudget", () => {
  it("does not throw for sound pages", () => {
    expect(() =>
      assertRenderedWithinBudget([{ label: "/", html: soundPage() }]),
    ).not.toThrow();
  });

  it("throws a labelled report listing every violation", () => {
    const poisoned = soundPage().replace(
      "</main>",
      `<iframe src="https://calendly.com/embed"></iframe></main>`,
    );
    expect(() =>
      assertRenderedWithinBudget([{ label: "/", html: poisoned }]),
    ).toThrow(/Performance-budget violations/);
    expect(() =>
      assertRenderedWithinBudget([{ label: "/", html: poisoned }]),
    ).toThrow(/\/: \[third-party-embed\]/);
  });
});
