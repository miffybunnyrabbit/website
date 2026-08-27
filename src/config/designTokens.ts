/**
 * Validated design-token model and global stylesheet renderer (implementation
 * plan Phase 3 — P3-001 CSS reset and global semantics, P3-002 tokens, and
 * P3-005 motion system; and §16 Visual system).
 *
 * The homepage sections each carry their own scoped styles, but until now there
 * was no shared foundation: no reset, no brand colours, no spacing or motion
 * scale, and the `skip-link` in `BaseLayout.astro` was referenced without any
 * styling, so it rendered as a permanently visible link at the top of every
 * page. This module is the single, testable source of truth for that
 * foundation.
 *
 * Following the same pattern as `securityHeaders.ts` and `redirects.ts`, it
 * defines the tokens as structured data, validates them (well-formed names, no
 * duplicates, valid hex colours, the plan's required brand colours present,
 * positive motion durations, and a contrast check on the focus colour that §16.2
 * explicitly demands), and renders the exact stylesheet text. `src/styles/global.css`
 * is the rendered output, imported once by `BaseLayout.astro`, and
 * `designTokens.test.ts` asserts the committed file still matches this model so
 * the two can never drift.
 *
 * Scope and deliberate omissions, per the plan:
 *
 *   - Colours come from §16.1 (brand mint/ink/white) and §16.2 (neutrals derived
 *     from ink and white). The sample focus colour is only accepted after the
 *     contrast check §16.2 requires.
 *   - Fonts (P3-003) are self-hosted latin woff2 subsets of Oswald 700 and
 *     Roboto 400–700 — the families the 2026-07-29 live-site audit identified,
 *     cleared for self-hosting by the D-010 decision (both are open-licence
 *     Google Fonts). `BaseLayout.astro` preloads the two files.
 *
 * This module is pure configuration plus validation and string rendering: no UI,
 * no I/O.
 */

/** A single CSS custom property: `--name: value`. */
export interface DesignToken {
  /** Custom-property name including the leading `--`, e.g. `--color-accent`. */
  name: string;
  /** The property value, rendered verbatim. */
  value: string;
  /** Optional trailing note rendered as a comment beside the declaration. */
  note?: string;
}

/** A named, commented group of related tokens, rendered together in `:root`. */
export interface TokenGroup {
  /** Machine key used for validation messages and colour detection. */
  key: string;
  /** Human title rendered as a section comment inside `:root`. */
  title: string;
  /** The tokens in declaration order. */
  tokens: readonly DesignToken[];
}

/**
 * Brand colours the model must carry unchanged from §16.1. Rendering or
 * validation fails if any is missing or altered, so the core palette can never
 * drift away from the approved brand.
 */
export const REQUIRED_BRAND_COLORS: Readonly<Record<string, string>> = {
  "--color-helix-mint": "#5affba",
  "--color-helix-ink": "#000000",
  "--color-white": "#ffffff",
};

/**
 * The token groups. Order is preserved in the rendered `:root` block. Colours
 * are §16.1 brand plus §16.2 neutrals; the remaining groups implement the
 * spacing, layout, radii and motion scales P3-002/P3-005 call for.
 */
