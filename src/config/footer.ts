/**
 * Typed content model for the site footer (§14).
 *
 * The footer establishes institutional legitimacy without people: the brand
 * mark, the legal entity, ABN and registered office, any approved social links,
 * and the copyright line. Every fact here is confirmed and renders — the
 * approval gating that used to withhold an unverified ABN or office was removed
 * on 2026-08-18 once the owner had confirmed all three; the record of that
 * confirmation is frozen under `docs/`.
 *
 * What the validator still enforces is what the §14 copy rules demand of the
 * text itself: no draft markers, no people or team language, no venture-volume
 * claims, and HTTPS on every external link.
 */

import { scanForbiddenCopy } from "./forbiddenCopy";

/** A single institutional identity fact (entity, ABN, registered office, …). */
export interface FooterFact {
  /** Stable id, e.g. "legal-entity", "abn", "registered-office". */
  id: string;
  /** Visible label, e.g. "ABN". */
  label: string;
  /** The published value. */
  value: string;
}

/** An external social or profile link (LinkedIn, an approved privacy page, …). */
export interface FooterLink {
  /** Visible link text, e.g. "LinkedIn". */
  label: string;
  /** Absolute HTTPS URL. */
  href: string;
}

/** The footer's brand/home mark. */
export interface FooterBrand {
  /** Accessible name for the mark, e.g. "Helix Collective". */
  label: string;
  /** Destination — the site root. */
  href: string;
}

/** The complete footer content model. */
export interface FooterContent {
  brand: FooterBrand;
  /** Identity facts: legal entity, ABN, registered office. */
  facts: readonly FooterFact[];
  /** Approved social links (LinkedIn, …). */
  socialLinks: readonly FooterLink[];
  /** Optional privacy-policy link (section 14: "privacy link if required"). */
  privacyLink?: FooterLink;
  /** Optional approved contact email (section 14: "email fallback if approved"). */
  contactEmail?: FooterFact;
  /** Institutional holder shown in the copyright line. */
  copyrightHolder: string;
}

/**
 * Substrings the footer's visitor-facing text must never contain. These encode
 * the section 14 removals positively (a keyword scan) so a reintroduced team
 * link, investor CTA, or careers link is caught by the build rather than by
 * review. Matched case-insensitively.
 */
export const FORBIDDEN_FOOTER_TERMS: readonly string[] = [
  "team",
  "people",
  "humans",
  "invest",
  "ventures",
  "careers",
  "jobs",
  "contact form",
];

/**
 * Old positioning the footer must never carry (section 14: no language that
 * describes Helix primarily as a venture-volume machine). Matched
 * case-insensitively as whole phrases.
 */
export const FORBIDDEN_FOOTER_PHRASES: readonly string[] = [
  "venture volume machine",
  "venture studio",
  "venture factory",
];

/**
 * A human or team count, e.g. "40 people" or "12+ founders" — forbidden in the
 * footer as elsewhere (section 5, section 14). Matches a number (optionally with
 * a trailing `+`) followed by one of these nouns.
 */
const BANNED_COUNT =
  /\b\d+\s*\+?\s+(?:people|team\s+members|staff|employees|founders|humans)\b/i;

/**
 * Draft markers that must never reach a production build inside an *approved*
 * fact. A pending fact is allowed to carry these while it awaits sign-off.
 */
const DRAFT_MARKERS: readonly string[] = [
  "[verify",
  "[research",
  "draft",
  "todo",
  "tbd",
  "placeholder",
  "lorem ipsum",
];

/** True if `text` contains any of the draft markers (case-insensitive). */
function hasDraftMarker(text: string): boolean {
  const lower = text.toLowerCase();
  return DRAFT_MARKERS.some((marker) => lower.includes(marker));
}

/**
 * The footer as it stands today. The owner approved all three identity facts on
 * 2026-08-03 (Q-0010): the legal entity and ABN are the values the live site
 * already publishes (confirmed in the 2026-07-29 audit capture) and the
 * registered office is the Vine Street, Redfern address, and all three render
 * alongside the brand mark and copyright line.
 *
 * No LinkedIn URL is documented anywhere, so `socialLinks` is deliberately empty
 * rather than carrying an invented link.
 */
export const footer: FooterContent = {
  brand: { label: "Helix Collective", href: "/" },
  facts: [
    {
      id: "legal-entity",
      label: "Legal entity",
      value: "Helix Venture Studio Pty Ltd",
    },
    {
      id: "abn",
      label: "ABN",
      value: "20 678 772 631",
    },
    {
      id: "registered-office",
      label: "Registered office",
      value: "Level 1, 2–14 Vine Street, Redfern NSW 2016",
    },
  ],
  socialLinks: [],
  copyrightHolder: "Helix Collective",
};

/**
 * Validate one identity fact. `context` labels the fact in error messages.
 */
function validateFact(fact: FooterFact, context: string): string[] {
  const errors: string[] = [];

  if (!fact.id.trim()) {
    errors.push(`${context} is missing an id.`);
  }
  if (!fact.label.trim()) {
    errors.push(`${context} ("${fact.id}") is missing a label.`);
  }
  if (!fact.value.trim()) {
    errors.push(`${context} ("${fact.id}") is missing a value.`);
  }
  // Facts publish verbatim, so a half-written one must never ship.
  if (hasDraftMarker(fact.value)) {
    errors.push(
      `${context} ("${fact.id}") still contains a draft marker: "${fact.value}".`,
    );
  }

  // Visitor-facing text must pass the site-wide copy guard and the footer's own
  // prohibitions, whether or not the fact is approved yet. The one exemption is
  // the registered legal-entity name (§14 requires the *accurate* legal
  // identity): "Helix Venture Studio Pty Ltd" is a company-register fact, not
  // positioning copy, so the venture-volume-language scan does not apply to it.
  // Every other fact — and the entity's own label — is scanned in full.
  if (fact.id === "legal-entity") {
    errors.push(...scanFooterText(fact.label, `${context} ("${fact.id}")`));
  } else {
    errors.push(...scanFooterText(`${fact.label} ${fact.value}`, `${context} ("${fact.id}")`));
  }

  return errors;
}

