import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import StyleGuide from "./dev/style-guide.astro";
import { TOKEN_GROUPS, allTokens } from "./config/designTokens";

/**
 * VD-106 gate — the dev-only style guide is the acceptance surface for the
 * whole token system (VD-101…VD-105), and its value depends on two invariants
 * that nothing else watches:
 *
 *  1. It is *complete*. The guide iterates `TOKEN_GROUPS`, so a token added to
 *     `designTokens.ts` should surface here automatically. This gate renders the
 *     page and asserts every token name and group title reaches the markup, so a
 *     refactor that special-cased the rendering and silently dropped a token —
 *     leaving the guide advertising a system it no longer fully shows — fails
 *     here instead of shipping a lying reference page.
 *  2. It is *excluded from production builds*. The route is mounted only while
 *     `astro dev` runs, via the `dev-style-guide` integration's
 *     `command === "dev"` guard in `astro.config.mjs`, and the entrypoint lives
 *     under `src/dev/` rather than `src/pages/` so nothing auto-routes it. This
 *     gate reads the committed config and asserts that wiring is intact, the way
 *     `staticOutput.test.ts` guards the output mode — so a change that dropped
 *     the guard (leaking a dev page into `dist/`) or moved the entrypoint (so the
 *     injected route 404s in dev) is caught.
 *
 * Like the sibling rendered gates this file lives at `src/` rather than
 * `src/pages/`: Astro routes every file under `src/pages/`, so a `.test.ts`
 * there pulls `vitest` into `astro build` and crashes it. It still runs under
 * the `src/**` vitest glob.
 */
async function renderPage(Component: AstroComponentFactory): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(Component);
}

/** Read a committed file at a path relative to the repository root. */
function readRepo(relative: string): string {
  return readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), "utf8");
}

describe("the dev style guide renders the whole token system (VD-106)", () => {
  it("has a non-trivial set of tokens to demonstrate (guards the guard)", () => {
    // A vacuous token list would make the completeness assertions below pass
    // without proving anything.
    expect(allTokens().length).toBeGreaterThanOrEqual(30);
  });

  it("shows every design token so the guide cannot drift from the model", async () => {
    const html = await renderPage(StyleGuide);
    const missing = allTokens()
      .map((token) => token.name)
      .filter((name) => !html.includes(name));
    expect(missing, "tokens defined in the model but absent from the guide").toEqual([]);
  });

  it("labels every token group", async () => {
    const html = await renderPage(StyleGuide);
    for (const group of TOKEN_GROUPS) {
      expect(html).toContain(group.title);
    }
  });

  it("demonstrates the shared primitives (VD-104)", async () => {
    const html = await renderPage(StyleGuide);
    expect(html).toContain("cta-button");
    expect(html).toContain("skip-link");
    expect(html).toContain('class="eyebrow"');
    // The section shell is a primitive too, so the guide must demonstrate it or
    // it advertises an incomplete system.
    expect(html).toContain('class="section-shell');
    // The proof-metric figure is the most recently extracted primitive.
    expect(html).toContain('class="metric"');
  });

  it("shows the mint accent so the brand colour is eyeballable", async () => {
    const html = await renderPage(StyleGuide);
    expect(html).toContain("#5affba");
  });
});

describe("the style guide stays out of production builds (VD-106)", () => {
  const config = readRepo("astro.config.mjs");

  it("mounts the guide only while `astro dev` runs", () => {
    // The dev-only guard is what keeps the page out of `astro build`'s dist/.
    expect(config).toContain('"astro:config:setup"');
    expect(config).toContain('command !== "dev"');
    expect(config).toContain('pattern: "/dev/style-guide"');
    expect(config).toContain('entrypoint: "./src/dev/style-guide.astro"');
  });

  it("keeps the entrypoint outside src/pages so nothing auto-routes it", () => {
    // Present on disk (a moved entrypoint would 404 the injected dev route)...
    const entrypoint = fileURLToPath(new URL("./dev/style-guide.astro", import.meta.url));
    expect(statSync(entrypoint).isFile()).toBe(true);
    // ...and not under src/pages, where Astro would emit it into the static build.
    expect(config).not.toContain("src/pages/dev");
  });
});
