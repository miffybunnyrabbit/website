import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import BaseLayout from "./BaseLayout.astro";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  ORGANIZATION_NAME,
  SITE_ORIGIN,
} from "../config/siteMeta";

/**
 * Renders `BaseLayout.astro` through Astro's Container API and asserts the head
 * carries the metadata, canonical link, social tags, and structured data from
 * the validated site model (P7-001/P7-002/P7-004). The `siteMeta` config has its
 * own unit tests; here we only guard the render layer.
 */
async function renderLayout(props: Record<string, unknown> = {}): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(BaseLayout, { props });
}

/** Extract the JSON-LD payload from the rendered `<script type=...>` tag. */
function extractJsonLd(html: string): unknown {
  const match = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );
  if (!match) throw new Error("no JSON-LD script found");
  return JSON.parse(match[1]);
}

describe("BaseLayout.astro", () => {
  it("defaults to the approved title and description (P7-001)", async () => {
    const html = await renderLayout();
    expect(html).toContain(`<title>${DEFAULT_TITLE}</title>`);
    expect(html).toContain(`content="${DEFAULT_DESCRIPTION}"`);
  });

  it("emits one canonical link on the www origin (P7-002)", async () => {
    const html = await renderLayout({ canonicalPath: "/" });
    expect(html).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/"`);
    expect((html.match(/rel="canonical"/g) ?? []).length).toBe(1);
  });

  it("builds the canonical from the page path", async () => {
    const html = await renderLayout({ canonicalPath: "/privacy" });
    expect(html).toContain(`href="${SITE_ORIGIN}/privacy"`);
  });

  it("emits Open Graph and Twitter tags for link unfurling", async () => {
    const html = await renderLayout({ title: "Helix — X" });
    expect(html).toContain('property="og:type" content="website"');
    expect(html).toContain(`property="og:site_name" content="${ORGANIZATION_NAME}"`);
    expect(html).toContain('property="og:title" content="Helix — X"');
    expect(html).toContain(`property="og:url" content="${SITE_ORIGIN}/"`);
    expect(html).toContain('name="twitter:card" content="summary"');
  });

  it("embeds valid Organization + WebSite JSON-LD (P7-004)", async () => {
    const html = await renderLayout();
    const data = extractJsonLd(html) as {
      "@context": string;
      "@graph": Array<{ "@type": string }>;
    };
    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@graph"].map((n) => n["@type"])).toEqual([
      "Organization",
      "WebSite",
    ]);
  });

  it("ships no person, rating, or valuation figure in the schema (P7-004)", async () => {
    const html = await renderLayout();
    const serialised = JSON.stringify(extractJsonLd(html)).toLowerCase();
    for (const forbidden of ["founder", "person", "aggregaterating", "$"]) {
      expect(serialised).not.toContain(forbidden);
    }
  });

  it("noindexes the 404 page with no canonical and no structured data", async () => {
    const html = await renderLayout({ title: "Not found", noindex: true });
    expect(html).toContain('name="robots" content="noindex, follow"');
    expect(html).not.toContain('rel="canonical"');
    expect(html).not.toContain("application/ld+json");
  });

  it("fails the render when metadata is off-spec", async () => {
    // A placeholder description must fail the build, not ship to visitors.
    await expect(
      renderLayout({ description: "[VERIFY: pitch]" }),
    ).rejects.toThrow();
  });
});
