import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Section-shell primitive gate (VD-104 shared primitives).
 *
 * Every homepage section framed its content the same way — cap it at the
 * container width, centre it, and gutter it with the shared inline padding — but
 * each one hand-copied that `max-width; margin-inline; padding` block into its
 * own scoped `<style>`. Nine identical copies meant nine chances to drift: one
 * section could quietly widen its measure or change its gutter and every other
 * gate would stay green. This pins the fix the same way `eyebrow.test.ts` and
 * `ctaButton.test.ts` pin theirs — a single shared `.section-shell` primitive in
 * the generated `global.css` carries the width, centring and gutter, and every
 * section shell carries that class so they can never diverge.
 *
 * The block padding (vertical rhythm) legitimately varies by section — content
 * sections breathe more than the header nav bar or the footer — so it stays
 * scoped as `padding-block`; only the horizontal frame is shared. Two things can
 * silently break that and leave every other gate green: the primitive could stop
 * carrying the width/centring/gutter, or a section could keep its own scoped
 * `max-width: var(--width-container)` (forking the frame). Both are checked here;
 * the scoped-literal half is also enforced by componentStyleTokens.test.ts.
 *
 * Like the sibling rendered gates this file lives at `src/` rather than
 * `src/pages/`: Astro treats every file under `src/pages/` as a route, so a
 * `.test.ts` there is bundled into the SSR entry and crashes `astro build`.
 */
function read(relative: string): string {
  return readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

/** Declaration body of a single CSS rule by exact selector. */
function ruleBody(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`Rule "${selector}" not found in stylesheet`);
  return match[1];
}

/** The body of every `<style>` block in a component, comments stripped. */
function styleBlocks(source: string): string[] {
  const blocks: string[] = [];
  const re = /<style[^>]*>([\s\S]*?)<\/style>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    blocks.push(match[1].replace(/\/\*[\s\S]*?\*\//g, ""));
  }
  return blocks;
}

/** Every section whose shell must route through the shared primitive. */
const SHELL_SECTIONS: readonly string[] = [
  "Header.astro",
  "Hero.astro",
  "WhyHelix.astro",
  "HowWeWork.astro",
  "CaseStudies.astro",
  "Fit.astro",
  "FinalCta.astro",
  "Footer.astro",
];

/**
 * The one documented exception. The proof strip is a full-bleed, rule-divided
 * band (RW-002): its metric cells run to the viewport edge so each figure sits on
 * the centre of the half it is ruled into. Framing it with the shell would cap
 * the cells at --width-container while the rules kept running to the edge, which
 * pulls both callouts off the centre of their own cell and toward the middle of
 * the band. The exception is asserted rather than merely omitted, so the section
 * cannot silently drift back into a hand-rolled container of its own.
 */
const FULL_BLEED_SECTIONS: readonly string[] = ["ProofBanner.astro"];

describe("section-shell primitive (VD-104)", () => {
  const css = read("./styles/global.css");

  it("defines the shared .section-shell primitive with the width, centring and gutter", () => {
    const body = ruleBody(css, ".section-shell");
    expect(body).toMatch(/max-width:\s*var\(--width-container\)/);
    expect(body).toMatch(/margin-inline:\s*auto/);
    // The gutter rides the spacing scale, and is applied as inline padding only
    // so each section can still set its own vertical rhythm with padding-block.
    expect(body).toMatch(/padding-inline:\s*var\(--space-\d+\)/);
  });

  for (const file of FULL_BLEED_SECTIONS) {
    it(`keeps ${file} full-bleed, with no hand-rolled container`, () => {
      const source = read(`./components/${file}`);
      expect(source).not.toMatch(/class="[^"]*\bsection-shell\b/);
      for (const body of styleBlocks(source)) {
        expect(body, "a full-bleed section must not re-create the shell").not.toMatch(
          /max-width:\s*var\(--width-container\)/,
        );
        expect(body, "a full-bleed section must not re-create the shell").not.toMatch(
          /margin-inline:\s*auto/,
        );
      }
    });
  }

  for (const file of SHELL_SECTIONS) {
    it(`applies the shared .section-shell primitive in ${file}`, () => {
      const source = read(`./components/${file}`);
      // The section must frame its shell with the shared class...
      expect(source).toMatch(/class="[^"]*\bsection-shell\b/);
      // ...and must not keep a scoped copy of the horizontal frame that would
      // fork the width or centring away from the primitive.
      for (const body of styleBlocks(source)) {
        expect(body, "scoped container-width should route through the shell").not.toMatch(
          /max-width:\s*var\(--width-container\)/,
        );
        expect(body, "scoped centring should route through the shell").not.toMatch(
          /margin-inline:\s*auto/,
        );
      }
    });
  }
});
