import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { allTokens, tokenValue } from "./config/designTokens";

/**
 * VD-101 gate — every component consumes the design tokens instead of carrying
 * its own colour literals ("No component-local hex values").
 *
 * The token layer (`designTokens.ts` → `global.css`) is the single source of
 * truth for the brand palette, but a scoped `<style>` block in any `.astro`
 * file can silently reintroduce a hard-coded colour (`rgba(0,0,0,.08)`, a raw
 * `#hex`, an `hsl(...)`) that drifts away from the neutral ramp and never trips
 * the `global.css` drift check in `designTokens.test.ts` — that check only
 * watches the generated stylesheet, not the components.
 *
 * This is a static-source gate: it reads the committed `.astro` sources (not the
 * rendered HTML — the container renderer does not inline scoped CSS, see
 * `renderedVisualFidelity.test.ts`) and asserts no `<style>` block declares a
 * colour as a literal. Keyword colours that resolve to an inherited value
 * (`currentColor`, `transparent`) and token references (`var(--…)`) are the only
 * allowed ways to name a colour, so borders and surfaces stay on the token ramp
 * (§16.1/§16.2, VD-102).
 */

/** The `src/` directory this test lives in. */
const SRC_DIR = fileURLToPath(new URL(".", import.meta.url));

/** Recursively collect every `.astro` source under `dir`. */
function astroFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}${entry.name}`;
    if (entry.isDirectory()) {
      out.push(...astroFiles(`${path}/`));
    } else if (entry.name.endsWith(".astro")) {
      out.push(path);
    }
  }
  return out;
}

/** The body of every `<style>` block in a component, comments stripped. */
function styleBlocks(source: string): string[] {
  const blocks: string[] = [];
  const re = /<style[^>]*>([\s\S]*?)<\/style>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    // Drop CSS comments so a colour mentioned in prose never trips the gate.
    blocks.push(match[1].replace(/\/\*[\s\S]*?\*\//g, ""));
  }
  return blocks;
}

/**
 * Colour literals a scoped style must not carry. Hex is matched only as a
 * complete 3/4/6/8-digit value (so an `#id` selector or a longer token is not a
 * false positive); the functional notations are matched by their opening call.
 */
