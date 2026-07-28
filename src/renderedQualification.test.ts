import { describe, it, expect, beforeAll } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import reactRenderer from "@astrojs/react/server.js";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import IndexPage from "./pages/index.astro";
import {
  fitSectionCopy,
  questionNodes,
  resultNodes,
  REDFERN_ADDRESS,
} from "./components/fit/fitFlow";
import { primaryCta } from "./config/cta";

/**
 * End-to-end qualification-flow gate (implementation plan §24 "Qualification
 * flow", §12.4, P5-005).
 *
 * `Fit.astro` has its own unit test, and `fitFlow.ts` unit-tests the decision
 * graph — but both render the qualifier *in isolation*. Nothing rendered the
 * assembled homepage and proved the flow survives composition. That left a hole
 * the sibling rendered gates were written to close for the message, copy,
 * accessibility, and performance dimensions: a regression that dropped `<Fit />`
 * from `index.astro`, reordered the page so another section shadowed it, or
 * stripped the `<noscript>` fallback during a refactor would ship a homepage with
 * no working qualifier while every existing test stayed green.
 *
 * §24 requires, on the delivered page, that "all specified branches exist", "the
 * missing capacity-no branch has an approved outcome", "all positive outcomes use
 * the same CTA", and "no-JavaScript users see a meaningful fallback". This gate
 * renders the real page tree — including the server-rendered React island — to
 * the same HTML a visitor receives and asserts those criteria hold on the
 * composed output. The assertions are driven off the `fitFlow` model, so a
 * dropped question or outcome fails here rather than shipping silently.
 *
 * The pre-commit hook runs the test suite, so a failure here blocks the commit.
 *
 * Like the other rendered gates this file lives at `src/` rather than
 * `src/pages/`: Astro treats every file under `src/pages/` as a route and bundles
 * it into the SSR entry, so a `.test.ts` there pulls `vitest` into `astro build`
 * and crashes it. It still runs under the `src/**` vitest glob.
 */
async function renderPage(Component: AstroComponentFactory): Promise<string> {
  const container = await AstroContainer.create();
  // Register the React renderer so the fit-qualifier island's server-rendered
  // first question is part of the composed output, not skipped.
  container.addServerRenderer({ renderer: reactRenderer });
  container.addClientRenderer({
    name: "@astrojs/react",
    entrypoint: "@astrojs/react/client.js",
  });
  return container.renderToString(Component);
}

/**
 * The no-JavaScript fallback markup from the assembled page. There can be more
 * than one `<noscript>` block on the document, so we keep only the one carrying
 * the qualifier fallback (marked by its `fit__fallback` container). Scoping the
 * fallback assertions to this block proves the qualification summary lives in the
 * fallback specifically, not merely somewhere on the page.
 */
function fitFallback(html: string): string {
  const blocks = html.match(/<noscript>[\s\S]*?<\/noscript>/g) ?? [];
  return blocks.filter((block) => block.includes("fit__fallback")).join("\n");
}

describe("assembled homepage carries the §24 qualification flow", () => {
  let html: string;

  beforeAll(async () => {
    html = await renderPage(IndexPage as unknown as AstroComponentFactory);
  });

  // Positive control: the qualifier section is actually on the composed page as
  // a labelled landmark, so a "clean" fallback result cannot come from a page
  // that dropped the section entirely.
  it("renders the qualifier section as a labelled landmark (§12.1)", () => {
    expect(html).toContain(fitSectionCopy.headline);
    expect(html).toContain('aria-labelledby="fit-heading"');
    expect(html).toContain('id="fit-heading"');
  });

  it("mounts the interactive qualifier as a hydrated island (§18.5)", () => {
    expect(html).toContain("astro-island");
    // The island server-renders its first question, so there is a useful view
    // before hydration too.
    expect(html).toContain(questionNodes()[0].prompt);
  });

  it("ships a no-JavaScript fallback with the full qualification summary (§24, §12.4)", () => {
    const fallback = fitFallback(html);
    expect(fallback).not.toBe("");
    // Every question is surfaced so a no-JS visitor sees the whole path.
    for (const question of questionNodes()) {
      expect(fallback).toContain(question.prompt);
    }
  });

  it("surfaces every specified branch outcome in the fallback (§24, §12.3)", () => {
    const fallback = fitFallback(html);
    for (const result of resultNodes()) {
      expect(fallback).toContain(result.headline);
      expect(fallback).toContain(result.body);
    }
  });

  it("includes the capacity-no branch's approved outcome (§24, D-005)", () => {
    const fallback = fitFallback(html);
    // D-005's "not the right growth lever today" outcome must be reachable copy
    // in the delivered fallback, not just present in the model.
    const notCurrentFit = resultNodes().find((r) => r.id === "not-current-fit");
    expect(notCurrentFit).toBeDefined();
    expect(fallback).toContain(notCurrentFit!.headline);
    expect(fallback).toContain(notCurrentFit!.body);
  });

  it("shows the Redfern address on both non-qualifying outcomes (P5-005, D-007)", () => {
    const fallback = fitFallback(html);
    const nonQualifying = resultNodes().filter((r) => !r.qualified);
    expect(nonQualifying).toHaveLength(2);
    const addressCount = (fallback.match(/<address/g) ?? []).length;
    expect(addressCount).toBe(nonQualifying.length);
    expect(fallback).toContain(REDFERN_ADDRESS);
  });

  it("routes every positive outcome to the single approved CTA (§24, §13, §20.3)", () => {
    const fallback = fitFallback(html);
    // The fallback carries exactly one conversion action, using the one approved
    // label and analytics event — no competing "invest"/"build" split (§13).
    expect(fallback).toContain(primaryCta.label);
    expect(fallback).toContain(
      `data-analytics-event="${primaryCta.analyticsEvent}"`,
    );
    const ctaCount = (
      fallback.match(/data-analytics-event="cta_click"/g) ?? []
    ).length;
    expect(ctaCount).toBe(1);
    // Every qualifying outcome in the model is a CTA route (no address); the two
    // non-qualifying ones point at the address instead. This is the data behind
    // the single rendered CTA above.
    const qualified = resultNodes().filter((r) => r.qualified);
    expect(qualified).toHaveLength(3);
    for (const outcome of qualified) {
      expect(outcome.address).toBeUndefined();
    }
  });
});
