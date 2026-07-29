import { describe, it, expect, beforeAll } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import reactRenderer from "@astrojs/react/server.js";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import IndexPage from "./pages/index.astro";
import { HERO_HEADLINE } from "./config/hero";
import { proofBanner, publishedProofBanner } from "./config/proofBanner";
import { whyHelixPoints, whyHelixCopy } from "./config/whyHelix";
import {
  howWeWorkSteps,
  howWeWorkCopy,
  REQUIRED_COMMITMENT_FRAGMENTS,
} from "./config/howWeWork";
import { PRIMARY_CTA_LABEL } from "./config/cta";

/**
 * Assembled-page message gate (implementation plan §24 "Message" and "Logos and
 * content", §5 fixed requirements).
 *
 * The other two rendered gates are *negative* and *structural*:
 * `renderedCopy.test.ts` proves the page ships no forbidden copy, and
 * `renderedAccessibility.test.ts` proves the composed document is well-formed.
 * Neither proves the page actually *says what §24 requires it to say*. Each
 * section's content model is unit-tested in isolation, but nothing rendered the
 * whole page and confirmed the required message survived assembly. That left a
 * hole: a regression that dropped `<ProofBanner />` from `index.astro`, stopped
 * mapping the differentiation points, or blanked a how-we-work stage would keep
 * every existing test green — the models still validate, no banned phrase
 * appears, and the heading outline still parses — while the visitor loses a
 * fixed requirement. This is the positive counterpart: it renders the real page
 * a visitor receives and asserts the §24 acceptance-criteria copy is present,
 * driven by the same content models the components read so the two cannot drift.
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

describe("assembled homepage carries the required §24 message", () => {
  let html: string;
  let lower: string;

  beforeAll(async () => {
    html = await renderPage(IndexPage as unknown as AstroComponentFactory);
    lower = html.toLowerCase();
  });

  it("leads with the enterprise-value promise (§24, §5)", () => {
    expect(html).toContain(HERO_HEADLINE);
    // The first major headline must make Helix's enterprise-value role explicit.
    expect(HERO_HEADLINE.toLowerCase()).toContain("enterprise value");
  });

  it("shows the $500M+ and 10+ years proof figures in the banner (§24, §5)", () => {
    // §5 makes the proof banner a fixed, always-shown requirement — assert it is
    // actually published and rendered, not merely well-formed in the model.
    expect(publishedProofBanner()).not.toBeNull();
    for (const metric of proofBanner.metrics) {
      expect(html).toContain(metric.value);
      expect(html).toContain(metric.label);
    }
  });

  it("keeps the 'We're different' partnership model on the page (§24, §10)", () => {
    expect(html).toContain(whyHelixCopy.headline);
    for (const point of whyHelixPoints) {
      // The heading and the meaning that must survive copy editing (§10) both
      // reach the visitor.
      expect(html).toContain(point.title);
      for (const concept of point.requiredConcepts) {
        expect(lower).toContain(concept.toLowerCase());
      }
    }
  });

  it("keeps 'How we work' as a separate four-stage section (§24, §11)", () => {
    expect(lower).toContain(howWeWorkCopy.eyebrow.toLowerCase());
    expect(howWeWorkSteps).toHaveLength(4);
    for (const step of howWeWorkSteps) {
      expect(html).toContain(step.number);
      expect(html).toContain(step.title);
      // §24 requires more than the stage *label* reach the visitor: each stage's
      // meaning "must survive copy editing" (§11.1–11.4) — stage one built at
      // Helix's own cost/time, stage two paid-as-we-deliver plus back-end upside
      // and board alignment, stage three embedded delivery against agreed
      // objectives, stage four sustainable handover, clean exit, and gain-share.
      // The model pins those as per-stage `requiredConcepts`; assert they reach
      // the composed page (as WhyHelix does above), so a regression that dropped
      // the `<p class="how__step-body">` line — shipping numbered, titled but
      // meaningless stages — fails here instead of silently stripping the §24
      // message. Driven off the model so the two cannot drift.
      for (const concept of step.requiredConcepts) {
        expect(lower).toContain(concept.toLowerCase());
      }
    }
  });

  it("communicates the 'others promise / money where our mouth is' commitment (§24, §11.5)", () => {
    // §24 requires the headline *or* the closing line to carry the commitment;
    // matching the model's fragments case-insensitively holds wherever it lives.
    const carried = REQUIRED_COMMITMENT_FRAGMENTS.some((fragment) =>
      lower.includes(fragment.toLowerCase()),
    );
    expect(carried).toBe(true);
  });

  it("offers the single primary conversion action (§24, §13, §20.3)", () => {
    expect(html).toContain(PRIMARY_CTA_LABEL);
  });
});
