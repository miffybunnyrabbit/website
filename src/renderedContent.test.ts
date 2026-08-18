import { describe, it, expect, beforeAll } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import reactRenderer from "@astrojs/react/server.js";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import IndexPage from "./pages/index.astro";
import {
  publishedCaseStudies,
  REQUIRED_CASE_STUDY_SLUGS,
  REMOVED_CASE_STUDY_SLUGS,
} from "./config/caseStudies";
import { marqueeLogos, REMOVED_BRANDS } from "./config/logos";
import { openQueueItems } from "./config/approvalQueue";

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

/** The case-study slugs a still-open queue item currently tracks. */
function openlyTrackedCaseStudies(): Set<string> {
  return new Set(
    openQueueItems().flatMap((item) =>
      item.coverage
        .filter((c) => c.kind === "case-study" && c.ref)
        .map((c) => c.ref as string),
    ),
  );
}

describe("assembled homepage represents logos and content per the §24 queue state", () => {
  let html: string;

  beforeAll(async () => {
    html = await renderPage(IndexPage as unknown as AstroComponentFactory);
  });

  it("renders exactly the model's published case studies — no hardcoded or dropped panel (§24, §8.5, §20.1)", () => {
    const published = publishedCaseStudies();
    // The rendered card count must equal the published set: a hardcoded panel
    // pushes it above, a dropped `<CaseStudies />` pushes it to zero.
    expect(caseCardCount(html)).toBe(published.length);
    // Every published study's name must actually reach the visitor.
    for (const study of published) {
      expect(html).toContain(study.name);
    }
  });

  it("keeps the removed Xylo study off the page as a case-study panel (§24, §9.6, D-008)", () => {
    // Guard the fixture: the removal must still be declared, or this test would
    // pass vacuously if the slug were ever dropped from the register.
    expect(REMOVED_CASE_STUDY_SLUGS).toContain("xylo");
    const publishedSlugs = new Set(publishedCaseStudies().map((s) => s.slug));
    for (const removed of REMOVED_CASE_STUDY_SLUGS) {
      // A removed study may keep its *logo* in the marquee (D-008), but must
      // never surface as a published case-study panel.
      expect(publishedSlugs.has(removed)).toBe(false);
    }
  });

  it("represents each required case study per the latest queue state — approved copy on the page, tracked draft otherwise (§24)", () => {
    const published = new Map(publishedCaseStudies().map((s) => [s.slug, s]));
    const tracked = openlyTrackedCaseStudies();
    for (const slug of REQUIRED_CASE_STUDY_SLUGS) {
      const study = published.get(slug);
      if (study) {
        // Approved-and-published: the approved copy is actually on the page.
        expect(html).toContain(study.name);
      } else {
        // Not yet published: it must still be tracked as an open queue item so it
        // is a deliberate draft, never a silently missing study.
        expect(tracked.has(slug)).toBe(true);
      }
    }
  });

  it("keeps every published case study approved or covered by an open queue item (§24)", () => {
    const tracked = openlyTrackedCaseStudies();
    for (const study of publishedCaseStudies()) {
      const approved = study.approvalStatus === "approved";
      // §24: every case-study claim on the page is either approved or covered by
      // an open approval-queue item — a rendered study may not be both unapproved
      // and untracked.
      expect(approved || tracked.has(study.slug)).toBe(true);
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
