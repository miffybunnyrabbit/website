import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import LogoMarquee from "./LogoMarquee.astro";
import { logos, marqueeLogos, type LogoEntry } from "../config/logos";

/**
 * Renders `LogoMarquee.astro` through Astro's Container API and asserts the
 * output faithfully reflects the validated logo register (§8.4, §20.2). The
 * register and its validator have their own unit tests; here we only guard the
 * render layer — that the component renders exactly the visible logos, gates on
 * the publication/rights rules, exposes the marquee as a labelled landmark, and
 * keeps its seamless duplicate hidden from assistive tech.
 *
 * Test registers are derived from the real `logos` register (flipping specific
 * entries) rather than hand-built, so every case stays a *complete, valid*
 * register — the removed-brand audit records the validator requires are always
 * present.
 */
async function renderMarquee(props?: {
  logos?: readonly LogoEntry[];
}): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(LogoMarquee, { props: props ?? {} });
}

/** The register with every retained brand's rights back to pending (pre-Q-0006). */
function allPending(): LogoEntry[] {
  return logos.map((e) => ({ ...e, permission: "pending" as const }));
}

describe("LogoMarquee.astro", () => {
  it("renders every retained logo in the site default (Q-0006 approved)", async () => {
    // Q-0006 cleared every retained brand's rights on 2026-07-29, so the site
    // default renders the full marquee from local assets.
    expect(marqueeLogos(logos)).toHaveLength(logos.length);
    const html = await renderMarquee();
    expect(html).toContain("marquee__item");
    expect(html).toContain('src="/logos/canva.png"');
  });

  it("never uses a Webflow CDN path for an asset (local assets only)", async () => {
    const html = await renderMarquee({ logos: [{ name: "Canva", asset: "canva.png", alt: "Canva" }] });
    expect(html).not.toMatch(/https?:\/\//);
  });

  it("exposes the marquee as a labelled section landmark", async () => {
    const html = await renderMarquee({ logos: [{ name: "Canva", asset: "canva.png", alt: "Canva" }] });
    expect(html).toContain('aria-labelledby="marquee-heading"');
    expect(html).toContain('id="marquee-heading"');
  });

  it("hides the seamless duplicate set from assistive tech", async () => {
    const html = await renderMarquee({
      logos: [{ name: "Canva", asset: "canva.png", alt: "Canva" }],
    });
    expect(html).toContain('aria-hidden="true"');
    // The visible set announces the brand once; the clone is silenced (alt="").
    const altCount = (html.match(/alt="Canva"/g) ?? []).length;
    expect(altCount).toBe(1);
    const emptyAltCount = (html.match(/alt=""/g) ?? []).length;
    expect(emptyAltCount).toBe(1);
  });

});
