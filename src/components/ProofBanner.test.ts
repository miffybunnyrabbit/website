import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import ProofBanner from "./ProofBanner.astro";
import { proofBanner, type ProofBanner as ProofBannerModel } from "../config/proofBanner";

/**
 * Renders `ProofBanner.astro` through Astro's Container API and asserts the
 * output faithfully reflects the validated `proofBanner` model (§8.3). The
 * content model has its own unit tests; here we only guard the render layer —
 * that the component renders the shipped model in its published draft form,
 * renders nothing when a model is explicitly held back, and adds nothing
 * off-spec.
 */
async function renderBanner(banner?: ProofBannerModel): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(ProofBanner, {
    props: banner ? { banner } : {},
  });
}

/** The shipped model publishes in draft form (D-001 currency still pending). */
const publishedModel = proofBanner;

/** A copy explicitly held back from production (`publish: false`). */
const heldBackModel: ProofBannerModel = {
  ...proofBanner,
  publish: false,
};

describe("ProofBanner.astro", () => {
  it("renders the shipped model's figures in its published draft form", async () => {
    // The banner publishes in its safe currency-neutral draft while Q-0007
    // tracks the D-001 currency decision (§23), so `$500M+` reaches the output.
    expect(proofBanner.publish).toBe(true);
    const html = await renderBanner();
    expect(html).toContain("$500M+");
    expect(html).toContain("<section");
  });

  it("renders nothing when the model is explicitly held back", async () => {
    const html = await renderBanner(heldBackModel);
    expect(html).not.toContain("$500M+");
    expect(html).not.toContain("<section");
  });

  it("renders both metric figures", async () => {
    const html = await renderBanner(publishedModel);
    for (const metric of publishedModel.metrics) {
      expect(html).toContain(metric.value);
      expect(html).toContain(metric.label);
    }
  });

  it("renders exactly the two model metrics — no vanity third column (§8.3)", async () => {
    const html = await renderBanner(publishedModel);
    const metricCount = (html.match(/proof__metric/g) ?? []).length;
    expect(metricCount).toBe(publishedModel.metrics.length);
    expect(metricCount).toBe(2);
  });

  it("exposes the strip as a labelled section landmark", async () => {
    const html = await renderBanner(publishedModel);
    expect(html).toContain('aria-labelledby="proof-heading"');
    expect(html).toContain('id="proof-heading"');
  });

  it("never displays the removed venture count", async () => {
    const html = await renderBanner(publishedModel);
    expect(html.toLowerCase()).not.toContain("50+ ventures");
  });
});
