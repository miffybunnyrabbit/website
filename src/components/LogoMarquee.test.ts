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

/** The all-pending register with only the named brands' rights confirmed. */
function approve(...names: string[]): LogoEntry[] {
  const wanted = new Set(names.map((n) => n.toLowerCase()));
  return allPending().map((e) =>
    wanted.has(e.name.toLowerCase()) ? { ...e, status: "retain", permission: "approved" } : e,
  );
}

describe("LogoMarquee.astro", () => {
  it("renders every retained logo in the site default (Q-0006 approved)", async () => {
    // Q-0006 cleared every retained brand's rights on 2026-07-29, so the site
    // default renders the full marquee from local assets.
    expect(marqueeLogos(logos)).toHaveLength(18);
    const html = await renderMarquee();
    expect(html).toContain("marquee__item");
    expect(html).toContain('src="/logos/canva.png"');
  });

  it("renders nothing when no logo's rights are confirmed", async () => {
    // With every entry back at `permission: "pending"` (the pre-Q-0006 state)
    // the marquee is gated shut — nothing must leak into the build.
    const pending = allPending();
    expect(marqueeLogos(pending)).toHaveLength(0);
    const html = await renderMarquee({ logos: pending });
    expect(html).not.toContain("marquee__item");
    expect(html).not.toContain("<img");
  });

  it("renders a logo image with alt text once an entry is approved", async () => {
    const html = await renderMarquee({ logos: approve("Neara") });
    expect(html).toContain('src="/logos/neara.png"');
    expect(html).toContain('alt="Neara"');
  });

  it("renders only entries that are both retained and approved", async () => {
    // Neara is cleared for use; Ferovinum stays pending in the fixture.
    const html = await renderMarquee({ logos: approve("Neara") });
    expect(html).toContain("neara.png");
    expect(html).not.toContain("ferovinum.png");
  });

  it("never uses a Webflow CDN path for an asset (local assets only)", async () => {
    const html = await renderMarquee({ logos: approve("Canva") });
    expect(html).not.toMatch(/https?:\/\//);
  });

  it("exposes the marquee as a labelled section landmark", async () => {
    const html = await renderMarquee({ logos: approve("Canva") });
    expect(html).toContain('aria-labelledby="marquee-heading"');
    expect(html).toContain('id="marquee-heading"');
  });

  it("hides the seamless duplicate set from assistive tech", async () => {
    const html = await renderMarquee({ logos: approve("Canva") });
    expect(html).toContain('aria-hidden="true"');
    // The visible set announces the brand once; the clone is silenced (alt="").
    const altCount = (html.match(/alt="Canva"/g) ?? []).length;
    expect(altCount).toBe(1);
    const emptyAltCount = (html.match(/alt=""/g) ?? []).length;
    expect(emptyAltCount).toBe(1);
  });

  it("fails the render when the register is invalid", async () => {
    // A removed brand slipping back to visible must fail the build, not ship.
    const broken = logos.map((e) =>
      e.name === "Awayco" ? { ...e, status: "retain" as const, permission: "approved" as const } : e,
    );
    await expect(renderMarquee({ logos: broken })).rejects.toThrow();
  });
});
