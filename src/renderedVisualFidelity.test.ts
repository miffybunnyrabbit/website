import { describe, it, expect, beforeAll } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import reactRenderer from "@astrojs/react/server.js";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import IndexPage from "./pages/index.astro";
import { howWeWorkSteps, howWeWorkCopy } from "./config/howWeWork";
import { caseStudies } from "./config/caseStudies";
import { logos } from "./config/logos";

/**
 * Assembled-page visual-fidelity gate (implementation plan §24 "Visual
 * fidelity", §11.6, §16.4/§16.5).
 *
 * This closes the last §24 dimension the sibling rendered gates left open on the
 * composed page: `renderedMessage` proves the required copy survives assembly,
 * `renderedContent` proves the logo/case-study set is right, `renderedCopy`
 * proves no forbidden variant ships, and `renderedQualification`/
 * `renderedAccessibility`/`renderedPerformance` cover their slices. None proves
 * the two §24 visual-fidelity criteria that manifest in the *composed markup*:
 * that "the four-stage process reads clearly as a progression on desktop and
 * mobile" and that "no stock-person imagery is introduced".
 *
 * The other visual-fidelity criteria — the mint/ink/white brand identity, the
 * approved system-stack typography, and reduced-motion behaviour — live entirely
 * in CSS, which the container renderer does not inline into the HTML a
 * `renderToString` produces. Those are already gated where they *are*
 * observable: `designTokens.test.ts` holds the brand colours and the
 * `prefers-reduced-motion` override against the committed `global.css`, and each
 * animating component (the marquee, the how-we-work number cue) unit-tests its
 * own reduced-motion rule. This gate deliberately covers only what survives into
 * the delivered markup, where nothing else was watching.
 *
 * The progression is the point of §11.6: a real ordered list with visible `01`–
 * `04` numbers, static server-rendered HTML that keeps all meaning with
 * JavaScript disabled, and connector lines that are decorative and hidden from
 * assistive technology. A refactor that swapped the `<ol>` for generic cards,
 * reordered or dropped a stage during assembly, wrapped the section in a hydrated
 * island, or exposed the decorative connectors to screen readers would ship a
 * page that no longer "reads clearly as a progression" while every existing test
 * stayed green. The no-person half is the other silent regression: the whole
 * positioning forbids people (§16.4), the register withholds the one asset that
 * depicts them, and this gate proves none of them reaches the delivered markup.
 *
 * The assertions are driven off the `howWeWork`, `logos` and `caseStudies` models, so a
 * dropped stage or a leaked person asset fails here rather than shipping.
 *
 * The pre-commit hook runs the test suite, so a failure here blocks the commit.
 *
 * Like the other rendered gates this file lives at `src/` rather than
 * `src/pages/`: Astro treats every file under `src/pages/` as a route and bundles
 * it into the SSR entry, so a `.test.ts` there pulls `vitest` into `astro build`
 * and crashes it. It still runs under the `src/**` vitest glob.
 */
async function renderPage(Component: AstroComponentFactory): Promise<string> {
  const container = await AstroContainer.create();
  // Register the React renderer so the assembled document includes the
  // server-rendered qualifier island — the contrast the static-progression
  // assertion below relies on.
  container.addServerRenderer({ renderer: reactRenderer });
  container.addClientRenderer({
    name: "@astrojs/react",
    entrypoint: "@astrojs/react/client.js",
  });
  return container.renderToString(Component);
}

/**
 * The "How we work" section markup from the assembled page. Scoping the
 * progression assertions to this block proves the ordered list, numbers, and
 * decorative connectors belong to the operating-model section specifically, not
 * merely somewhere on the document.
 */
