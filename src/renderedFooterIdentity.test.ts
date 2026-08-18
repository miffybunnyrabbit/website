import { describe, it, expect, beforeAll } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import reactRenderer from "@astrojs/react/server.js";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import IndexPage from "./pages/index.astro";
import { footer, publishedFooter } from "./config/footer";

/**
 * Assembled-page footer-identity gate (implementation plan §24 "Logos and
 * content"/"Operational", §14, §23, §20.1).
 *
 * The footer carries the site's institutional identity — legal entity, ABN,
 * registered office — none of which is yet a recorded owner decision. The model
 * (`src/config/footer.ts`) keeps each fact `pending` with a best-available draft
 * and a `docs/approvals/queue` item, and `Footer.astro` renders only
 * `publishedFooter()` so an unverified ABN, entity, or office never reaches
 * `dist` (§14, §23). `footer.test.ts` proves that on the *model*, and
 * `approvalQueue.test.ts` proves every pending footer fact is tracked by an open
 * footer-identity queue item.
 *
 * What none of them prove is that the guarantee survives *assembly*: that the
 * page a visitor actually receives still carries the footer, still withholds
 * every pending draft from the footer region, and still shows only approved
 * facts. That is a real hole a single edit could open while every model test
 * stays green — a regression that dropped `<Footer />` from `index.astro`,
 * hardcoded an ABN or `[VERIFY:]` draft into the footer markup, or rendered the
 * full model instead of `publishedFooter()` would ship a footer that contradicts
 * the queue while the config unit tests never notice. This gate renders the real
 * page and asserts the §24 footer-identity criteria hold on the composed output,
 * driven off the same `footer`/`publishedFooter`/`openQueueItems` sources the
 * component and governance read so the page and the queue cannot drift.
 *
 * The scope is deliberately the footer *region*, not the whole document: the
 * pending registered-office draft is the same Redfern address the fit qualifier
 * legitimately shows on its non-qualifying outcomes (§12.3, `REDFERN_ADDRESS`),
 * so a whole-page absence check would be both wrong and flaky. Extracting the
 * `<footer>` element isolates the identity surface these criteria govern.
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
  // the exact HTML a visitor receives.
  container.addServerRenderer({ renderer: reactRenderer });
  container.addClientRenderer({
    name: "@astrojs/react",
    entrypoint: "@astrojs/react/client.js",
  });
  return container.renderToString(Component);
}

/**
 * The `<footer class="site-footer">…</footer>` element as it renders on the
 * assembled page. Returns `undefined` if the footer is absent — a dropped
 * `<Footer />` — which the presence test below turns into a failure.
 */
function footerRegion(html: string): string | undefined {
  return html.match(/<footer class="site-footer"[\s\S]*?<\/footer>/)?.[0];
}

describe("assembled homepage renders the footer identity facts (§14)", () => {
  let html: string;
  let region: string;

  beforeAll(async () => {
    html = await renderPage(IndexPage as unknown as AstroComponentFactory);
    const found = footerRegion(html);
    // A missing footer region means `<Footer />` was dropped from the page; fail
    // loudly here rather than letting every downstream assertion pass vacuously.
    expect(found, "assembled page is missing the site footer").toBeTruthy();
    region = found as string;
  });

  it("guards the fixture: the model declares identity facts to render", () => {
    // Without this the assertions below would pass vacuously if the facts were
    // ever emptied out of the model.
    expect(footer.facts.length).toBeGreaterThan(0);
  });

  it("always renders the safe brand mark and copyright line (§14)", () => {
    // The always-safe parts render regardless of the queue state, so the footer is
    // never an empty shell even while every identity fact is withheld.
    expect(region).toContain(footer.brand.label);
    expect(region).toContain(`${footer.copyrightHolder}. All rights reserved.`);
  });

  it("renders every identity fact the model declares (§14)", () => {
    // The legal entity, ABN, and registered office are what make the footer an
    // institutional record rather than a sign-off; each must reach the visitor.
    for (const fact of publishedFooter().facts) {
      expect(region, fact.id).toContain(fact.value);
    }
  });

  it("leaks no draft marker into the rendered footer (§14, §20.1)", () => {
    // Defence in depth beyond the value check above: a hardcoded `[VERIFY:]` /
    // `[RESEARCH:]` draft baked directly into the footer markup would be caught
    // here even if it did not match a model fact's value verbatim.
    expect(region.toLowerCase()).not.toContain("[verify");
    expect(region.toLowerCase()).not.toContain("[research");
  });

});
