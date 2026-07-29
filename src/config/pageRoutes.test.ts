import { describe, expect, it } from "vitest";
import { INDEXABLE_ROUTES } from "./sitemap";
import {
  assertIndexableRoutesMatchPages,
  assertSiteIndexableRoutesMatchPages,
  indexableRoutesFromPages,
  isPageSourceIndexable,
  pageFileToRoute,
  readPageFiles,
  siteIndexableRoutes,
  type PageFile,
} from "./pageRoutes";

/** A page fixture; indexable by default (no `noindex`). */
function page(relPath: string, source = "<BaseLayout title=\"x\">"): PageFile {
  return { relPath, source };
}

describe("pageFileToRoute", () => {
  it("maps the index page to the site root", () => {
    expect(pageFileToRoute("index.astro")).toBe("/");
  });

  it("maps a top-level page to its slug", () => {
    expect(pageFileToRoute("privacy.astro")).toBe("/privacy");
  });

  it("maps a nested index to its directory", () => {
    expect(pageFileToRoute("legal/index.astro")).toBe("/legal");
  });

  it("maps a nested page to the full path", () => {
    expect(pageFileToRoute("legal/terms.astro")).toBe("/legal/terms");
  });

  it("maps the 404 file to its route (excluded elsewhere as noindex)", () => {
    expect(pageFileToRoute("404.astro")).toBe("/404");
  });
});

describe("isPageSourceIndexable", () => {
  it("treats a page with no noindex prop as indexable", () => {
    expect(isPageSourceIndexable("<BaseLayout title=\"Home\">")).toBe(true);
  });

  it("treats an explicit noindex={true} page as non-indexable", () => {
    expect(isPageSourceIndexable("<BaseLayout title=\"404\" noindex={true}>")).toBe(false);
  });

  it("treats the shorthand noindex attribute as non-indexable", () => {
    expect(isPageSourceIndexable("<BaseLayout title=\"404\" noindex>")).toBe(false);
  });

  it("treats noindex={false} as indexable", () => {
    expect(isPageSourceIndexable("<BaseLayout title=\"Home\" noindex={false}>")).toBe(true);
  });
});

describe("indexableRoutesFromPages", () => {
  it("keeps indexable pages and drops noindex ones, sorted", () => {
    const routes = indexableRoutesFromPages([
      page("index.astro"),
      page("privacy.astro"),
      page("404.astro", "<BaseLayout noindex={true}>"),
    ]);
    expect(routes).toEqual(["/", "/privacy"]);
  });

  it("de-duplicates routes that map to the same path", () => {
    const routes = indexableRoutesFromPages([
      page("legal/index.astro"),
      page("legal/index.astro"),
    ]);
    expect(routes).toEqual(["/legal"]);
  });
});

describe("assertIndexableRoutesMatchPages", () => {
  it("passes when the pages exactly match the declared routes", () => {
    expect(() =>
      assertIndexableRoutesMatchPages(
        [page("index.astro"), page("404.astro", "<BaseLayout noindex={true}>")],
        ["/"],
      ),
    ).not.toThrow();
  });

  it("throws when an indexable page is missing from the sitemap list", () => {
    // The §7 failure mode: a /privacy page is added but INDEXABLE_ROUTES still
    // only lists "/", so sitemap.xml silently omits it.
    expect(() =>
      assertIndexableRoutesMatchPages(
        [page("index.astro"), page("privacy.astro")],
        ["/"],
      ),
    ).toThrowError(/missing from INDEXABLE_ROUTES[\s\S]*\/privacy/);
  });

  it("throws when a listed route has no indexable page backing it", () => {
    expect(() =>
      assertIndexableRoutesMatchPages([page("index.astro")], ["/", "/gone"]),
    ).toThrowError(/no indexable page[\s\S]*\/gone/);
  });

  it("throws when a listed route was turned noindex", () => {
    // A page that becomes noindex while still listed would make the sitemap
    // advertise a URL that contradicts the page's own robots meta.
    expect(() =>
      assertIndexableRoutesMatchPages(
        [page("index.astro"), page("privacy.astro", "<BaseLayout noindex={true}>")],
        ["/", "/privacy"],
      ),
    ).toThrowError(/\/privacy/);
  });

  it("defaults to the live INDEXABLE_ROUTES", () => {
    expect(() =>
      assertIndexableRoutesMatchPages([page("index.astro")]),
    ).not.toThrow();
  });
});

describe("the live site", () => {
  it("keeps INDEXABLE_ROUTES in step with the real src/pages/ files", () => {
    expect(() => assertSiteIndexableRoutesMatchPages()).not.toThrow();
  });

  it("derives exactly the declared indexable routes from disk", () => {
    // Records the current baseline (only "/" is indexable) so a new indexable
    // page that skips its sitemap entry becomes visible.
    expect(siteIndexableRoutes()).toEqual([...INDEXABLE_ROUTES]);
  });

  it("discovers both committed pages, including the noindex 404", () => {
    const relPaths = readPageFiles().map((p) => p.relPath).sort();
    expect(relPaths).toEqual(["404.astro", "index.astro"]);
  });
});
