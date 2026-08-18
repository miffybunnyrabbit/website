import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Footer from "./Footer.astro";
import { footer, copyrightLine, type FooterContent } from "../config/footer";

/**
 * Renders `Footer.astro` through Astro's Container API and asserts the output
 * reflects the validated footer model. The `footer` config has its own unit
 * tests; here we only guard the render layer — that it shows the brand mark and
 * copyright line, publishes only approved identity facts and links (so an
 * unverified ABN, entity, or office never reaches the markup), exposes the
 * footer as a labelled landmark, reintroduces none of the §14 removals, and
 * fails the render when the model is off-spec.
 */
async function renderFooter(props?: {
  content?: FooterContent;
  year?: number;
}): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(Footer, { props: props ?? {} });
}

/** A well-formed footer with one approved and one pending fact for tests. */
function footerWithApproval(): FooterContent {
  return {
    brand: { label: "Helix Collective", href: "/" },
    facts: [
      {
        id: "legal-entity",
        label: "Legal entity",
        value: "Helix Collective Pty Ltd",
      },
      {
        id: "abn",
        label: "ABN",
        value: "20 678 772 631",
      },
    ],
    socialLinks: [
      {
        label: "LinkedIn",
        href: "https://www.linkedin.com/company/helix-collective",
      },
    ],
    copyrightHolder: "Helix Collective",
  };
}

describe("Footer.astro", () => {
  it("renders the brand mark and copyright line from the model", async () => {
    const html = await renderFooter({ year: 2026 });
    expect(html).toContain(footer.brand.label);
    expect(html).toContain(`href="${footer.brand.href}"`);
    expect(html).toContain(copyrightLine(2026, footer));
  });

  it("renders approved social links", async () => {
    const html = await renderFooter({ content: footerWithApproval() });
    expect(html).toContain(
      'href="https://www.linkedin.com/company/helix-collective"',
    );
    expect(html).toContain("LinkedIn");
  });

  it("routes third-party links through the safe external-link primitive (VD-104)", async () => {
    // The one approved social link is third-party (LinkedIn), so it must render
    // through `.external-link` and carry the safe rel — never a hand-rolled
    // anchor that could leak the referrer or a window.opener handle.
    const html = await renderFooter({ content: footerWithApproval() });
    const anchor = html.match(/<a[^>]*href="https:\/\/www\.linkedin\.com[^"]*"[^>]*>/)?.[0];
    expect(anchor, "approved LinkedIn link is not rendered").toBeTruthy();
    expect(anchor).toContain("external-link");
    expect(anchor).toContain('rel="noopener noreferrer"');
  });

  it("renders the Q-0010-approved identity facts in the site default", async () => {
    // The owner approved all three identity facts on 2026-08-03, so the shipped
    // footer publishes them — and never a draft marker.
    const html = await renderFooter({ year: 2026 });
    expect(html).toContain("Helix Venture Studio Pty Ltd");
    expect(html).toContain("20 678 772 631");
    expect(html).not.toContain("[VERIFY");
  });

  it("exposes the footer as a labelled landmark", async () => {
    const html = await renderFooter({ year: 2026 });
    expect(html).toContain('aria-labelledby="site-footer-heading"');
    expect(html).toContain('id="site-footer-heading"');
  });

  it("reintroduces none of the §14 removals", async () => {
    const html = (await renderFooter({ year: 2026 })).toLowerCase();
    for (const term of ["invest in our ventures", "our team", "careers", "contact form"]) {
      expect(html).not.toContain(term);
    }
  });

  it("fails the render when the model is off-spec", async () => {
    // An approved fact still carrying a draft marker must fail the build, not
    // silently ship the placeholder.
    const base = footerWithApproval();
    const broken: FooterContent = {
      ...base,
      facts: [{ ...base.facts[0], value: "TBD" }, ...base.facts.slice(1)],
    };
    await expect(renderFooter({ content: broken })).rejects.toThrow();
  });
});
