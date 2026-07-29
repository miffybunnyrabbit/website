import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import ExternalLink from "./ExternalLink.astro";

/**
 * Accessible external-link primitive gate (implementation plan VD-104).
 *
 * A third-party outbound link must never be hand-rolled: it always carries the
 * safe `rel="noopener noreferrer"` treatment so the destination gets neither the
 * visitor's `Referer` nor a live `window.opener` handle. Extracting that into
 * this one primitive is only worth anything if the primitive actually emits the
 * guarantee, so this test renders it and asserts the rel — a regression that
 * dropped or weakened it (a lone `noopener`, an empty `rel`) fails here.
 *
 * It also pins the shape the footer and the style guide depend on: the shared
 * `.external-link` hook class, the passed-through href, the slotted label, and
 * the *absence* of a `target` — the site's outbound links navigate in place
 * (§5, D-006), so the primitive must not silently open a new tab.
 */
async function render(props: {
  href: string;
  class?: string;
  slots?: { default: string };
}): Promise<string> {
  const container = await AstroContainer.create();
  const { slots, ...rest } = props;
  return container.renderToString(ExternalLink, { props: rest, slots });
}

describe("ExternalLink.astro (VD-104)", () => {
  it("carries the safe rel on every external link", async () => {
    const html = await render({
      href: "https://www.linkedin.com/company/helix-collective",
      slots: { default: "LinkedIn" },
    });
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("renders the destination href and the slotted label", async () => {
    const html = await render({
      href: "https://www.linkedin.com/company/helix-collective",
      slots: { default: "LinkedIn" },
    });
    expect(html).toContain('href="https://www.linkedin.com/company/helix-collective"');
    expect(html).toContain("LinkedIn");
  });

  it("exposes the shared .external-link hook class", async () => {
    const html = await render({ href: "https://example.com/", slots: { default: "Example" } });
    expect(html).toMatch(/class="[^"]*\bexternal-link\b/);
  });

  it("composes an extra class after its own", async () => {
    const html = await render({
      href: "https://example.com/",
      class: "site-footer__link",
      slots: { default: "Example" },
    });
    expect(html).toMatch(/class="[^"]*\bexternal-link\b[^"]*\bsite-footer__link\b/);
  });

  it("never opens a new tab (outbound links navigate in place, §5/D-006)", async () => {
    const html = await render({ href: "https://example.com/", slots: { default: "Example" } });
    expect(html).not.toContain("target=");
  });
});
