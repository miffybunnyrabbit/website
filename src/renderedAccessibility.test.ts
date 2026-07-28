import { describe, it, expect, beforeAll } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import reactRenderer from "@astrojs/react/server.js";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import IndexPage from "./pages/index.astro";
import NotFoundPage from "./pages/404.astro";
import {
  assertAccessibleDocument,
  auditDocumentStructure,
  headingOutline,
  type DocumentSource,
} from "./config/documentStructure";

/**
 * Assembled-page accessibility gate (implementation plan P7-005, §8.2).
 *
 * Each section component unit-tests its own landmark and heading in isolation,
 * and `documentStructure.ts` unit-tests the checker against fixtures — but
 * nothing rendered the *actual* routes and audited the composed document. That
 * left a hole: two components could each ship a lone `<h1>` and pass their own
 * tests while the assembled page carries two; a future edit could drop the
 * shared skip link or `<main>` from `BaseLayout` and every component test would
 * stay green. §8.2 requires integration tests over the rendered page and P7-005
 * targets WCAG 2.2 AA landmarks, heading order, a skip link, and a document
 * language. This is that gate: it renders the whole page tree — including the
 * server-rendered React fit-qualifier island — to the same HTML a visitor
 * receives and runs it through `assertAccessibleDocument`.
 *
 * Like `renderedCopy.test.ts`, this file deliberately lives at `src/` rather
 * than `src/pages/`: Astro treats every file under `src/pages/` as a route and
 * bundles it into the SSR entry, so a `.test.ts` there pulls `vitest` into
 * `astro build` and crashes it. It still runs under the `src/**` vitest glob.
 */
async function renderPage(Component: AstroComponentFactory): Promise<string> {
  const container = await AstroContainer.create();
  // Register the React renderer so the fit-qualifier island's server-rendered
  // markup (its heading and controls) is part of the audited document, not
  // skipped — a stray heading there would break the outline just the same.
  container.addServerRenderer({ renderer: reactRenderer });
  container.addClientRenderer({
    name: "@astrojs/react",
    entrypoint: "@astrojs/react/client.js",
  });
  return container.renderToString(Component);
}

describe("rendered pages are structurally accessible (P7-005, §8.2)", () => {
  let sources: DocumentSource[];
  let home: string;

  beforeAll(async () => {
    home = await renderPage(IndexPage as unknown as AstroComponentFactory);
    const notFound = await renderPage(
      NotFoundPage as unknown as AstroComponentFactory,
    );
    sources = [
      { label: "/", html: home },
      { label: "/404", html: notFound },
    ];
  });

  it("ships every route with a sound document structure", () => {
    // The single readable assertion that powers the build gate.
    expect(() => assertAccessibleDocument(sources)).not.toThrow();
  });

  it("reports no per-rule violations on any route", () => {
    for (const source of sources) {
      expect(auditDocumentStructure(source.html)).toEqual([]);
    }
  });

  it("gives the homepage exactly one <h1> carrying the enterprise-value promise", () => {
    const outline = headingOutline(home);
    const h1s = outline.filter((h) => h.level === 1);
    expect(h1s).toHaveLength(1);
    expect(h1s[0].text.toLowerCase()).toContain("enterprise value");
  });

  it("opens the homepage outline at h1 and never skips a level", () => {
    const outline = headingOutline(home);
    expect(outline[0].level).toBe(1);
    for (let i = 1; i < outline.length; i++) {
      expect(outline[i].level - outline[i - 1].level).toBeLessThanOrEqual(1);
    }
  });
});
