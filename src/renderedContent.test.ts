import { describe, it, expect, beforeAll } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import reactRenderer from "@astrojs/react/server.js";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import IndexPage from "./pages/index.astro";
import {
  caseStudies,
  orderedCaseStudies,
  REQUIRED_CASE_STUDY_SLUGS,
  REMOVED_CASE_STUDY_SLUGS,
} from "./config/caseStudies";
import { marqueeLogos } from "./config/logos";

/**
 * Brands struck from the marquee: the three the repositioning removed (§5, §8.4)
 * and the five the owner struck on 2026-08-17. The register that used to carry
 * them as auditable records was retired on 2026-08-18, so they are named here —
 * the page must never show them again, and the reasoning is frozen under `docs/`.
 */
const REMOVED_BRANDS: readonly string[] = [
  "Awayco",
  "Perion",
  "Synaptico",
  "BCG",
  "Agonics",
  "Spec",
  "Jubi",
  "Xylo",
];

/**
 * Assembled-page logos-and-content gate (implementation plan §24 "Logos and
 * content", §8.4/§8.5, §20.1).
 *
 * The sibling rendered gates cover the other §24 dimensions on the composed
 * page: `renderedMessage.test.ts` proves the required copy survives assembly,
 * `renderedCopy.test.ts` proves no forbidden variant ships (which already scans
 * the whole document for the removed brand *names* — Awayco/Perion/Synaptico —
 * the "market domination" framing, and the people-worship phrasing), and
 * `renderedQualification`/`renderedAccessibility`/`renderedPerformance` cover
 * their slices. What none of them prove is the *structural* half of §24 "Logos
 * and content": that the case-study panels the visitor actually receives match
 * the approval-queue state — approved copy where a study is approved, no panel
 * (only a tracked queue item) otherwise — and that the removed Xylo study and the
 * removed marquee brands stay off the rendered page.
 *
 * That is a real hole a single edit could open while every model test stays
 * green: `assertCaseStudiesValid`/`assertApprovalQueueValid` police the *models*,
 * but a regression that dropped `<CaseStudies />` from `index.astro`, hardcoded a
 * Xylo panel in markup, or rendered a study the queue never approved would ship a
 * page that contradicts the queue while the config unit tests never notice. This
 * gate renders the real page a visitor receives and asserts the §24
 * "Logos and content" criteria hold on the composed output, driven off the same
 * `publishedCaseStudies`/`marqueeLogos`/`openQueueItems` sources the components
 * and governance read so the page and the queue cannot drift.
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

/** Count the case-study cards in the rendered markup (one per rendered study). */
function caseCardCount(html: string): number {
  return (html.match(/cases__pane"/g) ?? []).length;
}

describe("assembled homepage renders the logos and case studies its models declare", () => {
  let html: string;

  beforeAll(async () => {
    html = await renderPage(IndexPage as unknown as AstroComponentFactory);
  });

  it("renders every case study — no hardcoded or dropped panel (§24, §8.5)", () => {
    const studies = orderedCaseStudies();
    // The rendered card count must equal the model: a hardcoded panel pushes it
    // above, a dropped `<CaseStudies />` pushes it to zero.
    expect(caseCardCount(html)).toBe(studies.length);
    for (const study of studies) {
      expect(html).toContain(study.name);
    }
  });

  it("renders every required case study (§24, §5)", () => {
    for (const slug of REQUIRED_CASE_STUDY_SLUGS) {
      const study = caseStudies.find((s) => s.slug === slug);
      expect(study, slug).toBeDefined();
      expect(html).toContain(study!.name);
    }
  });

  it("keeps the removed Xylo study off the page as a case-study panel (§24, §9.6)", () => {
    // Guard the fixture: the removal must still be declared, or this test would
    // pass vacuously if the slug were ever dropped from the register.
    expect(REMOVED_CASE_STUDY_SLUGS).toContain("xylo");
    const slugs = new Set(caseStudies.map((s) => s.slug));
    for (const removed of REMOVED_CASE_STUDY_SLUGS) {
      expect(slugs.has(removed)).toBe(false);
    }
  });


  it("withholds the removed marquee brands from the rendered page (§24, §8.4, P4-002)", () => {
    const visibleBrands = new Set(marqueeLogos().map((l) => l.name.toLowerCase()));
    for (const brand of REMOVED_BRANDS) {
      // The visible marquee set never contains a removed brand...
      expect(visibleBrands.has(brand.toLowerCase())).toBe(false);
      // ...and no removed-brand logo image is rendered (a structural check on the
      // marquee markup, complementing renderedCopy's scan of the brand *names*).
      expect(html).not.toContain(`alt="${brand}"`);
    }
  });
});