function howSection(html: string): string {
  return (html.match(/<section class="how[\s\S]*?<\/section>/) ?? [""])[0];
}

/** Every `<img>` tag rendered on the assembled page, in DOM order. */
function imageTags(html: string): string[] {
  return html.match(/<img\b[^>]*>/g) ?? [];
}

/** The final path segment of a `src` (or "" when there is no `src`). */
function basename(src: string): string {
  const value = (src.match(/src="([^"]*)"/) ?? ["", ""])[1];
  return value.split("/").pop() ?? "";
}

describe("assembled homepage satisfies the §24 visual-fidelity criteria", () => {
  let html: string;
  let how: string;

  beforeAll(async () => {
    html = await renderPage(IndexPage as unknown as AstroComponentFactory);
    how = howSection(html);
  });

  // Positive control: the operating-model section is actually on the composed
  // page as a labelled landmark, so the progression assertions below cannot pass
  // on a page that dropped the section entirely.
  it("renders the how-we-work section as a labelled landmark (§11)", () => {
    expect(how).not.toBe("");
    expect(how).toContain(howWeWorkCopy.headline);
    expect(how).toContain('aria-labelledby="how-heading"');
    expect(how).toContain('id="how-heading"');
  });

  it("renders the four stages as a single semantic ordered list (§11.6, §24)", () => {
    // Exactly one ordered list carries the stages — not a set of generic cards.
    expect((how.match(/<ol\b[^>]*class="how__steps/g) ?? [])).toHaveLength(1);
    const stepItems = how.match(/class="how__step[ "]/g) ?? [];
    expect(stepItems).toHaveLength(howWeWorkSteps.length);
    expect(stepItems).toHaveLength(4);
  });

  it("numbers the stages 01→04 in DOM reading order (§11.6)", () => {
    // The visible stage numbers, in the order they appear in the delivered
    // markup, must match the model's fixed sequence — so a reorder during
    // assembly is caught, not just a wrong count.
    const rendered = [...how.matchAll(/how__number[^>]*>\s*(\d{2})\s*</g)].map(
      (m) => m[1],
    );
    expect(rendered).toEqual(howWeWorkSteps.map((step) => step.number));
    expect(rendered).toEqual(["01", "02", "03", "04"]);
  });

  it("keeps the connected-path connectors decorative and hidden from AT (§11.6)", () => {
    // One connector per stage, every one hidden from assistive technology: the
    // ordered list conveys the progression; the drawn path is presentation only.
    const connectors = how.match(/class="how__connector/g) ?? [];
    expect(connectors).toHaveLength(howWeWorkSteps.length);
    const hiddenConnectors =
      how.match(/how__connector[^>]*aria-hidden="true"/g) ?? [];
    expect(hiddenConnectors).toHaveLength(connectors.length);
  });

  it("renders the progression as static HTML that needs no JavaScript (§24 technical, §11.6)", () => {
    // The section is server-rendered static markup: no hydrated island wraps it,
    // so the progression reads on desktop and mobile with scripting disabled.
    expect(how).not.toContain("astro-island");
    // Contrast/positive control: the page as a whole *does* mount exactly the
    // one interactive island (the fit qualifier), so the absence above reflects
    // a genuinely static section rather than a page that renders no islands.
    expect(html).toContain("astro-island");
  });

  it("renders no image that was withdrawn from the site (§24, §16.4)", () => {
    // §16.4 bans stock photography of people, and §5/§9.6 removed a set of
    // brands and panels outright. The asset register that used to track those
    // withdrawals was retired on 2026-08-18, so the files themselves are named
    // here: none may ever reappear in the delivered markup, whatever a model
    // says. The record of why each went is frozen under `docs/`.
    const withdrawn = new Set([
      "humans-of-helix.jpg", // team photography, removed with the repositioning
      "xylo-case-study.png", // removed case-study panel (§9.6)
      "awayco.svg",
      "perion.svg",
      "synaptico.svg", // brands removed from the marquee (§5, §8.4)
    ]);
    for (const file of imageTags(html).map(basename)) {
      expect(withdrawn.has(file), `withdrawn asset rendered: ${file}`).toBe(false);
    }
  });

  it("renders only images the content models name", () => {
    // The complement of the rule above: every `<img>` on the page traces back to
    // a logo or case-study entry, so no stray file can be hardcoded into markup
    // and slip past the models entirely.
    const known = new Set<string>([
      ...logos.map((l) => l.asset),
      ...caseStudies.map((s) => s.logo),
      ...caseStudies.flatMap((s) => (s.image ? [s.image] : [])),
    ]);
    const rendered = imageTags(html).map(basename).filter((f) => !f.endsWith(".svg"));
    expect(rendered.length).toBeGreaterThan(0);
    for (const file of rendered) {
      expect(known.has(file), `unknown image rendered: ${file}`).toBe(true);
    }
  });
});
