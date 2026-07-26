import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import WhyHelix from "./WhyHelix.astro";
import {
  whyHelixPoints,
  whyHelixCopy,
  type WhyHelixPoint,
  type WhyHelixCopy,
} from "../config/whyHelix";

/**
 * Renders `WhyHelix.astro` through Astro's Container API and asserts the output
 * faithfully reflects the validated `whyHelix` model (§10). The content model
 * has its own unit tests; here we only guard the render layer — that the
 * component renders the model's framing and all three proof points, exposes the
 * section as a labelled landmark, and adds no off-spec copy.
 */
async function renderWhy(props?: {
  points?: readonly WhyHelixPoint[];
  copy?: WhyHelixCopy;
}): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(WhyHelix, { props: props ?? {} });
}

describe("WhyHelix.astro", () => {
  it("renders the section framing from the model", async () => {
    const html = await renderWhy();
    expect(html).toContain(whyHelixCopy.eyebrow);
    expect(html).toContain(whyHelixCopy.headline);
    expect(html).toContain(whyHelixCopy.intro);
  });

  it("renders all three proof points with their headings and bodies", async () => {
    const html = await renderWhy();
    for (const point of whyHelixPoints) {
      expect(html).toContain(point.title);
      expect(html).toContain(point.body);
    }
  });

  it("renders exactly the three model proof points — no more", async () => {
    const html = await renderWhy();
    const pointCount = (html.match(/why__point-title/g) ?? []).length;
    expect(pointCount).toBe(whyHelixPoints.length);
    expect(pointCount).toBe(3);
  });

  it("exposes the manifesto as a labelled section landmark", async () => {
    const html = await renderWhy();
    expect(html).toContain('aria-labelledby="why-heading"');
    expect(html).toContain('id="why-heading"');
  });

  it("keeps the recognisable \"different because\" eyebrow framing", async () => {
    const html = await renderWhy();
    expect(html.toLowerCase()).toContain("different because");
  });

  it("fails the render when the manifesto model is invalid", async () => {
    // A component that silently rendered a broken model would defeat the point
    // of build-time validation; a missing proof point must throw.
    await expect(
      renderWhy({ points: whyHelixPoints.slice(0, 2) }),
    ).rejects.toThrow();
  });
});
