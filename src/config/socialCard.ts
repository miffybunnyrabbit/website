/**
 * Validated Open Graph / Twitter social-preview card (implementation plan
 * P7-003, §7.3; the §17.11 R-010 `social-preview-image` topic).
 *
 * When the site is shared on social platforms or in chat, the unfurled preview
 * is the first impression. §7.3 requires an image carrying the Helix mark, the
 * enterprise-value proposition, and the mint/ink/white palette — with *no
 * people* and *no unapproved numerical claim*.
 *
 * Earlier the layout shipped no `og:image` at all: referencing a not-yet-created
 * raster would have been a broken tag. Under the plan's revised approach
 * (§5 last row, §17, §23) pending content is not withheld — it publishes in its
 * best-available draft form and is tracked in the approval queue until sign-off.
 * This module applies that rule to the social card: it renders a safe,
 * brand-only draft card *now* — built entirely from already-published copy (the
 * approved hero eyebrow and enterprise-value headline) and the brand tokens —
 * and the standing launch review (Q-0009, category D) is where the final
 * designed artwork is signed off. The card contains no people (it embeds no
 * raster image) and no figure (its visible text is asserted digit-free), so it
 * cannot leak an unapproved claim while it awaits that review.
 *
 * The card is a static SVG. `renderSocialCardSvg()` is the single source of
 * truth; `public/social/og-card.svg` is its committed output and
 * `socialCard.test.ts` asserts the file still matches, so the shipped artwork
 * can never drift from the model (the same discipline `sitemap.ts` and
 * `approvalQueue.ts` use). This module is pure content plus validation: no UI,
 * no runtime I/O.
 */

import { HERO_EYEBROW, HERO_HEADLINE } from "./hero";
import { REQUIRED_BRAND_COLORS } from "./designTokens";
import { scanForbiddenCopy } from "./forbiddenCopy";

/** Root-relative path of the committed social card, referenced as `og:image`. */
export const OG_IMAGE_PATH = "/social/og-card.svg";

/** Canonical Open Graph card dimensions (§7.3; the 1.91:1 unfurl ratio). */
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

/** MIME type of the card, for the `og:image:type` tag. */
export const OG_IMAGE_TYPE = "image/svg+xml";

/**
 * Accessible description of the card for `og:image:alt`. Derived from the
 * approved proposition, kept free of shouty case, figures, and people so it
 * passes the same guards as the visible card text.
 */
export const OG_IMAGE_ALT =
  "Helix Collective — we work with businesses to create meaningful growth in enterprise value.";

/** Brand palette, sourced from the design tokens so the card cannot drift. */
const INK = REQUIRED_BRAND_COLORS["--color-helix-ink"];
const MINT = REQUIRED_BRAND_COLORS["--color-helix-mint"];
const WHITE = REQUIRED_BRAND_COLORS["--color-white"];

/** The card's display typeface — the safe system stack the design system uses. */
const FONT_STACK = "'Helvetica Neue', Arial, sans-serif";

/** Left/right and vertical inset, in user units. */
const PADDING = 90;

/** Headline layout: font size and baseline-to-baseline step. */
const HEADLINE_SIZE = 66;
const HEADLINE_LINE_HEIGHT = 84;

/** Greedy-wrap `text` into lines no longer than `maxChars` characters. */
export function wrapHeadline(text: string, maxChars = 22): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= maxChars) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Escape the five XML special characters so copy is safe inside markup. */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Render the exact SVG text of the social card. Deterministic: the committed
 * `public/social/og-card.svg` is this string, and the test asserts they match.
 * Ends with a trailing newline.
 */
export function renderSocialCardSvg(): string {
  const headlineLines = wrapHeadline(HERO_HEADLINE);
  const firstBaseline = 280;

  const tspans = headlineLines
    .map(
      (line, i) =>
        `<tspan x="${PADDING}" dy="${i === 0 ? 0 : HEADLINE_LINE_HEIGHT}">${escapeXml(
          line,
        )}</tspan>`,
    )
    .join("");

  const lines = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_IMAGE_WIDTH}" height="${OG_IMAGE_HEIGHT}" viewBox="0 0 ${OG_IMAGE_WIDTH} ${OG_IMAGE_HEIGHT}" role="img" aria-label="${escapeXml(
      OG_IMAGE_ALT,
    )}">`,
    `  <rect width="${OG_IMAGE_WIDTH}" height="${OG_IMAGE_HEIGHT}" fill="${INK}"/>`,
    `  <rect x="${PADDING}" y="176" width="120" height="6" fill="${MINT}"/>`,
    `  <text x="${PADDING}" y="150" font-family="${FONT_STACK}" font-size="32" font-weight="600" letter-spacing="6" fill="${MINT}">${escapeXml(
      HERO_EYEBROW,
    )}</text>`,
    `  <text x="${PADDING}" y="${firstBaseline}" font-family="${FONT_STACK}" font-size="${HEADLINE_SIZE}" font-weight="800" letter-spacing="-1" fill="${WHITE}">${tspans}</text>`,
    `</svg>`,
  ];

  return lines.join("\n") + "\n";
}

