import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Header from "./Header.astro";
import { headerNav, anchorHref } from "../config/navigation";
import { PRIMARY_CTA_LABEL } from "../config/cta";

/**
 * Renders `Header.astro` through Astro's Container API and asserts the output
 * faithfully reflects the validated `headerNav` model (§8.1). These tests guard
 * the render layer: the content model already has its own unit tests, so here we
 * only check that the component renders that model and adds nothing off-spec.
 */
async function renderHeader(): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(Header);
}

describe("Header.astro", () => {
  it("renders the brand/home link", async () => {
    const html = await renderHeader();
    expect(html).toContain(`href="${headerNav.brand.href}"`);
    expect(html).toContain(headerNav.brand.label);
  });

  it("renders a labelled primary navigation landmark", async () => {
    const html = await renderHeader();
    expect(html).toContain("<nav");
    expect(html).toContain('aria-label="Primary"');
  });

  it("renders every approved anchor with its section href", async () => {
    const html = await renderHeader();
    for (const item of headerNav.items) {
      expect(html).toContain(`href="${anchorHref(item)}"`);
      expect(html).toContain(item.label);
    }
  });

  it("renders exactly the three approved anchors", async () => {
    const html = await renderHeader();
    const anchorCount = (html.match(/href="#/g) ?? []).length;
    expect(anchorCount).toBe(headerNav.items.length);
    expect(headerNav.items).toHaveLength(3);
  });

  it("renders the single approved CTA label", async () => {
    const html = await renderHeader();
    expect(html).toContain(PRIMARY_CTA_LABEL);
    // The CTA uses the shared label, never a bespoke header-only one.
    expect(headerNav.ctaLabel).toBe(PRIMARY_CTA_LABEL);
  });

  it("does not reintroduce a team or investor link (§8.1)", async () => {
    const html = await renderHeader().then((h) => h.toLowerCase());
    for (const forbidden of ["team", "people", "invest", "ventures", "careers"]) {
      expect(html).not.toContain(`>${forbidden}`);
    }
  });
});
