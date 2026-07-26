/**
 * Validated sitemap and robots model for the static `public/sitemap.xml` and
 * `public/robots.txt` files (implementation plan §19 repository structure, §24
 * acceptance criteria "sitemap and robots are correct", and the P7 SEO work).
 *
 * Search engines need two things the bare `public/` directory did not yet
 * provide: a `robots.txt` telling crawlers what they may fetch and where the
 * sitemap lives, and a `sitemap.xml` listing every indexable URL. Both must
 * agree with the rest of the site's SEO surface:
 *
 *  - every `<loc>` is an absolute canonical URL built from the one canonical
 *    origin in {@link SITE_ORIGIN} (P7-002), so the sitemap never advertises a
 *    URL that disagrees with a page's `<link rel="canonical">`;
 *  - only genuinely indexable routes appear — the `noindex` 404 page is
 *    excluded, mirroring the `BaseLayout` decision to drop its canonical link
 *    and structured data;
 *  - `robots.txt` points at the sitemap's absolute URL so crawlers can find it.
 *
 * Following the same convention as `redirects.ts` and `securityHeaders.ts`,
 * this module is the single, testable source of truth: it defines the indexable
 * routes as structured data, validates them (root-relative, no duplicates, no
 * whitespace), and renders the exact file text. `public/sitemap.xml` and
 * `public/robots.txt` are the rendered output, and `sitemap.test.ts` asserts the
 * committed files still match this model so they can never drift.
 *
 * This module is pure configuration plus validation: no UI, no I/O.
 */

import { SITE_ORIGIN, canonicalUrl } from "./siteMeta";

/**
 * Path, relative to the site root, of the generated sitemap. `robots.txt`
 * advertises this at {@link SITE_ORIGIN} and the file is served from
 * `public/sitemap.xml`.
 */
export const SITEMAP_PATH = "/sitemap.xml";

/** Absolute URL of the sitemap, referenced from `robots.txt`. */
export const SITEMAP_URL = `${SITE_ORIGIN}${SITEMAP_PATH}`;

/**
 * The site's indexable routes, as root-relative paths. Each becomes one `<url>`
 * entry whose `<loc>` is the canonical URL for that path.
 *
 * Only pages that render with an indexable `BaseLayout` (a canonical link and
 * structured data) belong here. The 404 page is deliberately absent: it is
 * served with `noindex`, so listing it in the sitemap would contradict the page
 * itself. New indexable pages must be added here — never hand-edited into
 * `public/sitemap.xml`.
 */
export const INDEXABLE_ROUTES: readonly string[] = ["/"];

/** Header written at the top of the generated `robots.txt` to discourage hand-edits. */
const ROBOTS_HEADER =
  "# Generated from src/config/sitemap.ts — do not edit by hand.\n";

/** Comment written at the top of the generated `sitemap.xml` to discourage hand-edits. */
const SITEMAP_COMMENT =
  "<!-- Generated from src/config/sitemap.ts — do not edit by hand. -->";

/**
 * Validate the set of indexable routes. Returns the list of problems; an empty
 * list means every route is well-formed and there are no duplicates.
 */
export function validateIndexableRoutes(
  routes: readonly string[] = INDEXABLE_ROUTES,
): string[] {
  const errors: string[] = [];

  if (routes.length === 0) {
    errors.push("The sitemap must list at least one indexable route.");
  }

  for (const route of routes) {
    if (!route.startsWith("/")) {
      errors.push(`Sitemap route "${route}" must be root-relative (start with "/").`);
    }
    if (/\s/.test(route)) {
      errors.push(`Sitemap route "${route}" must not contain whitespace.`);
    }
  }

  const seen = new Set<string>();
  for (const route of routes) {
    if (seen.has(route)) {
      errors.push(`Duplicate sitemap route "${route}"; each route may appear once.`);
    }
    seen.add(route);
  }

  return errors;
}

/**
 * Assert the indexable routes are valid, throwing on failure. Intended for
 * build-time use so a malformed route fails the build rather than shipping a
 * broken sitemap.
 */
export function assertIndexableRoutesValid(
  routes: readonly string[] = INDEXABLE_ROUTES,
): void {
  const errors = validateIndexableRoutes(routes);
  if (errors.length > 0) {
    throw new Error(`Invalid sitemap routes:\n- ${errors.join("\n- ")}`);
  }
}

/**
 * Render the exact text of the `robots.txt` file. Crawling is allowed site-wide
 * and the absolute sitemap URL is advertised. Ends with a trailing newline.
 */
export function renderRobotsTxt(): string {
  return (
    ROBOTS_HEADER +
    "User-agent: *\n" +
    "Allow: /\n" +
    "\n" +
    `Sitemap: ${SITEMAP_URL}\n`
  );
}

/**
 * Render the exact text of the `sitemap.xml` file. Each indexable route becomes
 * one `<url><loc>` entry with its absolute canonical URL. Throws if the routes
 * are invalid so the rendered file is always well-formed. Ends with a trailing
 * newline.
 *
 * `<lastmod>`, `<changefreq>`, and `<priority>` are deliberately omitted: the
 * site keeps no reliable per-page modification date, and inventing one (or a
 * priority) would ship an unsupported signal — the same restraint the rest of
 * the SEO surface applies.
 */
export function renderSitemapXml(
  routes: readonly string[] = INDEXABLE_ROUTES,
): string {
  assertIndexableRoutesValid(routes);
  const urls = routes
    .map((route) => `  <url>\n    <loc>${canonicalUrl(route)}</loc>\n  </url>`)
    .join("\n");
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `${SITEMAP_COMMENT}\n` +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `${urls}\n` +
    "</urlset>\n"
  );
}
