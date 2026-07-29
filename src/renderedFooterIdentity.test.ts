import { describe, it, expect, beforeAll } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import reactRenderer from "@astrojs/react/server.js";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import IndexPage from "./pages/index.astro";
import { footer, publishedFooter } from "./config/footer";
import { openQueueItems } from "./config/approvalQueue";

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

/** Ids of open queue items that cover footer identity (§23, currently Q-0010). */
function openFooterIdentityQueueIds(): Set<string> {
  return new Set(
    openQueueItems()
      .filter((item) => item.coverage.some((c) => c.kind === "footer-identity"))
      .map((item) => item.id),
  );
}

describe("assembled homepage represents footer identity per the §24 queue state", () => {
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

  it("guards the fixture: the footer still ships pending identity facts (§14, §23)", () => {
    // The withholding assertions below are only meaningful while at least one
    // fact is still awaiting sign-off. If every fact were approved this test would
    // flag that the fixture no longer exercises the withhold path.
    expect(footer.facts.length).toBeGreaterThan(0);
    expect(footer.facts.some((f) => f.approval === "pending")).toBe(true);
  });

  it("always renders the safe brand mark and copyright line (§14)", () => {
    // The always-safe parts render regardless of the queue state, so the footer is
    // never an empty shell even while every identity fact is withheld.
    expect(region).toContain(footer.brand.label);
    expect(region).toContain(`${footer.copyrightHolder}. All rights reserved.`);
  });

  it("shows approved identity facts and withholds pending drafts from the footer (§14, §20.1, §23)", () => {
    const publishedFactIds = new Set(publishedFooter().facts.map((f) => f.id));
    for (const fact of footer.facts) {
      if (publishedFactIds.has(fact.id)) {
        // Approved-and-published: the confirmed value is actually on the page.
        expect(region).toContain(fact.value);
      } else {
        // Pending: its best-available draft must never leak into the rendered
        // footer — scoped to the footer region so the fit qualifier's legitimate
        // reuse of the Redfern address does not create a false positive.
        expect(region).not.toContain(fact.value);
      }
    }
  });

  it("leaks no draft marker into the rendered footer (§14, §20.1)", () => {
    // Defence in depth beyond the value check above: a hardcoded `[VERIFY:]` /
    // `[RESEARCH:]` draft baked directly into the footer markup would be caught
    // here even if it did not match a model fact's value verbatim.
    expect(region.toLowerCase()).not.toContain("[verify");
    expect(region.toLowerCase()).not.toContain("[research");
  });

  it("tracks every pending footer fact with an open footer-identity queue item (§23, §24)", () => {
    const openIds = openFooterIdentityQueueIds();
    const pending = footer.facts.filter((f) => f.approval === "pending");
    if (pending.length > 0) {
      // §24: pending identity content on the page is never silently untracked —
      // an open footer-identity item must exist to keep the queue and the site in
      // sync.
      expect(openIds.size).toBeGreaterThan(0);
    }
    for (const fact of pending) {
      // Each withheld fact points at the real open queue item that will clear it.
      expect(openIds.has(fact.queueItem)).toBe(true);
    }
  });
});