/**
 * Validate the social card against the §7.3 rules and cross-check it against the
 * approved copy and brand tokens it is built from. Returns the list of problems;
 * an empty list means the card is well-formed and safe to ship. The production
 * build treats any non-empty result as fatal.
 */
export function validateSocialCard(): string[] {
  const errors: string[] = [];

  // Dimensions must be the canonical unfurl size.
  if (OG_IMAGE_WIDTH !== 1200 || OG_IMAGE_HEIGHT !== 630) {
    errors.push(
      `Social card must be 1200×630 (§7.3), not ${OG_IMAGE_WIDTH}×${OG_IMAGE_HEIGHT}.`,
    );
  }

  // The path must live under /social/ and be an SVG.
  if (!/^\/social\/[a-z0-9-]+\.svg$/.test(OG_IMAGE_PATH)) {
    errors.push(`Social card path "${OG_IMAGE_PATH}" must be a /social/*.svg file.`);
  }

  // The palette must be exactly the brand tokens (§7.3 mint/ink/white).
  if (INK !== "#231f20" || MINT !== "#5affba" || WHITE !== "#ffffff") {
    errors.push(
      "Social card palette has drifted from the brand tokens (§16.1 mint/ink/white).",
    );
  }

  // Visible text must be the approved hero copy, so the card cannot say anything
  // the hero has not already published. The headline is wrapped across lines, so
  // check each wrapped line appears and that the wrap preserved every word.
  const svg = renderSocialCardSvg();
  const visibleText = `${HERO_EYEBROW} ${HERO_HEADLINE} ${OG_IMAGE_ALT}`;
  const headlineLines = wrapHeadline(HERO_HEADLINE);
  if (headlineLines.join(" ") !== HERO_HEADLINE) {
    errors.push("Social card headline wrap dropped or altered a word.");
  }
  if (!svg.includes(escapeXml(HERO_EYEBROW))) {
    errors.push(`Social card is missing the approved eyebrow "${HERO_EYEBROW}".`);
  }
  for (const line of headlineLines) {
    if (!svg.includes(escapeXml(line))) {
      errors.push(`Social card is missing the approved headline line "${line}".`);
    }
  }

  // No figure (§7.3 "no unapproved numerical claim"): the card and its alt text
  // must carry no digits at all, so a stray number can never read as a claim.
  if (/\d/.test(visibleText)) {
    errors.push(
      "Social card text contains a digit; §7.3 forbids any numerical claim on the card.",
    );
  }

  // No people (§7.3): the card is generated brand artwork and must embed no
  // raster/photo, guaranteeing structurally that no person can appear.
  if (/<image\b/i.test(svg) || /xlink:href/i.test(svg) || /href=/i.test(svg)) {
    errors.push("Social card must not embed an external or raster image (§7.3 no people).");
  }

  // The visible copy and alt text must pass the site-wide forbidden-copy guard.
  for (const violation of scanForbiddenCopy(visibleText)) {
    errors.push(
      `Social card copy contains forbidden text "${violation.match}" (${violation.id}): ${violation.reason}`,
    );
  }

  if (!OG_IMAGE_ALT.trim()) {
    errors.push("Social card is missing its og:image:alt description.");
  }

  return errors;
}

/**
 * Assert the social card is valid, throwing an aggregated message on failure.
 * Intended for the layout/build step so a malformed or off-spec card fails the
 * build instead of shipping.
 */
export function assertSocialCardValid(): void {
  const errors = validateSocialCard();
  if (errors.length > 0) {
    throw new Error(`Invalid social card:\n- ${errors.join("\n- ")}`);
  }
}
