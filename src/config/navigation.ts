/**
 * Header navigation content model (implementation plan §8.1 Header, §7 Homepage
 * section order, and §13 single site-wide CTA).
 *
 * The header is deliberately restrained. The plan (§8.1) allows exactly:
 *  - the Helix Collective brand/home link;
 *  - one optional anchor nav pointing at on-page sections — Work, How we work,
 *    and Fit;
 *  - one primary CTA using the single globally approved label (§13).
 *
 * It just as deliberately forbids:
 *  - a team / people link (the people-led positioning is abandoned, §5, §4);
 *  - an "invest in our ventures" action (the split investor CTA is removed,
 *    §5 Single conversion goal, §8.1, P4-005).
 *
 * This module is the single, testable source of that structure. Each anchor
 * target is a fragment identifier that must match a real homepage section id
 * (§7), so the nav cannot drift from the sections it links to. The header CTA is
 * required to be the one approved primary CTA rather than a bespoke label, so the
 * "inconsistent primary CTA labels" failure (§13) cannot start in the header.
 *
 * Pure configuration plus validation: no UI, no I/O. `Header.astro` reads
 * `headerNav` to render; the production build should call `assertNavValid()` so a
 * malformed or off-spec nav fails the build instead of shipping.
 */

import { PRIMARY_CTA_LABEL } from "./cta";
import { scanForbiddenCopy } from "./forbiddenCopy";

/**
 * Canonical on-page section ids the header may link to (§7 homepage section
 * order). Anchor nav targets are validated against this set so a link can never
 * point at a section that does not exist. Kept in section order.
 */
export const HOMEPAGE_SECTION_IDS = [
  "top",
  "work",
  "how-we-work",
  "fit",
  "contact",
] as const;

export type HomepageSectionId = (typeof HOMEPAGE_SECTION_IDS)[number];

/** One anchor link in the header's optional in-page nav. */
export interface NavItem {
  /** Visible link text, e.g. "How we work". */
  label: string;
  /** On-page section id this link targets (without the leading `#`). */
  target: HomepageSectionId;
}

/** The header's brand/home link. */
export interface BrandLink {
  /** Accessible name for the logo link. */
  label: string;
  /** Destination — the site root. */
  href: string;
}

/** The complete header content model. */
export interface HeaderNav {
  brand: BrandLink;
  /** Optional in-page anchor nav (§8.1). May be empty; never more than the three approved anchors. */
  items: readonly NavItem[];
  /** The single primary CTA label shown in the header (§13). */
  ctaLabel: string;
}

/**
 * The one approved header. Three anchors — Work, How we work, Fit — in the plan's
 * reading order, plus the single approved CTA label. The brand link returns to
 * the top of the marketing page.
 */
export const headerNav: HeaderNav = {
  brand: { label: "Helix Collective", href: "/" },
  items: [
    { label: "Work", target: "work" },
    { label: "How we work", target: "how-we-work" },
    { label: "Fit", target: "fit" },
  ],
  ctaLabel: PRIMARY_CTA_LABEL,
};

/**
 * Substrings that must never appear as a header link label. These encode the
 * §8.1 prohibitions positively (a keyword scan of labels) so a reintroduced team
 * or investor link is caught by the build rather than by review. Matched
 * case-insensitively.
 */
export const FORBIDDEN_NAV_LABEL_TERMS: readonly string[] = [
  "team",
  "people",
  "humans",
  "invest",
  "ventures",
  "careers",
  "jobs",
];

/** A minimal header links to at most one anchor per homepage section (§8.1). */
const MAX_ANCHOR_ITEMS = HOMEPAGE_SECTION_IDS.length;

/**
 * Validate a header nav against the §8.1 rules. Returns the list of problems; an
 * empty list means the header is well-formed. The production build should treat
 * any non-empty result as fatal.
 */
export function validateNav(nav: HeaderNav = headerNav): string[] {
  const errors: string[] = [];

  // --- Brand link ---
  if (!nav.brand.label.trim()) {
    errors.push("Header brand link is missing a label.");
  }
  if (!nav.brand.href.trim()) {
    errors.push("Header brand link is missing an href.");
  }

  // --- CTA (§13 single approved label) ---
  if (!nav.ctaLabel.trim()) {
    errors.push("Header CTA label is missing.");
  } else if (nav.ctaLabel !== PRIMARY_CTA_LABEL) {
    errors.push(
      `Header CTA label "${nav.ctaLabel}" does not match the single approved label "${PRIMARY_CTA_LABEL}".`,
    );
  }

  // A defensive upper bound: the header must stay minimal (§8.1). It can never
  // legitimately have more anchors than there are homepage sections.
  if (nav.items.length > MAX_ANCHOR_ITEMS) {
    errors.push(
      `Header has ${nav.items.length} anchor links; a minimal header links to at most ${MAX_ANCHOR_ITEMS} sections.`,
    );
  }

  const validTargets = new Set<string>(HOMEPAGE_SECTION_IDS);
  const seenTargets = new Set<string>();

  for (const item of nav.items) {
    // Every anchor must have a label and point at a real homepage section.
    if (!item.label.trim()) {
      errors.push(`Header anchor targeting "#${item.target}" has an empty label.`);
    }
    if (!validTargets.has(item.target)) {
      errors.push(
        `Header anchor "${item.label}" targets unknown section "#${item.target}".`,
      );
    }
    // Two links to the same section is a copy/paste mistake, not a valid nav.
    if (seenTargets.has(item.target)) {
      errors.push(`Header has duplicate anchor target "#${item.target}".`);
    }
    seenTargets.add(item.target);

    // §8.1 prohibitions: no team/people or investor links.
    const lower = item.label.toLowerCase();
    for (const term of FORBIDDEN_NAV_LABEL_TERMS) {
      if (lower.includes(term)) {
        errors.push(
          `Header anchor label "${item.label}" contains the forbidden term "${term}" (§8.1: no team/people or invest-in-ventures links).`,
        );
      }
    }

    // Labels are visitor-facing copy and must pass the site-wide copy guard.
    for (const v of scanForbiddenCopy(item.label)) {
      errors.push(
        `Header anchor label "${item.label}" contains forbidden copy "${v.match}" [${v.id}] — ${v.reason}`,
      );
    }
  }

  return errors;
}

/**
 * Assert the header nav is valid, throwing an aggregated message on failure.
 * Intended for the build step so a malformed header fails the production build.
 */
export function assertNavValid(nav: HeaderNav = headerNav): void {
  const errors = validateNav(nav);
  if (errors.length > 0) {
    throw new Error(`Invalid header navigation:\n- ${errors.join("\n- ")}`);
  }
}

/** The `#`-prefixed href for a nav item, for rendering. */
export function anchorHref(item: NavItem): string {
  return `#${item.target}`;
}
