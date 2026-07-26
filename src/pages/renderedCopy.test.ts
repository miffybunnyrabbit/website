import { describe, it, expect, beforeAll } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import reactRenderer from "@astrojs/react/server.js";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import IndexPage from "./index.astro";
import NotFoundPage from "./404.astro";
import {
  assertNoForbiddenCopy,
  scanForbiddenCopy,
  type CopySource,
} from "../config/forbiddenCopy";
import { HERO_HEADLINE } from "../config/hero";
import { PRIMARY_CTA_LABEL } from "../config/cta";
import { proofBanner } from "../config/proofBanner";

/**
 * End-to-end forbidden-copy gate (implementation plan §8.6, §21 `validate:copy`).
 *
 * Every content model already polices its own data, and `forbiddenCopy.ts` unit-
 * tests the matcher against fixtures — but nothing rendered the *actual* pages
 * and scanned them. That left a hole: a regression that reintroduced a banned
 * phrase in a component's markup, a hardcoded string, the document metadata, the
 * JSON-LD, or an image's alt text would ship while every existing test stayed
 * green. §8.6 requires the build to fail if the *production output* contains any
 * forbidden variant, scanning "HTML, metadata, JSON-LD, image alt text, and the
 * JavaScript payload strings". This is that gate: it renders the whole page tree
 * (including the server-rendered React island) to the same HTML a visitor
 * receives and runs it through `assertNoForbiddenCopy`, exactly the build step
 * that module was written to power.
 *
 * The pre-commit hook runs the test suite, so a failure here blocks the commit.
 */
async function renderPage(Component: AstroComponentFactory): Promise<string> {
  const container = await AstroContainer.create();
  // Register the React renderer so the fit-qualifier island's server-rendered
  // markup (its first question, answer labels, and CTA) is part of the scanned
  // output, not skipped.
  container.addServerRenderer({ renderer: reactRenderer });
  container.addClientRenderer({
    name: "@astrojs/react",
    entrypoint: "@astrojs/react/client.js",
  });
  return container.renderToString(Component);
}

describe("rendered pages ship no forbidden copy (§8.6)", () => {
  let homeHtml: string;
  let notFoundHtml: string;
  let sources: CopySource[];

  beforeAll(async () => {
    homeHtml = await renderPage(IndexPage as unknown as AstroComponentFactory);
    notFoundHtml = await renderPage(
      NotFoundPage as unknown as AstroComponentFactory,
    );
    sources = [
      { label: "/", text: homeHtml },
      { label: "/404", text: notFoundHtml },
    ];
  });

  // Positive controls: prove the render is substantive and the approved,
  // required copy is present, so a "clean" result cannot be an empty render.
  it("renders a substantive homepage document", () => {
    expect(homeHtml).toContain("<html");
    expect(homeHtml).toContain(HERO_HEADLINE);
    expect(homeHtml).toContain(PRIMARY_CTA_LABEL);
  });

  it("renders the 404 document", () => {
    expect(notFoundHtml).toContain("<html");
    expect(notFoundHtml).toContain("Helix Collective");
  });

  it("the homepage output contains no forbidden copy", () => {
    expect(scanForbiddenCopy(homeHtml)).toEqual([]);
  });

  it("the 404 output contains no forbidden copy", () => {
    expect(scanForbiddenCopy(notFoundHtml)).toEqual([]);
  });

  it("passes the whole-site forbidden-copy assertion", () => {
    expect(() => assertNoForbiddenCopy(sources)).not.toThrow();
  });

  // Meta-guard: prove the gate actually scans the real rendered output. If a
  // banned phrase is spliced into the genuine homepage HTML, the assertion must
  // catch it and name the route — otherwise a passing suite would be meaningless.
  it("would fail the build if a banned phrase reached the rendered output", () => {
    const poisoned: CopySource[] = [
      { label: "/", text: `${homeHtml}\n<p>market domination awaits.</p>` },
    ];
    expect(() => assertNoForbiddenCopy(poisoned)).toThrow(/market domination/i);
    expect(() => assertNoForbiddenCopy(poisoned)).toThrow(/^Forbidden copy found/);
  });

  // The required "10+ years" proof figure must not be mistaken for a removed
  // "N ventures/humans" count — guarding the gate against a false positive that
  // would block a legitimate build once the banner is published (D-001). This
  // scans the model copy directly so it holds regardless of publication state.
  it("does not flag the required proof figures", () => {
    const bannerText = proofBanner.metrics
      .map((m) => `${m.value} ${m.label}`)
      .join(" ");
    expect(bannerText).toMatch(/10\+/);
    expect(scanForbiddenCopy(bannerText)).toEqual([]);
  });
});