export const TOKEN_GROUPS: readonly TokenGroup[] = [
  {
    key: "color",
    title: "Colour — brand (§16.1) and neutrals derived from ink and white (§16.2)",
    tokens: [
      { name: "--color-helix-mint", value: "#5affba" },
      { name: "--color-helix-ink", value: "#000000" },
      { name: "--color-white", value: "#ffffff" },
      { name: "--color-ink-900", value: "#000000" },
      { name: "--color-ink-800", value: "#1c1c1e" },
      { name: "--color-ink-100", value: "#dddddd" },
      { name: "--color-surface", value: "#ffffff" },
      { name: "--color-surface-soft", value: "#f3f3f3" },
      { name: "--color-accent", value: "#5affba" },
      {
        name: "--color-focus",
        value: "#00a864",
        note: "contrast-checked against white in designTokens.test.ts (§16.2)",
      },
      { name: "--color-text", value: "#000000" },
    ],
  },
  {
    key: "typography",
    title: "Typography — self-hosted Oswald and Roboto per the §16.3 audit and D-010 (P3-003)",
    tokens: [
      {
        name: "--font-body",
        value:
          'Roboto, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
        note: "self-hosted latin subset in /fonts/, D-010 decided 2026-07-29",
      },
      {
        name: "--font-display",
        value: "Oswald, var(--font-body)",
        note: "the audited condensed display face, self-hosted per D-010",
      },
      { name: "--font-weight-regular", value: "400" },
      { name: "--font-weight-bold", value: "700" },
      { name: "--line-height-display", value: "1.05" },
      { name: "--line-height-heading", value: "1.2" },
      { name: "--line-height-body", value: "1.5" },
      { name: "--letter-spacing-eyebrow", value: "0.12em" },
      { name: "--letter-spacing-label", value: "0.08em", note: "uppercase micro-labels (progress, stage, kicker)" },
      { name: "--letter-spacing-action", value: "0.04em", note: "bold CTAs and emphatic statements" },
      // Type scale (§16.4). Fluid headings clamp between a mobile floor and a
      // desktop cap; the body steps are static. Sections consume these instead
      // of carrying their own font-size literals (VD-101).
      { name: "--font-size-xs", value: "0.75rem", note: "fine print, eyebrow labels" },
      { name: "--font-size-sm", value: "0.875rem", note: "small labels, legal copy" },
      { name: "--font-size-lg", value: "1.125rem", note: "lead paragraphs" },
      { name: "--font-size-xl", value: "1.25rem", note: "prompts, metric multiples" },
      { name: "--font-size-h3", value: "clamp(1.5rem, 3.5vw, 2.25rem)", note: "prominent outcome numbers" },
      { name: "--font-size-h2", value: "clamp(1.75rem, 4vw, 2.75rem)", note: "section headings" },
      { name: "--font-size-h1", value: "clamp(2rem, 5vw, 3.5rem)", note: "hero headline" },
      { name: "--font-size-display", value: "clamp(2.5rem, 6vw, 4rem)", note: "oversized proof figures" },
    ],
  },
  {
    key: "spacing",
    title: "Spacing — generous vertical rhythm (§16.4)",
    tokens: [
      { name: "--space-1", value: "0.25rem" },
      { name: "--space-2", value: "0.5rem" },
      { name: "--space-3", value: "0.75rem" },
      { name: "--space-4", value: "1rem" },
      { name: "--space-5", value: "1.25rem" },
      { name: "--space-6", value: "1.5rem" },
      { name: "--space-8", value: "2rem" },
      { name: "--space-10", value: "2.5rem" },
      { name: "--space-12", value: "3rem" },
      { name: "--space-16", value: "4rem" },
      { name: "--space-20", value: "5rem" },
    ],
  },
  {
    key: "layout",
    title: "Layout — shared container and measure widths (§16.4)",
    tokens: [
      { name: "--width-container", value: "72rem" },
      { name: "--width-text", value: "48ch" },
    ],
  },
  {
    key: "radius",
    title: "Radii — rounded case-study visuals (§16.4)",
    tokens: [
      { name: "--radius-sm", value: "0.375rem" },
      { name: "--radius-md", value: "0.75rem" },
      { name: "--radius-lg", value: "1.5rem" },
    ],
  },
  {
    key: "motion",
    title: "Motion — one shared easing and duration scale (P3-005)",
    tokens: [
      { name: "--ease-standard", value: "cubic-bezier(0.2, 0, 0, 1)" },
      { name: "--duration-fast", value: "120ms" },
      { name: "--duration-base", value: "240ms" },
      { name: "--duration-slow", value: "480ms" },
    ],
  },
];

/** Header written at the top of the generated stylesheet to discourage hand-edits. */
const GENERATED_HEADER =
  "/* Generated from src/config/designTokens.ts — do not edit by hand. */\n" +
  "/* Design system: CSS reset (P3-001), tokens (P3-002), motion (P3-005). */\n";

