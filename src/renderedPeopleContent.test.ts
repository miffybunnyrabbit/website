import { describe, it, expect, beforeAll } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import reactRenderer from "@astrojs/react/server.js";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import IndexPage from "./pages/index.astro";
import { headerNav, FORBIDDEN_NAV_LABEL_TERMS } from "./config/navigation";
import { FORBIDDEN_PATTERNS, scanForbiddenCopy } from "./config/forbiddenCopy";

/**
 * Assembled-page people-and-team gate (implementation plan §24 "Message" — "The
 * site does not rely on named people or team reputation" — and §24 "Logos and
 * content" — "No people/team section remains"; §4, §5 institutional positioning,
 * §8.1 restrained header, P4-001).
 *
 * The sibling rendered gates cover the other §24 dimensions on the composed page,
 * but each leaves this one open. `renderedVisualFidelity` proves no *image*
 * depicts a person (§16.4), which is the visual half of the ban; `renderedCopy`
 * scans the whole document for the specific banned *phrases* ("humans of Helix",
 * "our people are our greatest asset"). Neither proves the *structural* half §24
 * requires: that the delivered page reintroduces no people-led navigation and no
 * people/team section. A single edit could open exactly that hole while every
 * model test and phrase scan stayed green — a hardcoded `<a href="/team">Team</a>`
 * baked into `Header.astro`, or a `<section><h2>Meet the team</h2>…</section>`
 * dropped into `index.astro`, ships the abandoned people-led positioning (§5, §4)
 * without tripping a forbidden *phrase* or a person *image*. `navigation.ts`
 * unit-tests that the *model* header carries no team/investor link, but nothing
 * asserted the *rendered* header does not, and no gate asserted the composed
 * section set stays free of a people/team landmark.
 *
 * This renders the real page a visitor receives and asserts §24's people-and-team
 * criteria on the composed output:
 *  - every header nav link's label and href is clear of the §8.1 people-led /
 *    investor vocabulary (`FORBIDDEN_NAV_LABEL_TERMS`);
 *  - no section-level heading (an `<h1>`/`<h2>` landmark title — deliberately not
 *    the `<h3>` stage titles, one of which legitimately reads "…JOIN THE TEAM…"
 *    about the *client's* operating team, §11.3) names a people/team section;
 *  - the retired people-worship phrasing never survives assembly.
 * The vocabulary and phrase rules are read from the same `navigation.ts` and
 * `forbiddenCopy.ts` models the header validation and the copy guard read, so the
 * page and the governance cannot drift; meta-tests inject a team link, a team
 * heading, and a people-worship phrase to prove each scan actually fires.
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

/** The site header block from the composed page (the one `.site-header`). */
function headerBlock(html: string): string {
  return (html.match(/<header class="site-header"[\s\S]*?<\/header>/) ?? [""])[0];
}

/** Every anchor in a block, as `{ text, href }` (visible text, tags stripped). */
function anchors(block: string): Array<{ text: string; href: string }> {
  return [...block.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({
    href: (m[1].match(/href="([^"]*)"/) ?? ["", ""])[1],
    text: m[2].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(),
  }));
}

/**
 * The visible text of every section-level heading (`<h1>`/`<h2>`) on the page —
 * the landmark titles. Scoped to h1/h2 on purpose: the `<h3>` stage title
 * "…JOIN THE TEAM…" (§11.3) is about the client's operating team, not a Helix
 * people section, so it must not be swept up.
 */
function sectionHeadings(html: string): string[] {
  return [...html.matchAll(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/g)].map((m) =>
    m[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(),
  );
}

/** True when `text` contains any of the people-led / investor nav terms. */
function carriesForbiddenTerm(text: string): string | null {
  const lower = text.toLowerCase();
  return FORBIDDEN_NAV_LABEL_TERMS.find((term) => lower.includes(term)) ?? null;
}

/**
 * The two forbiddenCopy rules that encode the abandoned people-led positioning
 * (§5). Isolated here so the assertion below proves *these* never reach the page,
 * independent of the whole-document scan `renderedCopy` already runs.
 */
const PEOPLE_LED_RULES = FORBIDDEN_PATTERNS.filter((p) =>
  ["humans-of-helix", "greatest-asset"].includes(p.id),
);

describe("assembled homepage relies on no named people or team section (§24, P4-001)", () => {
  let html: string;
  let header: string;

  beforeAll(async () => {
    html = await renderPage(IndexPage as unknown as AstroComponentFactory);
    header = headerBlock(html);
  });

  // Positive control: the restrained header is actually on the page with its
  // three approved anchors, so the "no forbidden link" assertion below cannot
  // pass on a page that dropped the nav entirely.
  it("renders the restrained header with exactly the approved anchor labels (§8.1)", () => {
    expect(header).not.toBe("");
    const linkTexts = anchors(header).map((a) => a.text);
    for (const item of headerNav.items) {
      expect(linkTexts).toContain(item.label);
    }
  });

  it("gives the header no people/team or investor nav link, by label or href (§24, §8.1)", () => {
    // Guard the fixture: there must be terms to enforce, or the scan is vacuous.
    expect(FORBIDDEN_NAV_LABEL_TERMS.length).toBeGreaterThan(0);
    for (const { text, href } of anchors(header)) {
      // A reintroduced "Team"/"People"/"Invest in our ventures" link is caught
      // whether it hides in the visible label or the destination (e.g. /team).
      expect(carriesForbiddenTerm(text)).toBeNull();
      expect(carriesForbiddenTerm(href)).toBeNull();
    }
  });

  it("names no people/team section in any landmark heading (§24)", () => {
    const headings = sectionHeadings(html);
    // Positive control: the page really does render its section headings, so an
    // empty match set cannot make this pass vacuously.
    expect(headings.length).toBeGreaterThan(0);
    for (const heading of headings) {
      // "Meet the team", "Our people", "Humans of Helix", "Our ventures" — a
      // heading that reopens the people-led narrative §5 removes fails here.
      expect(carriesForbiddenTerm(heading)).toBeNull();
    }
  });

  it("carries none of the retired people-worship phrasing (§24 Message, §5)", () => {
    // Guard the fixture: both people-led rules must still exist, or a silent
    // rename in forbiddenCopy.ts would make this pass without checking anything.
    expect(PEOPLE_LED_RULES).toHaveLength(2);
    expect(scanProhibited(html)).toEqual([]);
  });

  // --- Meta-tests: prove each scan actually fires on a genuine regression. ---

  it("catches a reintroduced team link baked into the header (meta-test)", () => {
    const poisoned = anchors(
      `${header}<a href="/team">Meet the team</a>`,
    );
    const offending = poisoned.filter(
      (a) => carriesForbiddenTerm(a.text) || carriesForbiddenTerm(a.href),
    );
    expect(offending.length).toBeGreaterThan(0);
  });

  it("catches a people/team section heading baked into the page (meta-test)", () => {
    const poisoned = sectionHeadings(
      `${html}<section><h2>Our people</h2></section>`,
    );
    expect(poisoned.some((h) => carriesForbiddenTerm(h))).toBe(true);
  });

  it("catches a people-worship phrase baked into the rendered output (meta-test)", () => {
    const poisoned = `${html}<p>Humans of Helix are our greatest asset.</p>`;
    expect(scanProhibited(poisoned)).not.toEqual([]);
  });

  /** Scan text for the two people-led phrase rules only. */
  function scanProhibited(text: string) {
    return scanForbiddenCopy(text, PEOPLE_LED_RULES);
  }
});
