/**
 * Build-time drift guard tying the sitemap's declared indexable routes to the
 * actual page files under `src/pages/` (implementation plan §7 routes, §24
 * "sitemap and robots are correct").
 *
 * `INDEXABLE_ROUTES` in `sitemap.ts` is a hand-maintained list, and its own
 * comment instructs: "New indexable pages must be added here — never hand-edited
 * into public/sitemap.xml." Nothing enforced that instruction. Astro emits one
 * route per file under `src/pages/`, so adding an indexable page — the §7
 * `/privacy` page is the obvious near-term one — without also listing it in
 * `INDEXABLE_ROUTES` silently drops it from `sitemap.xml`, and every existing
 * test stays green: the sitemap model still renders and still matches the
 * committed `public/sitemap.xml`, because both omit the new page. The reverse
 * drifts too — deleting a page (or turning it `noindex`) while leaving its route
 * in `INDEXABLE_ROUTES` makes the sitemap advertise a URL that 404s or
 * contradicts the page's own `noindex`.
 *
 * This module closes that hole the way `publishedAssets.ts` closes its own: it
 * derives the set of indexable routes from the real page files and asserts it
 * equals the declared `INDEXABLE_ROUTES`. A page counts as indexable unless it
 * renders through `BaseLayout` with a truthy `noindex` prop — the same signal
 * the 404 page uses and the sitemap model already relies on to exclude it.
 *
 * The filesystem-aware wrapper is kept out of `sitemap.ts` (pure configuration
 * plus validation, no I/O) and exercised by `pageRoutes.test.ts` as part of
 * `npm run verify`. The pure helpers are injectable so the rule can be
 * unit-tested against invented pages without touching the filesystem.
 */

import { readdirSync, readFileSync } from "node:fs";
import { INDEXABLE_ROUTES } from "./sitemap";

/** Location of the committed `src/pages/` directory relative to this module. */
const PAGES_ROOT = new URL("../pages/", import.meta.url);

/** One page file discovered under `src/pages/`: its route-relative path and source. */
export interface PageFile {
  /** Path relative to `src/pages/`, POSIX-separated, e.g. `index.astro` or `legal/privacy.astro`. */
  relPath: string;
  /** The file's full source text — read to detect `noindex`. */
  source: string;
}

/**
 * Map a `src/pages/`-relative `.astro` file path to the root-relative route
 * Astro serves it at, using the same convention as {@link INDEXABLE_ROUTES}:
 * `index.astro` → `/`, `privacy.astro` → `/privacy`, `legal/index.astro` →
 * `/legal`, `legal/terms.astro` → `/legal/terms`.
 */
export function pageFileToRoute(relPath: string): string {
  const segments = relPath.replace(/\.astro$/, "").split("/");
  if (segments[segments.length - 1] === "index") {
    segments.pop();
  }
  const route = `/${segments.join("/")}`;
  return route === "/" ? "/" : route.replace(/\/$/, "");
}

/**
 * Matches a truthy `noindex` prop on a component: `noindex={true}` or the JSX
 * shorthand `noindex` (a bare attribute). `noindex={false}` and the absence of
 * the prop are *not* matched, mirroring `BaseLayout`'s `noindex = false`
 * default. This scans the source text, so it assumes the only occurrence of the
 * `noindex` token in a page is the prop itself — true across this site (an
 * indexable page never mentions the word).
 */
const NOINDEX_ATTR = /\bnoindex\s*=\s*\{\s*true\s*\}|\bnoindex\b(?!\s*=)/;

/**
 * Whether a page's source renders it as indexable. A page is *non*-indexable
 * only when it passes a truthy `noindex` prop to `BaseLayout`.
 */
export function isPageSourceIndexable(source: string): boolean {
  return !NOINDEX_ATTR.test(source);
}

/**
 * The indexable routes implied by a set of page files: every page that is not
 * `noindex`, mapped to its route, sorted and de-duped. Derived from the same
 * source the site actually ships, so it can never drift from what Astro emits.
 */
export function indexableRoutesFromPages(pages: readonly PageFile[]): string[] {
  const routes = pages
    .filter((page) => isPageSourceIndexable(page.source))
    .map((page) => pageFileToRoute(page.relPath));
  return [...new Set(routes)].sort();
}

/**
 * Throw when the indexable routes implied by `pages` do not exactly match
 * `declared`. Pure and injectable so the rule can be unit-tested against
 * invented pages.
 */
export function assertIndexableRoutesMatchPages(
  pages: readonly PageFile[],
  declared: readonly string[] = INDEXABLE_ROUTES,
): void {
  const fromPages = indexableRoutesFromPages(pages);
  const declaredSet = new Set(declared);
  const pagesSet = new Set(fromPages);

  // Indexable pages the sitemap forgets to list.
  const missing = fromPages.filter((route) => !declaredSet.has(route));
  // Listed routes with no indexable page backing them.
  const stale = [...declaredSet].filter((route) => !pagesSet.has(route));

  if (missing.length === 0 && stale.length === 0) return;

  const problems: string[] = [];
  if (missing.length > 0) {
    problems.push(
      `indexable page(s) missing from INDEXABLE_ROUTES, so absent from sitemap.xml: ${missing.join(", ")}`,
    );
  }
  if (stale.length > 0) {
    problems.push(
      `INDEXABLE_ROUTES route(s) with no indexable page under src/pages/, so the sitemap advertises a dead or noindex URL: ${stale.join(", ")}`,
    );
  }
  throw new Error(
    `The sitemap's indexable routes have drifted from src/pages/:\n- ${problems.join("\n- ")}\n` +
      `Update INDEXABLE_ROUTES in src/config/sitemap.ts (and re-render public/sitemap.xml) so it lists exactly the indexable pages (§7, §24).`,
  );
}

/**
 * Recursively read every `.astro` page under `root`, skipping `_`-prefixed
 * files and directories (which Astro treats as non-route partials).
 */
export function readPageFiles(root: URL = PAGES_ROOT): PageFile[] {
  const pages: PageFile[] = [];
  const walk = (dir: URL, prefix: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_")) continue;
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(new URL(`${entry.name}/`, dir), rel);
      } else if (entry.name.endsWith(".astro")) {
        pages.push({
          relPath: rel,
          source: readFileSync(new URL(entry.name, dir), "utf8"),
        });
      }
    }
  };
  walk(root, "");
  return pages;
}

/** The indexable routes the real `src/pages/` directory implies today. */
export function siteIndexableRoutes(pagesRoot: URL = PAGES_ROOT): string[] {
  return indexableRoutesFromPages(readPageFiles(pagesRoot));
}

/**
 * Real-pages gate: assert the indexable routes implied by `src/pages/` exactly
 * match the declared {@link INDEXABLE_ROUTES}. Passes today (only `index.astro`
 * is indexable and only `/` is listed) and starts biting the moment a page is
 * added, removed, or flipped to/from `noindex` without the sitemap following.
 */
export function assertSiteIndexableRoutesMatchPages(
  pagesRoot: URL = PAGES_ROOT,
  declared: readonly string[] = INDEXABLE_ROUTES,
): void {
  assertIndexableRoutesMatchPages(readPageFiles(pagesRoot), declared);
}
