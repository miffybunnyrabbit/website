import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import reactRenderer from "@astrojs/react/server.js";
import Fit from "../Fit.astro";
import { questionNodes } from "./fitFlow";

/**
 * FX-202 decision gate — the fit qualifier ships ONE unified presentation.
 *
 * §12.5 of the original plan sketched two presentations: a desktop
 * flowchart-style view of the whole decision tree and a mobile stepper. FX-202
 * asked to build both or record that the unified presentation stands. The
 * recorded decision (IMPLEMENTATION_PLAN.md §5 FX-202) is that it stands: a
 * single accessible one-question-at-a-time stepper serves every viewport, and
 * the whole-tree "flowchart" intent is met without a second interactive surface
 * by the `<noscript>` fallback, which lays every question and outcome out as a
 * flowchart-in-prose (proven in `Fit.test.ts`). A second viewport-forked
 * interactive view would double the DOM to keep accessible (§12.4) and could
 * drift from the stepper — the whole reason the unified presentation was kept.
 *
 * This gate holds the interactive half of that decision: the hydrated island is
 * a stepper (it reveals exactly one question at a time, not the whole graph at
 * once), and there is a single qualifier root with no `--desktop`/`--mobile`
 * fork. If someone later reintroduces a whole-tree flowchart island, this fails
 * and forces the FX-202 decision to be revisited deliberately rather than by
 * drift.
 */
async function renderFit(): Promise<string> {
  const container = await AstroContainer.create();
  container.addServerRenderer({ renderer: reactRenderer });
  container.addClientRenderer({
    name: "@astrojs/react",
    entrypoint: "@astrojs/react/client.js",
  });
  return container.renderToString(Fit, { props: {} });
}

/**
 * The rendered section is the hydrated island followed by the `<noscript>`
 * fallback. The island (the interactive presentation) is everything before the
 * fallback; the fallback deliberately carries the whole graph, so a per-view
 * assertion must look at the island in isolation, not the full HTML.
 */
function interactiveRegion(html: string): string {
  const noscriptAt = html.indexOf("<noscript>");
  expect(noscriptAt, "the no-JS fallback must be present").toBeGreaterThan(-1);
  return html.slice(0, noscriptAt);
}

describe("fit qualifier presentation (FX-202)", () => {
  it("server-renders the interactive island as a one-question-at-a-time stepper", async () => {
    const region = interactiveRegion(await renderFit());
    const questions = questionNodes();

    // The stepper opens on the first question...
    expect(region).toContain(questions[0].prompt);
    // ...and reveals only that one — none of the later questions are painted
    // into the interactive view. A whole-tree flowchart would show them all at
    // once; a stepper shows the branch you are on. This is what "the unified
    // presentation stands" means for the interactive half of the flow.
    for (const later of questions.slice(1)) {
      expect(
        region,
        `question "${later.prompt}" leaked into the interactive island — the qualifier must reveal one question at a time (FX-202)`,
      ).not.toContain(later.prompt);
    }
  });

  it("mounts a single unified qualifier with no viewport-forked variant", async () => {
    const html = await renderFit();

    // Exactly one qualifier root: the one stepper every viewport shares.
    const roots = (html.match(/class="fit-qualifier"/g) ?? []).length;
    expect(roots, "there must be exactly one qualifier root").toBe(1);

    // No `.fit-qualifier--desktop` / `--mobile` (or any) modifier: a modifier
    // would mark a second, viewport-specific presentation, which the FX-202
    // decision deliberately does not ship.
    expect(
      html,
      "a `.fit-qualifier--*` modifier implies a viewport-forked presentation the FX-202 decision rejects",
    ).not.toMatch(/class="[^"]*\bfit-qualifier--/);
  });
});