/**
 * Validate one external link.
 */
function validateLink(link: FooterLink, context: string): string[] {
  const errors: string[] = [];

  if (!link.label.trim()) {
    errors.push(`${context} is missing a label.`);
  }
  if (!link.href.trim()) {
    errors.push(`${context} ("${link.label}") is missing an href.`);
  } else {
    let url: URL | undefined;
    try {
      url = new URL(link.href);
    } catch {
      errors.push(`${context} ("${link.label}") href "${link.href}" is not a valid absolute URL.`);
    }
    if (url && url.protocol !== "https:") {
      errors.push(
        `${context} ("${link.label}") href "${link.href}" must use HTTPS, not "${url.protocol}".`,
      );
    }
  }

  if (hasDraftMarker(link.href)) {
    errors.push(
      `${context} ("${link.label}") href is still a draft: "${link.href}".`,
    );
  }

  errors.push(...scanFooterText(link.label, `${context} ("${link.label}")`));

  return errors;
}

/**
 * Scan a fragment of footer copy against the site-wide forbidden-copy guard and
 * the footer's own section 14 prohibitions. Returns problems, empty when clean.
 */
function scanFooterText(text: string, context: string): string[] {
  const errors: string[] = [];

  for (const violation of scanForbiddenCopy(text)) {
    errors.push(
      `${context} contains forbidden copy "${violation.match}" (${violation.id}): ${violation.reason}`,
    );
  }

  const lower = text.toLowerCase();
  for (const term of FORBIDDEN_FOOTER_TERMS) {
    if (lower.includes(term)) {
      errors.push(
        `${context} contains the forbidden footer term "${term}" (section 14: no investor CTA, team/people, careers, or contact form).`,
      );
    }
  }
  for (const phrase of FORBIDDEN_FOOTER_PHRASES) {
    if (lower.includes(phrase)) {
      errors.push(
        `${context} contains the forbidden positioning "${phrase}" (section 14: no venture-volume-machine language).`,
      );
    }
  }
  if (BANNED_COUNT.test(text)) {
    errors.push(`${context} contains a human or team count (section 5, section 14).`);
  }

  return errors;
}

/**
 * Validate the footer against the section 14 rules. Returns the list of
 * problems; an empty list means the footer is well-formed. The production build
 * should treat any non-empty result as fatal.
 */
export function validateFooter(content: FooterContent = footer): string[] {
  const errors: string[] = [];

  // --- Brand mark ---
  if (!content.brand.label.trim()) {
    errors.push("Footer brand mark is missing a label.");
  }
  if (!content.brand.href.trim()) {
    errors.push("Footer brand mark is missing an href.");
  }
  errors.push(...scanFooterText(content.brand.label, "Footer brand mark"));

  // --- Copyright holder (always rendered, so it must always be clean) ---
  if (!content.copyrightHolder.trim()) {
    errors.push("Footer copyright holder is missing.");
  } else if (hasDraftMarker(content.copyrightHolder)) {
    errors.push(
      `Footer copyright holder is still a draft: "${content.copyrightHolder}".`,
    );
  }
  errors.push(...scanFooterText(content.copyrightHolder, "Footer copyright holder"));

  // --- Identity facts (ids must be unique) ---
  const seen = new Set<string>();
  for (const fact of content.facts) {
    if (seen.has(fact.id)) {
      errors.push(`Footer has a duplicate identity fact "${fact.id}".`);
    }
    seen.add(fact.id);
    errors.push(...validateFact(fact, "Footer identity fact"));
  }

  // --- Social links ---
  content.socialLinks.forEach((link, index) => {
    errors.push(...validateLink(link, `Footer social link ${index + 1}`));
  });

  // --- Optional privacy link and contact email ---
  if (content.privacyLink) {
    errors.push(...validateLink(content.privacyLink, "Footer privacy link"));
  }
  if (content.contactEmail) {
    errors.push(...validateFact(content.contactEmail, "Footer contact email"));
    if (!content.contactEmail.value.includes("@")) {
      errors.push(
        `Footer contact email "${content.contactEmail.value}" does not look like an email address.`,
      );
    }
  }

  return errors;
}

/**
 * Assert the footer is valid, throwing an aggregated message on failure.
 * Intended for the build step so a malformed footer fails the production build.
 */
export function assertFooterValid(content: FooterContent = footer): void {
  const errors = validateFooter(content);
  if (errors.length > 0) {
    throw new Error(`Invalid footer:\n- ${errors.join("\n- ")}`);
  }
}

/** The footer a build renders. Every fact here is confirmed and publishes. */
export function publishedFooter(content: FooterContent = footer): FooterContent {
  return content;
}

/**
 * The copyright line for the footer. The year is supplied by the caller — the
 * build passes the current year (or an explicitly maintained value) so this
 * stays deterministic and testable (section 14: "copyright year generated at
 * build time or maintained explicitly").
 */
export function copyrightLine(year: number, content: FooterContent = footer): string {
  if (!Number.isInteger(year) || year < 2016) {
    throw new Error(`Invalid copyright year "${year}"; expected an integer year of 2016 or later.`);
  }
  return `© ${year} ${content.copyrightHolder}. All rights reserved.`;
}
