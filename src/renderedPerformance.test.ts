import { describe, it, expect, beforeAll } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import reactRenderer from "@astrojs/react/server.js";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import IndexPage from "./pages/index.astro";
import NotFoundPage from "./pages/404.astro";
import {
  assertRenderedWithinBudget,
  auditRenderedPerformance,
  HYDRATED_ISLAND_COMPONENT,
  type RenderedPage,
} from "./config/performanceBudget";

/**
 * Assembled-page performance gate (implementation plan P7-006, §18.2/§18.5).
 *
 * `performanceBudget.ts` unit-tests the scanner against fixtures, but nothing
 * rendered the *actual* routes and checked the invariants the measured budget
 * depends on. That left a hole: a future edit could embed a Calendly iframe,
 * switch the qualifier to eager `client:load`, or hydrate a second component —
 * each blowing the P7-006 budget — while every existing test stayed green, since
 * the models still validate and no banned copy appears. This is that gate: it
 * renders the whole page tree (including the server-rendered React island) to the
 * same HTML a visitor receives and asserts no third-party embed loads initially,
 * that the only hydrated island is the fit qualifier, and that it hydrates
 * lazily.
 *
 * The Lighthouse scores and Core Web Vitals themselves can only be measured by a
 * real Lighthouse run (Phase 8/9 CI); this gate guards the rendered-output
 * invariants that make those numbers achievable and that can regress in a single
 * edit.
 *
 * Like its sibling gates, this file deliberately lives at `src/` rather than
 * `src/pages/`: Astro treats every file under `src/pages/` as a route and bundles
 * it into the SSR entry, so a `.test.ts` there pulls `vitest` into `astro build`
 * and crashes it. It still runs under the `src/**` vitest glob.
 */
async function renderPage(Component: AstroComponentFactory): Promise<string> {
  const container = await AstroContainer.create();
  // Register the React renderer so the fit-qualifier island is emitted as a real
  // <astro-island>, exactly as a visitor's initial HTML carries it.
  container.addServerRenderer({ renderer: reactRenderer });
  container.addClientRenderer({
    name: "@astrojs/react",
    entrypoint: "@astrojs/react/client.js",
  });
  return container.renderToString(Component);
}

describe("assembled pages stay within the performance budget (P7-006)", () => {
  let home: string;
  let sources: RenderedPage[];

  beforeAll(async () => {
    home = await renderPage(IndexPage as unknown as AstroComponentFactory);
    const notFound = await renderPage(
      NotFoundPage as unknown as AstroComponentFactory,
    );
    sources = [
      { label: "/", html: home },
      { label: "/404", html: notFound },
    ];
  });

  it("ships every route within the rendered-page budget", () => {
    // The single readable assertion that powers the build gate.
    expect(() => assertRenderedWithinBudget(sources)).not.toThrow();
  });

  it("reports no per-rule violations on any route", () => {
    for (const source of sources) {
      expect(auditRenderedPerformance(source.html)).toEqual([]);
    }
  });

  it("loads no third-party iframe/embed on the homepage (booking is a link)", () => {
    expect(home).not.toMatch(/<iframe\b/i);
    expect(home).not.toMatch(/<embed\b/i);
    expect(home).not.toMatch(/<object\b/i);
  });

  it("hydrates exactly one island, the fit qualifier, and defers it", () => {
    const islands = home.match(/<astro-island\b[^>]*>/g) ?? [];
    expect(islands).toHaveLength(1);
    expect(islands[0]).toContain(HYDRATED_ISLAND_COMPONENT);
    expect(islands[0]).toMatch(/\bclient=["'](visible|idle|media)["']/);
  });

  it("hydrates nothing on the 404 page", () => {
    const notFound = sources.find((s) => s.label === "/404")!.html;
    expect(notFound.match(/<astro-island\b/g) ?? []).toHaveLength(0);
  });

  // Meta-guard: prove the gate actually inspects the real rendered output. If an
  // embed is spliced into the genuine homepage HTML, the assertion must catch it
  // and name the route — otherwise a passing suite would be meaningless.
  it("would fail the build if an embed reached the rendered output", () => {
    const poisoned: RenderedPage[] = [
      { label: "/", html: `${home}\n<iframe src="https://calendly.com/embed"></iframe>` },
    ];
    expect(() => assertRenderedWithinBudget(poisoned)).toThrow(/third-party-embed/);
    expect(() => assertRenderedWithinBudget(poisoned)).toThrow(
      /^Performance-budget violations/,
    );
  });
});
