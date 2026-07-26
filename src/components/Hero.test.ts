import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Hero from "./Hero.astro";
import { hero, heroSupportingCopy } from "../config/hero";
import { PRIMARY_CTA_LABEL } from "../config/cta";

/**
 * Renders `Hero.astro` through Astro's Container API and asserts the output
 * faithfully reflects the validated `hero` model (§8.2). The content model has
 * its own unit tests; here we only guard the render layer — that the component
 * renders that model and adds nothing off-spec.
 */
async function renderHero(): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(Hero);
}

describe("Hero.astro", () => {
  it("renders the approved eyebrow", async () => {
    const html = await renderHero();
    expect(html).toContain(hero.eyebrow);
  });

  it("renders the enterprise-value headline in a single h1", async () => {
    const html = await renderHero();
    expect(html).toContain(hero.headline);
    const h1Count = (html.match(/<h1\b/g) ?? []).length;
    expect(h1Count).toBe(1);
  });

  it("renders the selected supporting copy for the model's variant", async () => {
    const html = await renderHero();
    expect(html).toContain(heroSupportingCopy(hero));
  });

  it("renders the optional supporting line when present", async () => {
    const html = await renderHero();
    if (hero.supportingLine) {
      expect(html).toContain(hero.supportingLine);
    }
  });

  it("renders the single approved CTA label", async () => {
    const html = await renderHero();
    expect(html).toContain(PRIMARY_CTA_LABEL);
    expect(hero.ctaLabel).toBe(PRIMARY_CTA_LABEL);
  });

  it("exposes the hero as an anchorable, labelled section landmark", async () => {
    const html = await renderHero();
    expect(html).toContain('id="top"');
    expect(html).toContain('aria-labelledby="hero-headline"');
    expect(html).toContain('id="hero-headline"');
  });

  it("does not ship the gated performance-linked claim by default (§8.2, D-009)", async () => {
    const html = await renderHero().then((h) => h.toLowerCase());
    expect(html).not.toContain("get paid when you get paid");
  });
});
