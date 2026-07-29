import { describe, it, expect, beforeAll } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import reactRenderer from "@astrojs/react/server.js";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import NotFoundPage from "./pages/404.astro";
import { footer, publishedFooter } from "./config/footer";

/**
 * Assembled 404 branding gate (implementation plan §7 information architecture).
 *
 * §7 lists `/404.html` as a "Branded not-found page", not a bare browser-style
 * fallback: a visitor who lands on a dead link must still land on something that
 * looks like Helix and offers a route back into the site. Every other section
 * gets its own assembled-page gate; the 404 only had metadata, structure,
 * performance, and forbidden-copy checks — none of which would notice if the
 * page shipped as an unbranded `<h1>` on a blank document. A future edit could
 * drop the institutional footer or the route home and every existing test would
 * stay green.
 *
 * This is that gate. It renders the real 404 route to the HTML a visitor
 * receives and asserts the two things that make it "branded": the shared
 * institutional footer (its brand mark linking home, the always-safe part of the
 * §14 footer model) is present, and the main content routes the visitor back to
 * the site root. Both are driven off the `footer` content model so a change to
 * the brand mark can never silently desync this gate.
 *
 * Like its sibling gates this file lives at `src/` rather than `src/pages/`:
 * Astro treats every file under `src/pages/` as a route and bundles it into the
 * SSR entry, so a `.test.ts` there pulls `vitest` into `astro build` and crashes
 * it. It still runs under the `src/**` vitest glob.
 */
async function renderPage(Component: AstroComponentFactory): Promise<string> {
  const container = await AstroContainer.create();
  // Register the React renderer for parity with the other assembled-page gates;
  // the 404 mounts no island, so this changes nothing but keeps the harness
  // identical if a future edit ever adds one.
  container.addServerRenderer({ renderer: reactRenderer });
  container.addClientRenderer({
    name: "@astrojs/react",
    entrypoint: "@astrojs/react/client.js",
  });
  return container.renderToString(Component);
}

/** The `<main>` content of the rendered page (the not-found message block). */
function mainContent(html: string): string {
  return (html.match(/<main\b[\s\S]*?<\/main>/) ?? [""])[0];
}

/** The institutional `<footer>` block of the rendered page. */
function footerBlock(html: string): string {
  return (html.match(/<footer\b[\s\S]*?<\/footer>/) ?? [""])[0];
}

describe("assembled 404 is a branded not-found page (§7)", () => {
  let html: string;

  beforeAll(async () => {
    html = await renderPage(NotFoundPage as unknown as AstroComponentFactory);
  });

  // Positive control: we are auditing the real 404 route — its not-found heading
  // is on the page — so the branding assertions below cannot pass on some other
  // document.
  it("renders the not-found message with a single main heading (§7)", () => {
    expect(html).toContain("<h1");
    expect(html).toMatch(/<h1\b[^>]*>[\s\S]*doesn[’']t exist/i);
  });

  it("carries the shared institutional footer with the brand mark (§7, §14)", () => {
    const brand = publishedFooter(footer).brand;
    const foot = footerBlock(html);
    expect(foot).not.toBe("");
    // The always-safe part of the §14 footer — the brand mark linking home —
    // makes the page recognisably Helix even when every identity fact is still
    // pending approval.
    expect(foot).toContain(`href="${brand.href}"`);
    expect(foot).toContain(brand.label);
  });

  it("routes the lost visitor back into the site from the main content (§7)", () => {
    // A dead-end 404 is not branded; the message block must offer a way home.
    expect(mainContent(html)).toMatch(/<a\b[^>]*href="\/"/);
  });

  // Meta-guard: prove the footer assertion actually inspects the rendered output.
  // If the institutional footer were dropped, the branding check must notice —
  // otherwise a passing suite would be meaningless.
  it("would fail if the branded footer were dropped from the page (meta-test)", () => {
    const brand = publishedFooter(footer).brand;
    const stripped = html.replace(/<footer\b[\s\S]*?<\/footer>/, "");
    expect(footerBlock(stripped)).toBe("");
    // The brand mark no longer resolves on the stripped document.
    expect(footerBlock(stripped)).not.toContain(brand.label);
  });
});
