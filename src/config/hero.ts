/**
 * Typed content model for the homepage hero (implementation plan §8.2 Hero, with
 * §13 single site-wide CTA and D-009 performance-linked economics).
 *
 * The hero carries the site's single most important statement, so the plan fixes
 * its parts tightly:
 *  - the eyebrow is exactly `HELIX COLLECTIVE`;
 *  - the primary headline is the enterprise-value statement and must NOT be
 *    softened into generic language such as "unlocking digital potential" (§8.2);
 *  - the primary CTA uses the one globally approved label (§13), never a bespoke
 *    hero-only variant.
 *
 * The supporting copy has two approved drafts. The default — "We partner deeply
 * across product, technology and commercial execution…" — describes aligned
 * economics without naming a mechanism and is always safe to publish. The
 * stronger alternative — "…get paid when you get paid" — makes a literal
 * performance-linked claim that D-009 must confirm before it can ship (D-009
 * asks "whether 'we get paid when you get paid' is literally accurate or only a
 * shorthand for aligned upside"). Mirroring the honest default the proof banner
 * uses for its currency gate, the hero refuses to validate if the
 * performance-linked variant is selected while D-009 is still `pending`, so an
 * unconfirmed literal claim can never leak into a production build.
 *
 * This module is pure content plus validation: it renders as static semantic
 * markup and needs no client-side state. The production build should call
 * `assertHeroValid()` so an off-spec or softened hero fails the build instead of
 * shipping.
 */

import { PRIMARY_CTA_LABEL } from "./cta";
import { scanForbiddenCopy } from "./forbiddenCopy";

/** The one approved eyebrow (§8.2). */
export const HERO_EYEBROW = "HELIX COLLECTIVE";

/** The one approved primary headline (§8.2), in the plan's shouty display case. */
export const HERO_HEADLINE =
  "WE WORK WITH BUSINESSES TO CREATE MEANINGFUL GROWTH IN ENTERPRISE VALUE.";

/**
 * Which supporting-copy draft the hero ships (§8.2).
 *  - `aligned` — the default "partner deeply … structure our success around
 *    yours" copy; describes aligned economics without a literal payment claim.
 *  - `performance-linked` — the stronger "get paid when you get paid" copy; a
 *    literal claim gated on D-009.
 */
export type HeroSupportingVariant = "aligned" | "performance-linked";

/** Whether the D-009 performance-linked-economics decision has been recorded. */
export type PerformanceLinkedApproval = "pending" | "approved";

/** The two approved supporting-copy drafts, keyed by variant (§8.2). */
export const HERO_SUPPORTING_COPY: Readonly<Record<HeroSupportingVariant, string>> = {
  aligned:
    "We partner deeply across product, technology and commercial execution—then structure our success around yours.",
  "performance-linked":
    "We go deep, build what moves the business, and get paid when you get paid.",
};

export interface HeroCopy {
  eyebrow: string;
  headline: string;
  /** Which supporting-copy draft is selected (§8.2). */
  supportingVariant: HeroSupportingVariant;
  /** Optional closing line, e.g. "Selective partnerships. Aligned economics…". */
  supportingLine?: string;
  /** The single approved primary CTA label (§13). */
  ctaLabel: string;
  /** Whether the D-009 performance-linked claim is confirmed. */
  performanceLinkedApproval: PerformanceLinkedApproval;
}

/**
 * The one approved hero. Ships the safe `aligned` supporting copy; the literal
 * "get paid when you get paid" variant stays unselected until D-009 is approved,
 * so the unconfirmed claim never reaches `dist` — the same honest default the
 * proof banner uses for its currency gate.
 */
export const hero: HeroCopy = {
  eyebrow: HERO_EYEBROW,
  headline: HERO_HEADLINE,
  supportingVariant: "aligned",
  supportingLine: "Selective partnerships. Aligned economics. A credible path to victory.",
  ctaLabel: PRIMARY_CTA_LABEL,
  performanceLinkedApproval: "pending",
};

/**
 * Softener phrases the headline must never contain. The plan calls out
 * "unlocking digital potential" by name (§8.2); the neighbouring variants are
 * included so a paraphrase into the same empty register is also caught. Matched
 * case-insensitively, whitespace-tolerant so a line wrap still matches.
 */
