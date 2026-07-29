import { describe, it, expect, beforeAll } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import reactRenderer from "@astrojs/react/server.js";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import IndexPage from "./pages/index.astro";
import NotFoundPage from "./pages/404.astro";
import {
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  ORGANIZATION_NAME,
  SITE_LOCALE,
  canonicalUrl,
  structuredDataGraph,
  validateStructuredData,
} from "./config/siteMeta";
import {
  OG_IMAGE_PATH,
  OG_IMAGE_TYPE,
  OG_IMAGE_WIDTH,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_ALT,
} from "./config/socialCard";

/**
 * Assembled-page document-head metadata gate (implementation plan §24 "Technical"
 * — "Custom domain, canonical redirect, contact redirect, SSL, sitemap, and
 * robots are correct" — and P7-001 metadata, P7-002 canonical domain, P7-003
 * social preview, P7-004 structured data).
 *
 * The sibling rendered gates all read the page `<body>`: `renderedMessage`
 * proves the required copy survives assembly, `renderedContent` the logo/case-
 * study set, `renderedVisualFidelity` the progression and no-person imagery,
 * `renderedQualification` the fit flow, `renderedAccessibility` the outline, and
 * `renderedCopy` scans the whole document — but only *negatively*, for forbidden
 * variants. None of them proves the delivered `<head>` actually carries the
 * metadata §24/P7 require. Each piece is validated in isolation — `siteMeta.ts`
 * unit-tests `canonicalUrl` and `validateStructuredData`, `socialCard.ts` the
 * Open Graph card, and `BaseLayout` calls `assertPageMetaValid`,
 * `assertSocialCardValid`, and `assertStructuredDataValid` at render time — but
 * nothing rendered the real page and confirmed the resolved values reach the
 * shipped head. That left a hole exactly like the ones this series has been
 * closing: a regression that dropped `<link rel="canonical">`, pointed `og:image`
 * at the wrong path, blanked the `<title>`, or stopped emitting the JSON-LD
 * `<script>` would keep every model test green — the models still validate, no
 * banned phrase appears, the outline still parses — while the visitor's page
 * advertises a broken canonical, an unshareable card, or no structured data. A
 * mirror-image hole sits on the 404: it must ask *not* to be indexed
 * (`noindex, follow`) and carry no canonical and no structured data (P7-004), and
 * nothing proved the composed 404 head honoured that.
 *
 * This renders the two real routes a visitor receives and asserts §24/P7's head
 * criteria on the composed output, driven off the same `siteMeta` and
 * `socialCard` models `BaseLayout` reads so the page and the governance cannot
 * drift:
 *  - the indexable homepage carries the canonical URL for its origin (P7-002),
 *    the approved title/description (P7-001), the full Open Graph / Twitter card
 *    pointing at the approved artwork (P7-003), and one conservative
 *    `Organization`+`WebSite` JSON-LD graph that passes `validateStructuredData`
 *    (P7-004) — and no `noindex`;
 *  - the 404 asks not to be indexed and ships no canonical and no structured
 *    data.
 * Meta-tests poison a resolved head to prove each extractor actually fires.
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
  // Register the React renderer so the page renders exactly as a visitor
  // receives it, matching the head the sibling gates render against.
  container.addServerRenderer({ renderer: reactRenderer });
  container.addClientRenderer({
    name: "@astrojs/react",
    entrypoint: "@astrojs/react/client.js",
  });
  return container.renderToString(Component);
}

/** The document `<head>` block from the assembled page. */
function headBlock(html: string): string {
  return (html.match(/<head\b[\s\S]*?<\/head>/) ?? [""])[0];
}

/**
 * The `content` of the first `<meta>` whose `attr` equals `value` (e.g.
 * `metaContent(head, "property", "og:title")`), or `null` when no such tag is
 * present — so a dropped tag reads as a genuine absence, not a silent match.
 */
function metaContent(
  head: string,
  attr: "name" | "property",
  value: string,
): string | null {
  for (const tag of head.match(/<meta\b[^>]*>/g) ?? []) {
    const key = tag.match(new RegExp(`${attr}="([^"]*)"`));
    if (key && key[1] === value) {
      return (tag.match(/content="([^"]*)"/) ?? [null, null])[1];
    }
  }
  return null;
}

/** The `href` of the `<link rel="canonical">`, or `null` when absent. */
function canonicalHref(head: string): string | null {
  const link = (head.match(/<link\b[^>]*>/g) ?? []).find((t) =>
    /rel="canonical"/.test(t),
  );
  if (!link) return null;
  return (link.match(/href="([^"]*)"/) ?? [null, null])[1];
}

/**
 * The parsed JSON-LD graph from the head's `application/ld+json` script, or
 * `null` when the page ships no structured data (the 404's required state).
 */