const COLOUR_LITERALS: readonly { label: string; pattern: RegExp }[] = [
  { label: "hex colour", pattern: /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![0-9a-f])/i },
  { label: "rgb()/rgba()", pattern: /\brgba?\(/i },
  { label: "hsl()/hsla()", pattern: /\bhsla?\(/i },
];

/** A relative path for a readable failure message. */
function rel(path: string): string {
  return path.slice(path.indexOf("/src/") + 1);
}

describe("component styles consume the design tokens (VD-101)", () => {
  const files = astroFiles(SRC_DIR);
  const sources = files.map((path) => ({ path, source: readFileSync(path, "utf8") }));

  it("finds the styled components to guard", () => {
    // Guard the guard: if the glob ever stops finding the sections, the "no
    // literals" assertion would pass vacuously.
    const styled = sources.filter(({ source }) => source.includes("<style"));
    expect(styled.length).toBeGreaterThanOrEqual(10);
  });

  it("declares no colour literal in any scoped <style> block", () => {
    const violations: string[] = [];
    for (const { path, source } of sources) {
      for (const body of styleBlocks(source)) {
        for (const line of body.split("\n")) {
          for (const { label, pattern } of COLOUR_LITERALS) {
            if (pattern.test(line)) {
              violations.push(`${rel(path)}: ${label} in "${line.trim()}"`);
            }
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("declares no numeric font-weight literal in any scoped <style> block", () => {
    // The weight scale lives in the tokens (--font-weight-regular/-bold); a
    // scoped `font-weight: 700` silently forks the type system and drifts from
    // the §16 scale exactly like a colour literal would. Keyword values
    // (`inherit`, `bold`) resolve to an inherited/named weight, and `var(--…)`
    // references the token, so those remain the only ways to name a weight.
    const NUMERIC_FONT_WEIGHT = /font-weight:\s*\d/i;
    const violations: string[] = [];
    for (const { path, source } of sources) {
      for (const body of styleBlocks(source)) {
        for (const line of body.split("\n")) {
          if (NUMERIC_FONT_WEIGHT.test(line)) {
            violations.push(`${rel(path)}: numeric font-weight in "${line.trim()}"`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("routes component borders and surfaces through the neutral ramp token", () => {
    // Proves the migration actually happened: the sections now reference the
    // neutral token rather than merely dropping their old literals.
    const consumesNeutral = sources.some(({ source }) =>
      styleBlocks(source).some((body) => body.includes("var(--color-ink-100)")),
    );
    expect(consumesNeutral).toBe(true);
  });

  it("declares no container-width literal in any scoped <style> block", () => {
    // Every section shell caps its content at the shared container width, which
    // lives in the layout tokens as `--width-container`. A scoped
    // `max-width: 72rem` silently forks that width: change the token and the
    // section that kept the literal drifts to a different measure, exactly like
    // a colour or font-weight literal would. The token value is read from the
    // model so this gate tracks it rather than a hand-copied number.
    const containerWidth = tokenValue("--width-container");
    expect(containerWidth, "layout token --width-container must be defined").toBeTruthy();
    // Match the literal value only as a whole CSS token (not as the tail of a
    // longer number), so e.g. `172rem` would not be a false positive.
    const literal = new RegExp(`(?<![\\d.])${containerWidth!.replace(".", "\\.")}(?![\\w])`);
    const violations: string[] = [];
    for (const { path, source } of sources) {
      for (const body of styleBlocks(source)) {
        for (const line of body.split("\n")) {
          if (literal.test(line)) {
            violations.push(`${rel(path)}: container-width literal in "${line.trim()}"`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("routes section-shell container widths through the layout token", () => {
    // Proves the migration happened: the sections reference the width token
    // rather than merely dropping the literal.
    const consumers = sources.filter(({ source }) =>
      styleBlocks(source).some((body) => body.includes("var(--width-container)")),
    );
    // The container caps every section shell, so most styled sections consume it.
    expect(consumers.length).toBeGreaterThanOrEqual(8);
  });

  it("declares no text-measure literal in any scoped <style> block", () => {
    // Lead and body paragraphs cap their line length at the shared reading
    // measure, which lives in the layout tokens as `--width-text`. A scoped
    // `max-width: 48ch` silently forks that measure: change the token and the
    // paragraph that kept the literal drifts to a different line length, exactly
    // like the container-width literal above. Sub-measures the scale has no token
    // for — a headline's `24ch`, a card summary's `40ch` — are genuinely
    // off-scale and left alone; on-scale means: use the token. The token value is
    // read from the model so this gate tracks it rather than a hand-copied number.
    const textMeasure = tokenValue("--width-text");
    expect(textMeasure, "layout token --width-text must be defined").toBeTruthy();
    // Match the literal value only as a whole CSS token (not the tail of a longer
    // number), so e.g. `148ch` would not be a false positive.
    const literal = new RegExp(`(?<![\\d.])${textMeasure!.replace(".", "\\.")}(?![\\w])`);
    const violations: string[] = [];
    for (const { path, source } of sources) {
      for (const body of styleBlocks(source)) {
        for (const line of body.split("\n")) {
          if (literal.test(line)) {
            violations.push(`${rel(path)}: text-measure literal in "${line.trim()}"`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("routes paragraph reading measures through the layout token", () => {
    // Proves the migration happened: the sections reference the measure token
    // rather than merely dropping the literal.
    const consumers = sources.filter(({ source }) =>
      styleBlocks(source).some((body) => body.includes("var(--width-text)")),
    );
    // The hero, case studies, fit result, and both CTAs cap a lead paragraph at
    // the reading measure, so several styled sections consume it.
    expect(consumers.length).toBeGreaterThanOrEqual(4);
  });

  it("declares no spacing-scale literal in any rhythm property", () => {
    // Every rhythm value — padding, margin, gap — rides the `--space-*` scale
    // (§16.4). A scoped `margin: 1.5rem` silently forks that step: change the
    // token and the section that kept the literal drifts off the rhythm, exactly
    // like a colour or container-width literal would. The scale values are read
    // from the model so this gate tracks it rather than hand-copied numbers.
    //
    // The gate flags a value ONLY when it equals a `--space-*` step, so a
    // genuinely off-scale value that the scale has no token for — the `-1px` of
    // the visually-hidden clip pattern, a bespoke `0.375rem` micro-margin — is
    // left alone rather than forced onto the nearest step (which would change the
    // rendered layout). On-scale means: use the token.
    const spacingValues = allTokens()
      .filter((token) => token.name.startsWith("--space-"))
      .map((token) => token.value);
    expect(spacingValues.length, "spacing scale must be defined").toBeGreaterThan(0);
    // A rhythm property whose value could ride the spacing scale. Positioning
    // offsets (top/left/right/bottom/inset) are geometric, not rhythm, so they
    // are out of scope — a connector's `left: 0.85rem` aligns to a marker, it is
    // not a spacing step.
    const RHYTHM_PROPERTY =
      /^\s*(margin|padding|gap|row-gap|column-gap)(-(top|right|bottom|left|block|inline|block-start|block-end|inline-start|inline-end))?\s*:/;
    // Match each scale value only as a whole CSS token (not the tail of a longer
    // number), so e.g. `12.5rem` does not trip the `2.5rem` step.
    const literals = spacingValues.map(
      (value) => new RegExp(`(?<![\\d.])${value.replace(".", "\\.")}(?![\\w])`),
    );
    const violations: string[] = [];
    for (const { path, source } of sources) {
      for (const body of styleBlocks(source)) {
        for (const line of body.split("\n")) {
          if (!RHYTHM_PROPERTY.test(line)) continue;
          if (literals.some((literal) => literal.test(line))) {
            violations.push(`${rel(path)}: spacing-scale literal in "${line.trim()}"`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("routes component spacing through the --space-* scale", () => {
    // Proves the migration happened: the sections reference the spacing tokens
    // rather than merely dropping the literals.
    const consumers = sources.filter(({ source }) =>
      styleBlocks(source).some((body) => body.includes("var(--space-")),
    );
    // Every section shell carries padding and inter-element rhythm, so most
    // styled sections consume the scale.
    expect(consumers.length).toBeGreaterThanOrEqual(8);
  });

  it("declares no type-scale literal in any font-size property", () => {
    // Headings, leads, and labels ride the `--font-size-*` type scale (§16.4). A
    // scoped `font-size: clamp(1.75rem, 4vw, 2.75rem)` silently forks a scale
    // step: change the token and the section that kept the literal drifts off the
    // scale, exactly like a colour or spacing literal would. The scale values are
    // read from the model so this gate tracks it rather than hand-copied numbers.
    //
    // As with the spacing gate, the flag fires ONLY when a font-size equals a
    // defined scale step, so a genuinely off-scale value the scale has no token
    // for — a `1.375rem` result headline, a `0.8125rem` progress label — is left
    // alone rather than forced onto the nearest step (which would change the
    // rendered type). On-scale means: use the token.
    const fontSizeValues = allTokens()
      .filter((token) => token.name.startsWith("--font-size-"))
      .map((token) => token.value);
    expect(fontSizeValues.length, "type scale must be defined").toBeGreaterThan(0);
    const FONT_SIZE_PROPERTY = /^\s*font-size\s*:/;
    // Match each scale value as a whole CSS value (not the tail of a longer
    // number, nor a fragment of another token). Escape every regex metacharacter
    // so the `clamp(...)` values match literally.
    const literals = fontSizeValues.map(
      (value) => new RegExp(`(?<![\\w.])${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w.])`),
    );
    const violations: string[] = [];
    for (const { path, source } of sources) {
      for (const body of styleBlocks(source)) {
        for (const line of body.split("\n")) {
          if (!FONT_SIZE_PROPERTY.test(line)) continue;
          if (literals.some((literal) => literal.test(line))) {
            violations.push(`${rel(path)}: type-scale literal in "${line.trim()}"`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("routes component font sizes through the --font-size-* scale", () => {
    // Proves the migration happened: the sections reference the type-scale tokens
    // rather than merely dropping the literals.
    const consumers = sources.filter(({ source }) =>
      styleBlocks(source).some((body) => body.includes("var(--font-size-")),
    );
    // Every section sets a headline and a lead, so most styled sections consume
    // the type scale.
    expect(consumers.length).toBeGreaterThanOrEqual(8);
  });

  it("declares no eyebrow letter-spacing literal in any letter-spacing property", () => {
    // The wide tracking that reads as an eyebrow/label lives in the tokens as
    // `--letter-spacing-eyebrow`. A scoped `letter-spacing: 0.12em` on a section
    // eyebrow silently forks that value: change the token and the label that kept
    // the literal drifts off the shared tracking, exactly like a colour or
    // spacing literal would. The token value is read from the model so this gate
    // tracks it rather than a hand-copied number.
    //
    // As with the spacing and type-scale gates, the flag fires ONLY on a value
    // that equals the token — the off-scale trackings the scale has no token for
    // (a button's `0.04em`, the footer's `0.06em`, a `0.08em` micro-label) are
    // left alone rather than forced onto the eyebrow value, which would change
    // the rendered type. On-scale means: use the token.
    const eyebrowTracking = tokenValue("--letter-spacing-eyebrow");
    expect(eyebrowTracking, "token --letter-spacing-eyebrow must be defined").toBeTruthy();
    const LETTER_SPACING_PROPERTY = /^\s*letter-spacing\s*:/;
    // Match the literal only as a whole CSS value (not the tail of a longer
    // number), so e.g. `10.12em` would not be a false positive.
    const literal = new RegExp(`(?<![\\d.])${eyebrowTracking!.replace(".", "\\.")}(?![\\w])`);
    const violations: string[] = [];
    for (const { path, source } of sources) {
      for (const body of styleBlocks(source)) {
        for (const line of body.split("\n")) {
          if (!LETTER_SPACING_PROPERTY.test(line)) continue;
          if (literal.test(line)) {
            violations.push(`${rel(path)}: eyebrow letter-spacing literal in "${line.trim()}"`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("routes eyebrow labels through the --letter-spacing-eyebrow token", () => {
    // Proves the migration happened: the section eyebrows reference the tracking
    // token rather than merely dropping the literal.
    const consumers = sources.filter(({ source }) =>
      styleBlocks(source).some((body) => body.includes("var(--letter-spacing-eyebrow)")),
    );
    // Every content section carries an eyebrow/label above its headline, plus the
    // proof banner's metric label, so most styled sections consume the token.
    expect(consumers.length).toBeGreaterThanOrEqual(5);
  });

  it("declares no line-height-scale literal in any line-height property", () => {
    // The tightened leadings that read as "display" and "heading" live in the
    // tokens as `--line-height-display` (the oversized hero headline and proof
    // figure) and `--line-height-heading` (sub-headings). A scoped
    // `line-height: 1.05` on a headline silently forks that value: change the
    // token and the headline that kept the literal drifts off the shared leading,
    // exactly like a colour or spacing literal would. The scale values are read
    // from the model so this gate tracks them rather than hand-copied numbers.
    //
    // As with the spacing and type-scale gates, the flag fires ONLY when a
    // line-height equals a defined scale step, so the genuinely off-scale leadings
    // the scale has no token for — a card title's `1.1`, a compact `1`, a fit
    // result's `1.3` — are left alone rather than forced onto the nearest step
    // (which would change the rendered type). On-scale means: use the token.
    const lineHeightValues = allTokens()
      .filter((token) => token.name.startsWith("--line-height-"))
      .map((token) => token.value);
    expect(lineHeightValues.length, "line-height scale must be defined").toBeGreaterThan(0);
    const LINE_HEIGHT_PROPERTY = /^\s*line-height\s*:/;
    // Match each scale value as a whole CSS value (not the tail of a longer
    // number), so e.g. `1.2` does not trip on `1.25` and `1` does not trip on
    // `1.05`.
    const literals = lineHeightValues.map(
      (value) => new RegExp(`(?<![\\w.])${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w.])`),
    );
    const violations: string[] = [];
    for (const { path, source } of sources) {
      for (const body of styleBlocks(source)) {
        for (const line of body.split("\n")) {
          if (!LINE_HEIGHT_PROPERTY.test(line)) continue;
          if (literals.some((literal) => literal.test(line))) {
            violations.push(`${rel(path)}: line-height-scale literal in "${line.trim()}"`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("routes headline line-heights through the --line-height-* scale", () => {
    // Proves the migration happened: the headlines reference the leading tokens
    // rather than merely dropping the literal.
    const consumers = sources.filter(({ source }) =>
      styleBlocks(source).some((body) => body.includes("var(--line-height-")),
    );
    // The hero headline, proof figure, and the section sub-headings all set a
    // tightened leading, so several styled sections consume the scale.
    expect(consumers.length).toBeGreaterThanOrEqual(4);
  });

  it("declares no radius-scale literal in any border-radius property", () => {
    // The rounded corners that read as "brand" live in the tokens as the
    // `--radius-*` scale (§16.4): --radius-sm for controls, --radius-md for
    // cards, --radius-lg for the large case-study visuals. A scoped
    // `border-radius: 0.375rem` on a control silently forks the small step:
    // change the token and the corner that kept the literal drifts off the
    // shared radius, exactly like a colour or spacing literal would. The scale
    // values are read from the model so this gate tracks it rather than
    // hand-copied numbers.
    //
    // As with the spacing and type-scale gates, the flag fires ONLY when a
    // border-radius equals a defined scale step, so a genuinely off-scale value
    // the scale has no token for — the fit card's `0.5rem`, which sits between
    // --radius-sm and --radius-md — is left alone rather than forced onto the
    // nearest step (which would change the rendered corner). On-scale means: use
    // the token.
    const radiusValues = allTokens()
      .filter((token) => token.name.startsWith("--radius-"))
      .map((token) => token.value);
    expect(radiusValues.length, "radius scale must be defined").toBeGreaterThan(0);
    const BORDER_RADIUS_PROPERTY = /^\s*border-radius\s*:/;
    // Match each scale value as a whole CSS value (not the tail of a longer
    // number), so e.g. `10.375rem` would not trip the `0.375rem` step.
    const literals = radiusValues.map(
      (value) => new RegExp(`(?<![\\d.])${value.replace(".", "\\.")}(?![\\w])`),
    );
    const violations: string[] = [];
    for (const { path, source } of sources) {
      for (const body of styleBlocks(source)) {
        for (const line of body.split("\n")) {
          if (!BORDER_RADIUS_PROPERTY.test(line)) continue;
          if (literals.some((literal) => literal.test(line))) {
            violations.push(`${rel(path)}: radius-scale literal in "${line.trim()}"`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("routes component corner radii through the --radius-* scale", () => {
    // Proves the migration happened: a section references the radius tokens
    // rather than merely dropping the literal.
    const consumers = sources.filter(({ source }) =>
      styleBlocks(source).some((body) => body.includes("var(--radius-")),
    );
    expect(consumers.length).toBeGreaterThanOrEqual(1);
  });

  it("declares no raw timing literal in any scoped transition (VD-105)", () => {
    // Interaction transitions ride the shared motion scale: every duration is a
    // `--duration-*` token and the timing function is `--ease-standard`
    // (P3-005, VD-105). A scoped `transition: color 200ms ease` forks that
    // scale — change the tokens and the component that kept the literal drifts
    // off the shared motion feel, exactly like a colour or spacing literal
    // would. The `.cta-button` and `.skip-link` primitives already ride the
    // scale in `global.css`; this keeps the section-scoped transitions on it too.
    //
    // Continuous `animation` (the logo marquee's `40s linear infinite`) is out
    // of scope: a multi-second linear scroll is genuinely off the interaction
    // scale, which has no token for it, so — like the off-scale spacing and type
    // values the gates above leave alone — it keeps its literal rather than being
    // forced onto a step. This gate watches `transition` shorthands only.
    const TRANSITION_DECL = /transition\s*:\s*([^;]*);/gi;
    const RAW_DURATION = /\d*\.?\d+m?s\b/;
    const RAW_EASING = /\b(?:ease(?:-in|-out|-in-out)?|linear|step-start|step-end|steps)\b/;
    const violations: string[] = [];
    for (const { path, source } of sources) {
      for (const body of styleBlocks(source)) {
        let match: RegExpExecArray | null;
        while ((match = TRANSITION_DECL.exec(body)) !== null) {
          // Strip token references so `var(--ease-standard)` / `var(--duration-*)`
          // never trip the raw-value patterns; what remains is property names,
          // commas, and any literal timing that leaked through.
          const value = match[1].replace(/var\(\s*--[a-z0-9-]+\s*\)/gi, "");
          if (RAW_DURATION.test(value) || RAW_EASING.test(value)) {
            violations.push(`${rel(path)}: raw timing in "transition: ${match[1].trim()}"`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("routes interaction transitions through the motion scale", () => {
    // Proves the migration happened: the sections reference the easing token
    // rather than merely dropping the `ease` keyword.
    const consumers = sources.filter(({ source }) =>
      styleBlocks(source).some((body) => body.includes("var(--ease-standard)")),
    );
    // The how-we-work active-stage cue and the fit-answer hover cue both ride
    // the scale.
    expect(consumers.length).toBeGreaterThanOrEqual(2);
  });
});
