import { describe, it, expect, beforeAll } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import reactRenderer from "@astrojs/react/server.js";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import IndexPage from "./pages/index.astro";
import { howWeWorkSteps, howWeWorkCopy } from "./config/howWeWork";
import { assetRegister, publishableAssets } from "./config/assetRegister";

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
 * The assertions are driven off the `howWeWork` and `assetRegister` models, so a
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

  it("publishes an asset depicting a person only under a recorded exception (§16.4)", () => {
    // The no-stock-person criterion, at the model level. §16.4's ban is still the
    // default: every people-depicting asset must either be withheld from the site
    // or carry the owner's written exception. The check is not vacuous — the
    // register carries the legacy "humans of Helix" photography with no exception,
    // and it stays correctly withheld.
    const personAssets = assetRegister.filter((a) => a.containsPeople);
    expect(personAssets.length).toBeGreaterThan(0);
    expect(
      personAssets.every((a) => a.removeFromSite || a.peopleException?.trim()),
    ).toBe(true);
    expect(
      personAssets.some((a) => a.removeFromSite && !a.peopleException),
      "the unexcepted-and-withheld case must still exist, or this gate is vacuous",
    ).toBe(true);
    // Anything publishable that shows a person shows one *because* the owner said
    // so in writing, never by default.
    for (const asset of publishableAssets().filter((a) => a.containsPeople)) {
      expect(asset.peopleException?.trim(), asset.id).toBeTruthy();
    }
  });

  it("renders no image that references a person or withheld asset (§24, §16.4)", () => {
    // Every asset the register flags as removed, or as depicting people without
    // the owner's recorded §16.4 exception, by filename — no rendered `<img>` may
    // point at one. This guards the delivered markup even as legitimate imagery
    // clears the register in future. An excepted asset is allowed here precisely
    // because the exception is written down in the register, where it is audited.
    const forbiddenFiles = new Set(
      assetRegister
        .filter(
          (a) => a.removeFromSite || (a.containsPeople && !a.peopleException?.trim()),
        )
        .map((a) => a.filename),
    );
    const rendered = imageTags(html).map(basename);
    for (const file of rendered) {
      expect(forbiddenFiles.has(file)).toBe(false);
    }
  });
});
