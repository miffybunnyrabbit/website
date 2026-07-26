import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  assertPageMetaValid,
  assertStructuredDataValid,
  canonicalUrl,
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  FORBIDDEN_JSONLD_KEYS,
  ORGANIZATION_ID,
  ORGANIZATION_NAME,
  organizationSchema,
  SITE_ORIGIN,
  structuredDataGraph,
  validatePageMeta,
  validateStructuredData,
  websiteSchema,
  type PageMeta,
} from "./siteMeta";

/** Read a committed file at a path relative to the repository root. */
function readRepo(relative: string): string {
  const path = fileURLToPath(new URL(`../../${relative}`, import.meta.url));
  return readFileSync(path, "utf8");
}

/** A well-formed page-meta fixture. */
function goodMeta(overrides: Partial<PageMeta> = {}): PageMeta {
  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    canonicalPath: "/",
    ...overrides,
  };
}

describe("canonicalUrl (P7-002)", () => {
  it("builds an absolute canonical from the single origin", () => {
    expect(canonicalUrl("/")).toBe(`${SITE_ORIGIN}/`);
  });

  it("defaults to the site root", () => {
    expect(canonicalUrl()).toBe(`${SITE_ORIGIN}/`);
  });

  it("normalises a missing leading slash", () => {
    expect(canonicalUrl("privacy")).toBe(`${SITE_ORIGIN}/privacy`);
  });

  it("strips a trailing slash from non-root paths so one URL is canonical", () => {
    expect(canonicalUrl("/privacy/")).toBe(`${SITE_ORIGIN}/privacy`);
  });

  it("drops query strings and fragments", () => {
    expect(canonicalUrl("/privacy?ref=x#top")).toBe(`${SITE_ORIGIN}/privacy`);
  });

  it("collapses accidental double slashes", () => {
    expect(canonicalUrl("//privacy")).toBe(`${SITE_ORIGIN}/privacy`);
  });

  it("keeps the canonical origin on the www domain (P7-002)", () => {
    expect(SITE_ORIGIN).toBe("https://www.helixcollective.com");
    expect(canonicalUrl("/").startsWith("https://")).toBe(true);
  });

  // SITE_ORIGIN documents that it "Must match `site` in astro.config.mjs", but
  // nothing enforced it. Astro derives its own absolute URLs (e.g. anything
  // built from `Astro.site`) from `astro.config.mjs`, while our canonical links,
  // JSON-LD @ids, and sitemap all derive from SITE_ORIGIN. If the two drift, the
  // site advertises two competing origins for the same pages — exactly the
  // single-canonical-origin failure P7-002 exists to prevent. Guard it the same
  // way the sitemap/headers/CI drift tests guard their committed artifacts.
  it("stays in lock-step with `site` in astro.config.mjs (P7-002)", () => {
    const config = readRepo("astro.config.mjs");
    const match = config.match(/\bsite:\s*["']([^"']+)["']/);
    expect(match, "astro.config.mjs must declare a `site` origin").not.toBeNull();
    // Compare origin-to-origin so a trailing slash on either side is not drift.
    const configOrigin = (match as RegExpMatchArray)[1].replace(/\/$/, "");
    expect(configOrigin).toBe(SITE_ORIGIN);
  });
});

describe("structured data (P7-004)", () => {
  it("emits exactly an Organization and a WebSite node under one @context", () => {
    const graph = structuredDataGraph();
    expect(graph["@context"]).toBe("https://schema.org");
    const nodes = graph["@graph"] as Array<Record<string, unknown>>;
    expect(nodes.map((n) => n["@type"])).toEqual(["Organization", "WebSite"]);
  });

  it("names the institution without any people (§5)", () => {
    const org = organizationSchema();
    expect(org.name).toBe(ORGANIZATION_NAME);
    expect(org.url).toBe(`${SITE_ORIGIN}/`);
  });

  it("links the website to the organisation as publisher via @id", () => {
    const site = websiteSchema();
    expect(site.publisher).toEqual({ "@id": ORGANIZATION_ID });
  });

  it("passes its own validation as authored", () => {
    expect(validateStructuredData()).toEqual([]);
    expect(() => assertStructuredDataValid()).not.toThrow();
  });

  it.each(FORBIDDEN_JSONLD_KEYS)(
    "rejects a graph that reintroduces the forbidden key %s",
    (key) => {
      const graph = structuredDataGraph();
      const nodes = graph["@graph"] as Array<Record<string, unknown>>;
      nodes[0][key] = "anything";
      const errors = validateStructuredData(graph);
      expect(errors.some((e) => e.includes(key))).toBe(true);
      expect(() => assertStructuredDataValid(graph)).toThrow();
    },
  );

  it("rejects a person/founder node however it is nested", () => {
    const graph = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          name: ORGANIZATION_NAME,
          founder: { "@type": "Person", name: "Someone" },
        },
      ],
    };
    expect(validateStructuredData(graph).length).toBeGreaterThan(0);
  });

  it("rejects a valuation figure smuggled into the schema (P7-004)", () => {
    const graph = {
      "@context": "https://schema.org",
      "@graph": [{ "@type": "Organization", slogan: "$500m created" }],
    };
    expect(validateStructuredData(graph).length).toBeGreaterThan(0);
  });

  it("rejects a graph with the wrong @context", () => {
    const graph = { "@context": "https://example.com", "@graph": [] };
    expect(validateStructuredData(graph).length).toBeGreaterThan(0);
  });
});

describe("validatePageMeta (P7-001)", () => {
  it("accepts well-formed metadata", () => {
    expect(validatePageMeta(goodMeta())).toEqual([]);
    expect(() => assertPageMetaValid(goodMeta())).not.toThrow();
  });

  it("rejects an empty title or description", () => {
    expect(validatePageMeta(goodMeta({ title: "  " })).length).toBeGreaterThan(0);
    expect(
      validatePageMeta(goodMeta({ description: "" })).length,
    ).toBeGreaterThan(0);
  });

  it("rejects a canonical path that is not root-relative", () => {
    const errors = validatePageMeta(
      goodMeta({ canonicalPath: "https://elsewhere.example/" }),
    );
    expect(errors.some((e) => e.includes("root-relative"))).toBe(true);
  });

  it("rejects placeholder/draft markers in published metadata", () => {
    expect(
      validatePageMeta(goodMeta({ description: "[VERIFY: the pitch]" })).length,
    ).toBeGreaterThan(0);
    expect(
      validatePageMeta(goodMeta({ title: "TODO write this" })).length,
    ).toBeGreaterThan(0);
  });

  it("throws through assertPageMetaValid on bad metadata", () => {
    expect(() => assertPageMetaValid(goodMeta({ title: "" }))).toThrow();
  });
});
