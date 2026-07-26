import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SITE_ORIGIN, canonicalUrl } from "./siteMeta";
import {
  INDEXABLE_ROUTES,
  SITEMAP_PATH,
  SITEMAP_URL,
  assertIndexableRoutesValid,
  renderRobotsTxt,
  renderSitemapXml,
  validateIndexableRoutes,
} from "./sitemap";

/** Read a committed file from `public/` relative to this module. */
function readCommitted(name: string): string {
  const path = fileURLToPath(new URL(`../../public/${name}`, import.meta.url));
  return readFileSync(path, "utf8");
}

describe("INDEXABLE_ROUTES model", () => {
  it("lists the homepage", () => {
    expect(INDEXABLE_ROUTES).toContain("/");
  });

  it("excludes the noindex 404 route", () => {
    // The 404 page is served with `noindex`; listing it would contradict the page.
    expect(INDEXABLE_ROUTES).not.toContain("/404");
    expect(INDEXABLE_ROUTES).not.toContain("/404.html");
  });

  it("is internally valid", () => {
    expect(validateIndexableRoutes()).toEqual([]);
    expect(() => assertIndexableRoutesValid()).not.toThrow();
  });

  it("has no duplicate routes", () => {
    expect(new Set(INDEXABLE_ROUTES).size).toBe(INDEXABLE_ROUTES.length);
  });
});

describe("validateIndexableRoutes", () => {
  it("rejects an empty route list", () => {
    expect(validateIndexableRoutes([])).toContainEqual(
      expect.stringContaining("at least one indexable route"),
    );
  });

  it("rejects a route that is not root-relative", () => {
    expect(validateIndexableRoutes(["about"])).toContainEqual(
      expect.stringContaining("must be root-relative"),
    );
  });

  it("rejects whitespace in a route", () => {
    expect(validateIndexableRoutes(["/about us"])).toContainEqual(
      expect.stringContaining("must not contain whitespace"),
    );
  });

  it("flags a duplicate route", () => {
    expect(validateIndexableRoutes(["/", "/"])).toContainEqual(
      expect.stringContaining("Duplicate sitemap route"),
    );
  });
});

describe("SITEMAP_URL", () => {
  it("is the absolute canonical origin plus the sitemap path", () => {
    expect(SITEMAP_URL).toBe(`${SITE_ORIGIN}${SITEMAP_PATH}`);
    expect(SITEMAP_URL).toBe("https://www.helixcollective.com/sitemap.xml");
  });
});

describe("renderRobotsTxt", () => {
  it("allows all crawlers", () => {
    const text = renderRobotsTxt();
    expect(text).toContain("User-agent: *");
    expect(text).toContain("Allow: /");
  });

  it("advertises the absolute sitemap URL", () => {
    expect(renderRobotsTxt()).toContain(`Sitemap: ${SITEMAP_URL}`);
  });

  it("carries a do-not-edit header", () => {
    expect(renderRobotsTxt()).toContain("do not edit by hand");
  });

  it("ends with a trailing newline", () => {
    expect(renderRobotsTxt()).toMatch(/\n$/);
  });

  it("matches the committed public/robots.txt so they never drift", () => {
    expect(readCommitted("robots.txt")).toBe(renderRobotsTxt());
  });
});

describe("renderSitemapXml", () => {
  it("declares the sitemap XML namespace", () => {
    expect(renderSitemapXml()).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    );
  });

  it("emits one absolute canonical <loc> per indexable route", () => {
    const text = renderSitemapXml();
    for (const route of INDEXABLE_ROUTES) {
      expect(text).toContain(`<loc>${canonicalUrl(route)}</loc>`);
    }
    const locCount = (text.match(/<loc>/g) ?? []).length;
    expect(locCount).toBe(INDEXABLE_ROUTES.length);
  });

  it("omits fabricated <lastmod>, <changefreq>, and <priority> signals", () => {
    const text = renderSitemapXml();
    expect(text).not.toContain("<lastmod>");
    expect(text).not.toContain("<changefreq>");
    expect(text).not.toContain("<priority>");
  });

  it("throws on invalid routes rather than emitting a broken file", () => {
    expect(() => renderSitemapXml(["bad"])).toThrow(/Invalid sitemap routes/);
  });

  it("ends with a trailing newline", () => {
    expect(renderSitemapXml()).toMatch(/\n$/);
  });

  it("carries a do-not-edit comment", () => {
    expect(renderSitemapXml()).toContain("do not edit by hand");
  });

  it("matches the committed public/sitemap.xml so they never drift", () => {
    expect(readCommitted("sitemap.xml")).toBe(renderSitemapXml());
  });
});
