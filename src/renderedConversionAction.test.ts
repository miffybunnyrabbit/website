import { describe, it, expect, beforeAll } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import reactRenderer from "@astrojs/react/server.js";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import IndexPage from "./pages/index.astro";
import { primaryCta, PRIMARY_CTA_LABEL } from "./config/cta";

/**
 * Assembled-page conversion-action gate (implementation plan §24 "Message" —
 * "There is one primary conversion action" — with §13, §20.3, and integration
 * test 8.2).
 *
 * The whole site funnels to one booking action, and the plan is emphatic about
 * how: "Every primary CTA must use one label, one URL source, and one analytics
 * event" (§5), and "the button must read its URL from one central configuration
 * value — do not hardcode the Calendly URL in multiple components" (§13). The
 * conversion action is the single most important thing on the page, yet it is the
 * most *distributed*: it is emitted from four different components — the header,
 * the hero, the no-JavaScript fit fallback, and the closing CTA — and the label
 * for two of them is sourced from *separate* content models (`headerNav.ctaLabel`
 * and `hero.ctaLabel`), not from `primaryCta` itself.
 *
 * `cta.test.ts` validates the `primaryCta` config, and `navigation.test.ts` /
 * `hero.test.ts` each check their own `ctaLabel` equals `PRIMARY_CTA_LABEL` — but
 * every one of those tests looks at a single model *in isolation*. None renders
 * the assembled page and proves the four CTAs a visitor actually receives agree
 * with one another. That left the exact hole the sibling rendered gates were
 * written to close for the message, logos, qualification, visual-fidelity, and
 * footer dimensions: a regression that changed `headerNav.ctaLabel`, hardcoded a
 * second Calendly URL into `FinalCta.astro`, dropped the analytics-event marker
 * off one anchor (so it silently stops tracking `cta_click`), or deleted an
 * entire CTA placement would ship a page with two competing "primary" actions —
 * or a dead one — while every existing config test stayed green.
 *
 * This gate renders the real page tree — including the server-rendered React
 * island — to the same HTML a visitor receives and asserts, over the composed
 * output, that there is genuinely *one* conversion action: every CTA carries the
 * one approved label, the one analytics event, and a single shared URL source,
 * and each required placement is present. Every assertion is driven off the
 * `primaryCta` model so the page and the config cannot drift.
 *
 * A note on the booking URL: `primaryCta.href` reads from `PUBLIC_CALENDLY_URL`
 * at build time, which is intentionally unset in an env-less build (§9.3), so
 * each CTA renders with *no* `href` attribute here. That does not weaken the
 * single-URL-source check — it strengthens it. Because every config-driven CTA
 * reads the same (absent) value, their rendered `href` is identical; a component
 * that hardcoded its own booking URL would be the one anchor carrying an `href`,
 * breaking the mutual-identity assertion below. The check therefore catches a
 * divergent URL whether or not the environment supplies one.
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
  // Register the React renderer so the fit-qualifier island is part of the
  // composed output — matching the exact HTML a visitor receives, so a CTA the
  // island ever server-renders would be held to the same invariants.
  container.addServerRenderer({ renderer: reactRenderer });
  container.addClientRenderer({
    name: "@astrojs/react",
    entrypoint: "@astrojs/react/client.js",
  });
  return container.renderToString(Component);
}

/** Every `<a>…</a>` element on the page, whole tag plus contents, in DOM order. */
function anchors(html: string): string[] {
  return html.match(/<a\b[^>]*>[\s\S]*?<\/a>/g) ?? [];
}

/** The value of `attr` on an anchor, or `null` when the attribute is absent. */
function attr(anchor: string, name: string): string | null {
  const match = anchor.match(new RegExp(`\\s${name}="([^"]*)"`));
  return match ? match[1] : null;
}

/** The visible text of an anchor: inner markup stripped of tags and trimmed. */
function text(anchor: string): string {
  const inner = anchor.replace(/^<a\b[^>]*>/, "").replace(/<\/a>$/, "");
  return inner.replace(/<[^>]*>/g, "").trim();
}

/**
 * The four components the plan requires to funnel to the single action: the
 * header CTA (§8.1), the hero CTA (§8.2), the no-JavaScript fit fallback CTA
 * (§12.4, P5-005), and the closing CTA (§13). Each is identified by the class its
 * component renders, so a dropped placement is caught by name rather than merely
 * shrinking a count.
 */
