import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import reactRenderer from "@astrojs/react/server.js";
import Fit from "./Fit.astro";
import {
  fitSectionCopy,
  questionNodes,
  resultNodes,
} from "./fit/fitFlow";
import { primaryCta } from "../config/cta";

/**
 * Renders `Fit.astro` through Astro's Container API with the React renderer
 * registered so the hydrated qualifier island is included. The graph and copy
 * have their own unit tests; here we guard the section shell — that it renders
 * the validated framing, mounts the island as a client component, and ships the
 * `<noscript>` fallback carrying every question, every outcome, both Redfern
 * addresses, and the single CTA so the flow degrades without JavaScript (§12.4).
 */
async function renderFit(props?: {
  copy?: typeof fitSectionCopy;
}): Promise<string> {
  const container = await AstroContainer.create();
  container.addServerRenderer({ renderer: reactRenderer });
  container.addClientRenderer({
    name: "@astrojs/react",
    entrypoint: "@astrojs/react/client.js",
  });
  return container.renderToString(Fit, { props: props ?? {} });
}

describe("Fit.astro", () => {
  it("renders the section framing from the model", async () => {
    const html = await renderFit();
    expect(html).toContain(fitSectionCopy.eyebrow);
    expect(html).toContain(fitSectionCopy.headline);
    expect(html).toContain(fitSectionCopy.intro);
  });

  it("exposes the section as a labelled landmark", async () => {
    const html = await renderFit();
    expect(html).toContain('aria-labelledby="fit-heading"');
    expect(html).toContain('id="fit-heading"');
  });

  it("mounts the qualifier as a hydrated client island", async () => {
    const html = await renderFit();
    expect(html).toContain("astro-island");
    // The island server-renders its first question so there is a useful view
    // before hydration.
    expect(html).toContain(questionNodes()[0].prompt);
  });

  it("ships a no-JavaScript fallback with every question", async () => {
    const html = await renderFit();
    expect(html).toContain("<noscript>");
    for (const question of questionNodes()) {
      expect(html).toContain(question.prompt);
    }
  });

  it("ships a no-JavaScript fallback with every outcome and both addresses", async () => {
    const html = await renderFit();
    for (const result of resultNodes()) {
      expect(html).toContain(result.headline);
      expect(html).toContain(result.body);
    }
    // Both non-qualifying outcomes surface the Redfern address in the fallback.
    const addressCount = (html.match(/<address/g) ?? []).length;
    expect(addressCount).toBeGreaterThanOrEqual(2);
  });

  it("includes the single approved CTA in the fallback", async () => {
    const html = await renderFit();
    expect(html).toContain(primaryCta.label);
    expect(html).toContain(`data-analytics-event="${primaryCta.analyticsEvent}"`);
  });

  it("fails the render when the section copy is invalid", async () => {
    await expect(
      renderFit({ copy: { ...fitSectionCopy, headline: "   " } }),
    ).rejects.toThrow();
  });
});