function jsonLd(head: string): Record<string, unknown> | null {
  const script = head.match(
    /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (!script) return null;
  return JSON.parse(script[1]) as Record<string, unknown>;
}

describe("assembled pages ship the required document-head metadata (§24 technical, P7-001/002/003/004)", () => {
  let homeHead: string;
  let notFoundHead: string;

  beforeAll(async () => {
    homeHead = headBlock(
      await renderPage(IndexPage as unknown as AstroComponentFactory),
    );
    notFoundHead = headBlock(
      await renderPage(NotFoundPage as unknown as AstroComponentFactory),
    );
  });

  // Positive control: the head really is rendered and substantive, so the
  // presence assertions below cannot pass vacuously on an empty match.
  it("renders a substantive homepage head with the approved title (P7-001)", () => {
    expect(homeHead).not.toBe("");
    expect(homeHead).toContain(`<title>${DEFAULT_TITLE}</title>`);
    expect(metaContent(homeHead, "name", "description")).toBe(
      DEFAULT_DESCRIPTION,
    );
  });

  it("advertises the single canonical URL for the page origin (P7-002)", () => {
    // The indexable homepage points at exactly one canonical URL, built from the
    // one origin the model owns — never two competing addresses for the page.
    expect(canonicalHref(homeHead)).toBe(canonicalUrl("/"));
    // …and does not simultaneously ask not to be indexed.
    expect(metaContent(homeHead, "name", "robots")).toBeNull();
  });

  it("carries the full Open Graph card pointing at the approved artwork (P7-003)", () => {
    // Driven off the same siteMeta/socialCard models the layout reads, so a
    // drifted value fails here rather than shipping an unshareable card.
    expect(metaContent(homeHead, "property", "og:type")).toBe("website");
    expect(metaContent(homeHead, "property", "og:site_name")).toBe(
      ORGANIZATION_NAME,
    );
    expect(metaContent(homeHead, "property", "og:title")).toBe(DEFAULT_TITLE);
    expect(metaContent(homeHead, "property", "og:description")).toBe(
      DEFAULT_DESCRIPTION,
    );
    expect(metaContent(homeHead, "property", "og:url")).toBe(canonicalUrl("/"));
    expect(metaContent(homeHead, "property", "og:locale")).toBe(SITE_LOCALE);
    // The og:image must be the absolute URL of the approved card, with its type
    // and intrinsic dimensions, or a scraper draws a broken/mis-cropped preview.
    expect(metaContent(homeHead, "property", "og:image")).toBe(
      canonicalUrl(OG_IMAGE_PATH),
    );
    expect(metaContent(homeHead, "property", "og:image:type")).toBe(
      OG_IMAGE_TYPE,
    );
    expect(metaContent(homeHead, "property", "og:image:width")).toBe(
      String(OG_IMAGE_WIDTH),
    );
    expect(metaContent(homeHead, "property", "og:image:height")).toBe(
      String(OG_IMAGE_HEIGHT),
    );
    expect(metaContent(homeHead, "property", "og:image:alt")).toBe(
      OG_IMAGE_ALT,
    );
  });

  it("carries the Twitter summary card mirroring the Open Graph values (P7-003)", () => {
    expect(metaContent(notFoundHead, "name", "twitter:card")).toBe(
      "summary_large_image",
    );
    expect(metaContent(homeHead, "name", "twitter:card")).toBe(
      "summary_large_image",
    );
    expect(metaContent(homeHead, "name", "twitter:title")).toBe(DEFAULT_TITLE);
    expect(metaContent(homeHead, "name", "twitter:description")).toBe(
      DEFAULT_DESCRIPTION,
    );
    expect(metaContent(homeHead, "name", "twitter:image")).toBe(
      canonicalUrl(OG_IMAGE_PATH),
    );
  });

  it("emits one conservative Organization+WebSite JSON-LD graph (P7-004)", () => {
    const graph = jsonLd(homeHead);
    // The exact graph the model produces reaches the page — not a drifted copy.
    expect(graph).toEqual(structuredDataGraph());
    // And it is P7-004-clean on the delivered markup: no founder/person node, no
    // rating, no unverified count, no bare valuation figure.
    expect(validateStructuredData(graph as Record<string, unknown>)).toEqual(
      [],
    );
    const nodes = (graph?.["@graph"] as Array<{ "@type": string }>) ?? [];
    const types = nodes.map((n) => n["@type"]);
    expect(types).toContain("Organization");
    expect(types).toContain("WebSite");
  });

  it("asks the 404 not to be indexed and ships it no canonical or schema (P7-002/004)", () => {
    // The mirror image of the homepage: a soft-404 must not compete for indexing.
    expect(metaContent(notFoundHead, "name", "robots")).toBe("noindex, follow");
    expect(canonicalHref(notFoundHead)).toBeNull();
    // P7-004: the not-found page carries no structured data.
    expect(jsonLd(notFoundHead)).toBeNull();
    // Positive control: it is still a real, titled document.
    expect(notFoundHead).toContain(
      "<title>Page not found — Helix Collective</title>",
    );
  });

  // --- Meta-tests: prove each extractor actually fires on a genuine regression. ---

  it("catches a dropped canonical link (meta-test)", () => {
    const stripped = homeHead.replace(/<link\b[^>]*rel="canonical"[^>]*>/, "");
    expect(canonicalHref(stripped)).toBeNull();
  });

  it("catches an og:image pointed at the wrong path (meta-test)", () => {
    const poisoned = homeHead.replace(
      /(<meta property="og:image" content=")[^"]*(")/,
      "$1https://evil.example/wrong.png$2",
    );
    expect(metaContent(poisoned, "property", "og:image")).not.toBe(
      canonicalUrl(OG_IMAGE_PATH),
    );
  });

  it("catches a forbidden node injected into the JSON-LD (meta-test)", () => {
    const poisoned = structuredDataGraph();
    (poisoned["@graph"] as Array<Record<string, unknown>>)[0].founder = {
      "@type": "Person",
      name: "A Person",
    };
    expect(validateStructuredData(poisoned)).not.toEqual([]);
  });
});