const REQUIRED_CTA_CLASSES = [
  "site-header__cta",
  "hero__cta",
  "fit__fallback-cta",
  "final-cta__button",
] as const;

describe("assembled homepage offers exactly one primary conversion action", () => {
  let html: string;
  /** Anchors carrying the one approved analytics event — the tracked CTAs. */
  let tracked: string[];
  /** Anchors whose visible text is the one approved CTA label. */
  let labelled: string[];

  beforeAll(async () => {
    html = await renderPage(IndexPage as unknown as AstroComponentFactory);
    const all = anchors(html);
    tracked = all.filter(
      (a) => attr(a, "data-analytics-event") === primaryCta.analyticsEvent,
    );
    labelled = all.filter((a) => text(a) === PRIMARY_CTA_LABEL);
  });

  it("renders every required CTA placement on the composed page (§8.1, §8.2, §12.4, §13)", () => {
    // Positive control: each of the four funnel components contributes exactly
    // one CTA, so a dropped `<FinalCta />`, `<Header />` action, hero button, or
    // no-JS fallback fails here — the assertions below cannot pass vacuously on a
    // page that shipped no CTA at all.
    for (const cls of REQUIRED_CTA_CLASSES) {
      // Match by class-list membership, not exact equality: each CTA now also
      // carries the shared `cta-button` mint primitive (VD-102/VD-104) alongside
      // its per-placement class, so the attribute is a space-separated list.
      const forClass = tracked.filter((a) =>
        (attr(a, "class") ?? "").split(/\s+/).includes(cls),
      );
      expect(forClass).toHaveLength(1);
    }
    // At least the four static placements are present. The fit island renders a
    // further per-outcome CTA once a visitor answers; that is not in the initial
    // server HTML, so this is a lower bound, not an exact count.
    expect(tracked.length).toBeGreaterThanOrEqual(REQUIRED_CTA_CLASSES.length);
  });

  it("gives every CTA the one approved label (§5, §13, §20.3)", () => {
    // No component may ship its own wording — the "inconsistent primary CTA
    // labels" failure the plan calls out — even though the header's and hero's
    // labels come from separate content models.
    for (const cta of tracked) {
      expect(text(cta)).toBe(PRIMARY_CTA_LABEL);
    }
  });

  it("ties the approved label and the approved event to the same set of anchors (§20.3)", () => {
    // The label-bearing anchors and the event-bearing anchors must be one and the
    // same set. This catches both silent regressions the single-direction checks
    // miss: a CTA that renders the right label but lost its analytics event (so it
    // stops tracking `cta_click`), and one that is tracked but carries divergent
    // wording. Compared as sorted markup so membership, not order, is what matters.
    const sortedTracked = [...tracked].sort();
    const sortedLabelled = [...labelled].sort();
    expect(sortedLabelled).toEqual(sortedTracked);
    // Non-vacuous: there really are CTAs to compare.
    expect(sortedTracked.length).toBeGreaterThan(0);
  });

  it("reads every CTA's booking URL from the one central source (§13)", () => {
    // One URL source: every CTA's rendered `href` matches what `primaryCta.href`
    // renders to — the same absent value in an env-less build, or the same
    // Calendly URL when the environment supplies one. A component that hardcoded a
    // second URL would be the lone anchor whose `href` differs.
    const expected = primaryCta.href ?? null;
    for (const cta of tracked) {
      expect(attr(cta, "href")).toBe(expected);
    }
    // Stated the other way, so a future refactor that keeps the model equal but
    // splits the rendered values still trips: the CTAs share a single href value.
    const distinct = new Set(tracked.map((cta) => attr(cta, "href")));
    expect(distinct.size).toBe(1);
  });

  it("opens every CTA booking link in a safe new tab", () => {
    for (const cta of tracked) {
      expect(attr(cta, "target")).toBe(primaryCta.target);
      expect(attr(cta, "rel")).toBe(primaryCta.rel);
    }
  });

  it("emits the one approved analytics event, and only it, from the CTAs (§20.3, R-011)", () => {
    // The tracked set is selected by event, so assert the event value itself is
    // the approved constant rather than trusting the selector — a CTA firing some
    // other event would fall out of `tracked` and be caught above as an unlabelled
    // gap, while this pins the surviving value to the model.
    const events = new Set(
      tracked.map((cta) => attr(cta, "data-analytics-event")),
    );
    expect([...events]).toEqual([primaryCta.analyticsEvent]);
    expect(primaryCta.analyticsEvent).toBe("cta_click");
  });
});
