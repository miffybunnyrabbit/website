import { describe, it, expect, beforeAll } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import reactRenderer from "@astrojs/react/server.js";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import IndexPage from "./pages/index.astro";
import {
  PROHIBITED_WORDING,
  scanProhibitedWording,
} from "./config/engagementModel";

/**
 * Assembled-page prohibited-wording gate (implementation plan §24 "Message",
 * §11.7, §4).
 *
 * §24 requires that "the public wording does not imply a guaranteed result, a
 * universal financial instrument, an employment relationship, or a mandatory
 * sale of the company". §11.7 turns that into the concrete
 * `PROHIBITED_WORDING` ruleset in `engagementModel.ts`: an employment
 * relationship, being on the payroll, a guaranteed result/instrument, the
 * universal "get paid when you get paid" claim, a mandatory company sale, and a
 * fiduciary/agency/directorship representation.
 *
 * `engagementModel.test.ts` proves that ruleset fires, and the build-time
 * `validateEngagementModel` gate scans the copy *model* — the how-we-work and
 * why-helix config (`governedCopySources`) — for every rule. But that scan only
 * sees the strings the models export. It does not see the assembled page. A
 * §11.7-prohibited phrase hardcoded straight into `HowWeWork.astro`,
 * `WhyHelix.astro`, `Hero.astro`, or any other component's markup — a heading,
 * an intro, a closing line, alt text — never passes through
 * `governedCopySources`, so the engagement-model gate cannot see it. The
 * `forbiddenCopy` ruleset that `renderedCopy.test.ts` enforces governs a
 * different vocabulary (the removed brands, the retired people/ventures copy,
 * "market domination"), not these commercial-promise phrasings. That leaves a
 * real hole: a single edit that baked "we guarantee the outcome" or "you must
 * sell the company" into a component would ship the exact misrepresentation
 * §11.7 exists to prevent while every model test stayed green.
 *
 * This gate closes it: it renders the real page a visitor receives and asserts
 * none of the §11.7 prohibited wording survives assembly, wherever a component
 * might place it, driven off the same `PROHIBITED_WORDING`/`scanProhibitedWording`
 * pair the build-time gate reads so the page and the governance cannot drift.
 * The scan is deliberately whole-page rather than region-scoped: unlike the
 * footer's Redfern draft (which legitimately reappears in the fit qualifier),
 * these promises must appear *nowhere* in public output, so any occurrence is a
 * defect regardless of which section produced it.
 *
 * The pre-commit hook runs the test suite, so a failure here blocks the commit.
 *
 * Like its sibling gates, this file deliberately lives at `src/` rather than
 * `src/pages/`: Astro treats every file under `src/pages/` as a route and bundles
 * it into the SSR entry, so a `.test.ts` there pulls `vitest` into `astro build`
 * and crashes it. It still runs under the `src/**` vitest glob.
 */
async function renderPage(Component: AstroComponentFactory): Promise<string> {
  const container = await AstroContainer.create();
  // Register the React renderer so the fit-qualifier island renders too, matching
  // the exact HTML a visitor receives — its outcome copy is public wording the
  // §11.7 rules govern just as much as the static sections.
  container.addServerRenderer({ renderer: reactRenderer });
  container.addClientRenderer({
    name: "@astrojs/react",
    entrypoint: "@astrojs/react/client.js",
  });
  return container.renderToString(Component);
}

describe("assembled homepage carries no §11.7 prohibited wording (§24)", () => {
  let html: string;

  beforeAll(async () => {
    html = await renderPage(IndexPage as unknown as AstroComponentFactory);
  });

  it("guards the fixture: there are prohibited-wording rules to enforce (§11.7)", () => {
    // The whole-page scan below is only meaningful while the ruleset is
    // populated; an empty ruleset would make every assertion pass vacuously.
    expect(PROHIBITED_WORDING.length).toBeGreaterThan(0);
  });

  it("ships none of the §11.7 prohibited commercial-promise wording (§24, §4)", () => {
    // Scan the exact bytes the visitor receives for every rule at once, so the
    // failure message names every offending phrase and the rule it broke —
    // whether it was hardcoded into a component or leaked through a model.
    const hits = scanProhibitedWording("assembled-page", html);
    expect(hits).toEqual([]);
  });

  it("catches a prohibited phrase baked into the rendered output (meta-test)", () => {
    // Prove the scan actually fires on the assembled markup: inject a guaranteed
    // -result phrase into a copy of the page and confirm it is caught. Without
    // this, a scan that silently matched nothing (wrong source, escaped markup)
    // would let the gate above pass vacuously.
    const poisoned = html.replace(
      "</body>",
      "<p>We guarantee the outcome.</p></body>",
    );
    const hits = scanProhibitedWording("poisoned", poisoned);
    expect(hits.some((hit) => hit.id === "guaranteed-result")).toBe(true);
  });
});
