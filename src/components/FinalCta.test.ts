import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import FinalCta from "./FinalCta.astro";
import { finalCtaCopy, primaryCta, type FinalCtaCopy } from "../config/cta";

/**
 * Renders `FinalCta.astro` through Astro's Container API and asserts the output
 * reflects the validated closing-CTA copy and the single `primaryCta`. The
 * config has its own unit tests; here we only guard the render layer — that it
 * shows the headline and supporting line, renders exactly one primary action
 * with the one approved label, carries the shared analytics event, exposes the
 * section as a labelled landmark, and adds no second competing CTA.
 */
async function renderFinalCta(props?: {
  copy?: FinalCtaCopy;
}): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(FinalCta, { props: props ?? {} });
}

describe("FinalCta.astro", () => {
  it("renders the headline and supporting line from the model", async () => {
    const html = await renderFinalCta();
    expect(html).toContain(finalCtaCopy.headline);
    expect(html).toContain(finalCtaCopy.supportingLine);
  });

  it("renders exactly one primary action using the single approved label", async () => {
    const html = await renderFinalCta();
    const anchorCount = (html.match(/<a\b/g) ?? []).length;
    expect(anchorCount).toBe(1);
    const labelCount = html.split(primaryCta.label).length - 1;
    expect(labelCount).toBe(1);
  });

  it("wires the button to the central analytics event (§13, §20.3)", async () => {
    const html = await renderFinalCta();
    expect(html).toContain(`data-analytics-event="${primaryCta.analyticsEvent}"`);
  });

  it("exposes the section as a labelled landmark", async () => {
    const html = await renderFinalCta();
    expect(html).toContain('aria-labelledby="final-cta-heading"');
    expect(html).toContain('id="final-cta-heading"');
  });

  it("fails the render when the closing copy is invalid", async () => {
    // A component that silently rendered a placeholder headline would defeat
    // build-time validation; a blank headline must throw.
    await expect(
      renderFinalCta({ copy: { headline: "  ", supportingLine: "x" } }),
    ).rejects.toThrow();
  });
});
