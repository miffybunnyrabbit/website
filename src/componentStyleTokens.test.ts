import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { tokenValue } from "./config/designTokens";

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
});