/** True for a well-formed `#rgb` or `#rrggbb` hex colour. */
function isHexColor(value: string): boolean {
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

/** Every token across all groups, in declaration order. */
export function allTokens(
  groups: readonly TokenGroup[] = TOKEN_GROUPS,
): readonly DesignToken[] {
  return groups.flatMap((group) => group.tokens);
}

/** Look up a token value by name, or `undefined` if absent. */
export function tokenValue(
  name: string,
  groups: readonly TokenGroup[] = TOKEN_GROUPS,
): string | undefined {
  return allTokens(groups).find((token) => token.name === name)?.value;
}

/**
 * Relative luminance of a `#rgb`/`#rrggbb` colour per WCAG 2.x. Throws on a
 * malformed colour so callers can rely on the result.
 */
export function relativeLuminance(hex: string): number {
  if (!isHexColor(hex)) {
    throw new Error(`Cannot compute luminance of malformed colour "${hex}".`);
  }
  let body = hex.slice(1);
  if (body.length === 3) {
    body = body
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  const channels = [0, 2, 4].map((i) => {
    const srgb = parseInt(body.slice(i, i + 2), 16) / 255;
    return srgb <= 0.03928
      ? srgb / 12.92
      : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  const [r, g, b] = channels;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio (1–21) between two `#rgb`/`#rrggbb` colours. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Minimum contrast the focus indicator must clear against white. WCAG 2.2 SC
 * 1.4.11 requires 3:1 for non-text UI components such as a focus ring; §16.2
 * flags the sample focus colour as needing exactly this check.
 */
export const MIN_FOCUS_CONTRAST = 3;

/** Minimum contrast body text must clear against the page surface (WCAG AA). */
export const MIN_TEXT_CONTRAST = 4.5;

/**
 * Validate the token model. Returns the list of problems; an empty list means
 * every group is well-formed, the required brand colours are intact, and the
 * focus and text colours meet their contrast floors.
 */
export function validateDesignTokens(
  groups: readonly TokenGroup[] = TOKEN_GROUPS,
): string[] {
  const errors: string[] = [];
  const namePattern = /^--[a-z][a-z0-9-]*$/;

  const seen = new Set<string>();
  for (const group of groups) {
    for (const token of group.tokens) {
      if (!namePattern.test(token.name)) {
        errors.push(
          `Token name "${token.name}" (group "${group.key}") must match --lower-kebab-case.`,
        );
      }
      if (token.value.trim() === "") {
        errors.push(`Token "${token.name}" must have a non-empty value.`);
      }
      if (/[{};]/.test(token.value)) {
        errors.push(`Token "${token.name}" value must not contain "{", "}" or ";".`);
      }
      if (seen.has(token.name)) {
        errors.push(`Duplicate token "${token.name}"; each may be defined once.`);
      }
      seen.add(token.name);
    }
  }

  // Colour-group values must be well-formed hex (references like var(...) live
  // in other groups, e.g. --font-display).
  const colorGroup = groups.find((group) => group.key === "color");
  for (const token of colorGroup?.tokens ?? []) {
    if (!isHexColor(token.value)) {
      errors.push(`Colour token "${token.name}" value "${token.value}" is not a valid hex colour.`);
    }
  }

  // Required brand colours must be present and unchanged (§16.1).
  for (const [name, value] of Object.entries(REQUIRED_BRAND_COLORS)) {
    const actual = tokenValue(name, groups);
    if (actual === undefined) {
      errors.push(`Required brand colour "${name}" is missing.`);
    } else if (actual.toLowerCase() !== value.toLowerCase()) {
      errors.push(`Brand colour "${name}" must be "${value}", found "${actual}".`);
    }
  }

  // Motion durations must be positive time values (P3-005).
  const motionGroup = groups.find((group) => group.key === "motion");
  for (const token of motionGroup?.tokens ?? []) {
    if (!token.name.startsWith("--duration-")) continue;
    const match = /^(\d*\.?\d+)(ms|s)$/.exec(token.value);
    if (!match || Number(match[1]) <= 0) {
      errors.push(`Duration token "${token.name}" must be a positive time value, found "${token.value}".`);
    }
  }

  // Contrast checks §16.2 demands, guarded so a missing colour reports once above.
  const white = tokenValue("--color-white", groups);
  const focus = tokenValue("--color-focus", groups);
  if (white && focus && isHexColor(white) && isHexColor(focus)) {
    const ratio = contrastRatio(focus, white);
    if (ratio < MIN_FOCUS_CONTRAST) {
      errors.push(
        `Focus colour "${focus}" has ${ratio.toFixed(2)}:1 contrast on white; needs at least ${MIN_FOCUS_CONTRAST}:1 (§16.2, WCAG 1.4.11).`,
      );
    }
  }
  const surface = tokenValue("--color-surface", groups);
  const text = tokenValue("--color-text", groups);
  if (surface && text && isHexColor(surface) && isHexColor(text)) {
    const ratio = contrastRatio(text, surface);
    if (ratio < MIN_TEXT_CONTRAST) {
      errors.push(
        `Text colour "${text}" has ${ratio.toFixed(2)}:1 contrast on the surface; needs at least ${MIN_TEXT_CONTRAST}:1 (WCAG 1.4.3).`,
      );
    }
  }

  return errors;
}

/**
 * Assert the token model is valid, throwing on failure. Intended for build-time
 * use so a malformed token or a failed contrast check fails the build rather
 * than shipping a broken stylesheet.
 */
export function assertDesignTokensValid(
  groups: readonly TokenGroup[] = TOKEN_GROUPS,
): void {
  const errors = validateDesignTokens(groups);
  if (errors.length > 0) {
    throw new Error(`Invalid design tokens:\n- ${errors.join("\n- ")}`);
  }
}

/** Render the `:root { ... }` custom-property block from the token groups. */
function renderRoot(groups: readonly TokenGroup[]): string {
  const body = groups
    .map((group) => {
      const decls = group.tokens.map((token) => {
        const note = token.note ? ` /* ${token.note} */` : "";
        return `  ${token.name}: ${token.value};${note}`;
      });
      return `  /* ${group.title} */\n${decls.join("\n")}`;
    })
    .join("\n\n");
  return `:root {\n${body}\n}`;
}

/**
 * A modern, minimal reset that preserves native control behaviour (P3-001),
 * the token block, and the global semantics the layout relies on: base
 * typography, an accessible `:focus-visible` ring using the contrast-checked
 * focus colour, the visually-hidden-until-focused skip link
 * `BaseLayout.astro` renders, and a reduced-motion override (P3-005).
 */
const RESET_AND_GLOBALS = `/* Self-hosted brand fonts (P3-003, D-010): latin woff2 subsets, swap so text
   is never invisible while they load. Oswald carries the display headings; the
   Roboto file is a variable font covering the 400–700 range the body uses. */
@font-face {
  font-family: Oswald;
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("/fonts/oswald-700-latin.woff2") format("woff2");
}

@font-face {
  font-family: Roboto;
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url("/fonts/roboto-variable-latin.woff2") format("woff2");
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

* {
  margin: 0;
}

html {
  -webkit-text-size-adjust: 100%;
  scroll-behavior: smooth;
}

body {
  min-height: 100vh;
  font-family: var(--font-body);
  font-weight: var(--font-weight-regular);
  line-height: var(--line-height-body);
  color: var(--color-text);
  background-color: var(--color-surface);
  -webkit-font-smoothing: antialiased;
}

h1,
h2,
h3,
h4 {
  font-family: var(--font-display);
  line-height: var(--line-height-heading);
  text-wrap: balance;
}

p {
  text-wrap: pretty;
}

img,
picture,
svg,
video {
  display: block;
  max-width: 100%;
}

/* Preserve native control behaviour (P3-001): inherit type, keep the platform UI. */
input,
button,
textarea,
select {
  font: inherit;
  color: inherit;
}

a {
  color: inherit;
}

:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

/* Skip link: off-screen until focused, then pinned to the top-left (P7-005). */
.skip-link {
  position: absolute;
  left: var(--space-2);
  top: calc(-1 * var(--space-16));
  z-index: 100;
  padding: var(--space-2) var(--space-4);
  background-color: var(--color-ink-900);
  color: var(--color-white);
  border-radius: var(--radius-sm);
  text-decoration: none;
  transition: top var(--duration-fast) var(--ease-standard);
}

.skip-link:focus {
  top: var(--space-2);
}

/* Section shell — the shared horizontal frame every homepage section rides
   (VD-104): its content is capped at the container width, centred, and guttered
   by the same inline padding. Only the vertical rhythm (padding-block) varies by
   section, so each section sets that alone and can never fork the width, the
   centring, or the gutter the way nine hand-copied max-width/margin/padding
   blocks did. */
.section-shell {
  max-width: var(--width-container);
  margin-inline: auto;
  padding-inline: var(--space-6);
}

/* Primary call-to-action button — the site's one conversion action, given the
   §16.1 mint accent (VD-102) as a shared primitive so every CTA is identical
   (VD-104). Mint is a surface colour, not a text colour: mint-on-white fails
   contrast, but ink-on-mint clears WCAG AA (§16.2), and the hover state inverts
   to a mint label on ink, which clears AA too. Both ratios are asserted in
   ctaButton.test.ts against the same tokens.

   The pointer cursor is declared rather than inherited: the CTA renders as an
   <a> with no href until PUBLIC_CALENDLY_URL is configured (§13, D-0006), and a
   browser gives an anchor the hand cursor only when it has one — so without this
   the button reads as inert text on hover in any build without the booking
   URL.

   The mint border is invisible at rest — it is the same colour as the fill — and
   exists for the hover state: inverting to an ink fill would otherwise erase the
   button's shape on the black hero, where ink-on-ink leaves nothing but floating
   mint text. Holding the border at the accent colour through hover keeps one
   button shape on every surface, white or black. */
.cta-button {
  display: inline-block;
  cursor: pointer;
  padding: var(--space-4) var(--space-6);
  background-color: var(--color-accent);
  color: var(--color-helix-ink);
  font-weight: var(--font-weight-bold);
  border: 2px solid var(--color-accent);
  border-radius: var(--radius-md);
  text-decoration: none;
  transition:
    background-color var(--duration-fast) var(--ease-standard),
    color var(--duration-fast) var(--ease-standard);
}

.cta-button:hover,
.cta-button:focus-visible {
  background-color: var(--color-helix-ink);
  color: var(--color-accent);
  border-color: var(--color-accent);
}

/* Section eyebrow / kicker — the short tracked label above a section headline,
   given the §16.1 mint accent (VD-102) as a shared primitive so every section's
   eyebrow is identical (VD-104). Mint is a surface/graphic colour, not a text
   colour (mint-on-white fails contrast, §16.2), so the accent is a short mint
   rule set before the label rather than colouring the label text itself. */
.eyebrow {
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--letter-spacing-eyebrow);
  margin: 0 0 var(--space-4);
}

.eyebrow::before {
  content: "";
  display: inline-block;
  inline-size: var(--space-6);
  block-size: 0.15em;
  margin-inline-end: var(--space-3);
  vertical-align: middle;
  background-color: var(--color-accent);
}

/* Proof-metric figure — an oversized value with a short tracked label beneath
   it (VD-104), the shape the proof banner uses to state one quantified claim.
   Extracted as a shared primitive so every section that leads with a headline
   number renders the figure identically instead of re-declaring the display
   size, weight, and label tracking. The value rides the display type scale; the
   label is the same bold tracked micro-label the eyebrow carries. */
.metric {
  text-align: center;
}

.metric__value {
  font-size: var(--font-size-display);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-display);
  margin: 0 0 var(--space-2);
}

.metric__label {
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--letter-spacing-eyebrow);
  margin: 0;
}

/* Responsive media frame — the shared frame a case-study photograph, and any
   future editorial visual, rides (VD-104): the image scales to the full width of
   its column, keeps its intrinsic aspect ratio (height follows width so it never
   distorts), and carries the §16.4 rounded corner the neutral case-study visuals
   call for — the one consumer of the largest radius token. Extracted so every
   section that places a picture renders the frame identically instead of
   re-declaring the width, the height rule, and the rounding by hand and
   drifting; only the surrounding spacing varies by placement, so each call site
   sets that alone. */
.media-frame {
  display: block;
  width: 100%;
  height: auto;
  border-radius: var(--radius-lg);
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}`;

/**
 * Render the exact text of `src/styles/global.css`. Throws if the tokens are
 * invalid so the rendered stylesheet is always well-formed. Ends with a trailing
 * newline, as POSIX text files should.
 */
export function renderGlobalStylesheet(
  groups: readonly TokenGroup[] = TOKEN_GROUPS,
): string {
  assertDesignTokensValid(groups);
  return `${GENERATED_HEADER}\n${renderRoot(groups)}\n\n${RESET_AND_GLOBALS}\n`;
}