export const BANNED_HEADLINE_SOFTENERS: readonly RegExp[] = [
  /\bunlock(?:ing|s)?\s+(?:your\s+|the\s+)?digital\s+potential\b/i,
  /\bunlock(?:ing|s)?\s+(?:your\s+|the\s+)?potential\b/i,
  /\bdigital\s+potential\b/i,
];

/**
 * The selected supporting copy for a hero, resolved from its variant. Exposed so
 * the renderer reads the copy from one place rather than re-deriving it.
 */
export function heroSupportingCopy(config: HeroCopy = hero): string {
  return HERO_SUPPORTING_COPY[config.supportingVariant];
}

/**
 * Draft markers that must never reach a production build. Kept lowercase;
 * matching is case-insensitive.
 */
const DRAFT_MARKERS: readonly string[] = [
  "draft",
  "not for publication",
  "todo",
  "tbd",
  "placeholder",
  "lorem ipsum",
];

/**
 * Validate a hero against the §8.2 / §13 / D-009 rules. Returns the list of
 * problems; an empty list means the hero is well-formed. The production build
 * should treat any non-empty result as fatal.
 */
export function validateHero(config: HeroCopy = hero): string[] {
  const errors: string[] = [];

  // --- Eyebrow: exactly the approved wordmark (§8.2). ---
  if (!config.eyebrow.trim()) {
    errors.push("Hero is missing its eyebrow.");
  } else if (config.eyebrow !== HERO_EYEBROW) {
    errors.push(
      `Hero eyebrow "${config.eyebrow}" must be the approved "${HERO_EYEBROW}" (§8.2).`,
    );
  }

  // --- Headline: present, on-message, and not softened (§8.2). ---
  if (!config.headline.trim()) {
    errors.push("Hero is missing its primary headline.");
  } else {
    // The headline must keep the enterprise-value promise, not drift to a
    // generic statement about "potential" or "solutions".
    if (!/enterprise\s+value/i.test(config.headline)) {
      errors.push(
        'Hero headline must state the "enterprise value" promise (§8.2).',
      );
    }
    for (const softener of BANNED_HEADLINE_SOFTENERS) {
      if (softener.test(config.headline)) {
        errors.push(
          `Hero headline must not be softened into generic language (§8.2): matched "${softener.source}".`,
        );
      }
    }
  }

  // --- Supporting variant and the D-009 gate. ---
  if (!(config.supportingVariant in HERO_SUPPORTING_COPY)) {
    errors.push(
      `Hero supporting variant "${config.supportingVariant}" is not one of the approved drafts.`,
    );
  }
  if (
    config.supportingVariant === "performance-linked" &&
    config.performanceLinkedApproval !== "approved"
  ) {
    errors.push(
      'Hero uses the literal "get paid when you get paid" supporting copy, but the performance-linked economics decision (D-009) is not yet approved.',
    );
  }

  // --- CTA: the one approved label (§13). ---
  if (!config.ctaLabel.trim()) {
    errors.push("Hero CTA label is missing.");
  } else if (config.ctaLabel !== PRIMARY_CTA_LABEL) {
    errors.push(
      `Hero CTA label "${config.ctaLabel}" does not match the single approved label "${PRIMARY_CTA_LABEL}" (§13).`,
    );
  }

  // --- Site-wide copy guard + draft markers over every visible string. ---
  const visibleCopy = [
    config.eyebrow,
    config.headline,
    heroSupportingCopy(config),
    config.supportingLine ?? "",
    config.ctaLabel,
  ].join("\n");

  for (const v of scanForbiddenCopy(visibleCopy)) {
    errors.push(
      `Hero contains forbidden copy "${v.match}" [${v.id}] — ${v.reason}.`,
    );
  }

  const lower = visibleCopy.toLowerCase();
  for (const marker of DRAFT_MARKERS) {
    if (lower.includes(marker)) {
      errors.push(`Hero contains a forbidden draft marker "${marker}".`);
    }
  }

  return errors;
}

/**
 * Assert the hero is valid, throwing an aggregated message on failure. Intended
 * for the build step so a softened, off-label, or unconfirmed-claim hero fails
 * the production build instead of shipping.
 */
export function assertHeroValid(config: HeroCopy = hero): void {
  const errors = validateHero(config);
  if (errors.length > 0) {
    throw new Error(`Invalid hero:\n- ${errors.join("\n- ")}`);
  }
}
