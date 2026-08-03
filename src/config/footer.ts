/**
 * Typed content model for the site footer (implementation plan section 14, and
 * the location handling recorded in sections 8 and 12).
 *
 * The footer's job is to establish institutional legitimacy *without*
 * reintroducing people. The plan (section 14) says it should carry the Helix
 * mark, legally accurate location, the legal entity name, the ABN, approved
 * social links, an optional privacy link, an optional approved email, and a
 * copyright line — and it must never carry the removed investment CTA, any team
 * or human reference, a stale contact form, an unverified office, or the old
 * "venture volume machine" positioning.
 *
 * Almost every identity fact the footer wants to show — the registered entity,
 * the ABN, which offices to list, the LinkedIn URL — is not yet a recorded owner
 * decision. Rather than invent those facts or block the build on them, each one
 * lives here as an approval-gated value carrying its `docs/approvals/queue`
 * item (section 23). `publishedFooter()` renders only the facts that have cleared
 * approval, so an unverified ABN or office never leaks into `dist`, while the
 * always-safe parts (the brand mark and the copyright line) still render. This
 * mirrors the honest default the proof-banner and case-study models use.
 *
 * This module is pure content plus validation. The footer is static markup with
 * no client-side state; the production build should call `assertFooterValid()`
 * so a malformed or off-spec footer fails the build instead of shipping.
 */

import { scanForbiddenCopy } from "./forbiddenCopy";

/** Whether an identity fact has cleared its approval-queue item (section 23). */
export type FactApproval = "pending" | "approved";

/**
 * Format of an approval-queue item id, e.g. `Q-0010-footer-identity`
 * (section 23). This is the canonical `Q-NNNN-short-title` shape used by
 * `src/config/approvalQueue.ts`, so a footer fact references a *real* queue item
 * rather than a bare number that could collide with an unrelated item.
 */
export const QUEUE_ITEM_PATTERN = /^Q-\d{4}-[a-z0-9-]+$/;

/**
 * A single institutional identity fact (entity, ABN, registered office, …)
 * whose publication is gated on an approval-queue item. Until `approval` is
 * `"approved"` the fact carries a best-available draft and is withheld from the
 * rendered footer.
 */
export interface FooterFact {
  /** Stable id, e.g. "legal-entity", "abn", "registered-office". */
  id: string;
  /** Visible label, e.g. "ABN". */
  label: string;
  /** Current best-available value or draft. */
  value: string;
  /** Whether the fact has cleared its approval-queue item. */
  approval: FactApproval;
  /** The `docs/approvals/queue` item tracking this fact, e.g. "Q-0010-footer-identity". */
  queueItem: string;
}

/** An external social or profile link (LinkedIn, an approved privacy page, …). */
export interface FooterLink {
  /** Visible link text, e.g. "LinkedIn". */
  label: string;
  /** Absolute HTTPS URL. */
  href: string;
  /** Whether the link has cleared its approval-queue item. */
  approval: FactApproval;
  /** The `docs/approvals/queue` item tracking this link. */
  queueItem: string;
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
 * registered office is the Vine Street, Redfern address, so `publishedFooter()`
 * now renders them alongside the brand mark and copyright line.
 *
 * The registered-office draft uses the one concrete address in the plan
 * (section 12); whether the footer ultimately lists that address or the current
 * Sydney/Melbourne/Brisbane offices is itself an open decision (D-007). All
 * three institutional-identity facts are tracked by a single approval-queue
 * item, `Q-0010-footer-identity`, which the queue model cross-checks so this
 * pending content can never lose its tracking (section 23). No LinkedIn URL is
 * documented anywhere, so `socialLinks` is deliberately empty rather than
 * carrying an invented link.
 */
export const footer: FooterContent = {
  brand: { label: "Helix Collective", href: "/" },
  facts: [
    {
      id: "legal-entity",
      label: "Legal entity",
      value: "Helix Venture Studio Pty Ltd",
      approval: "approved",
      queueItem: "Q-0010-footer-identity",
    },
    {
      id: "abn",
      label: "ABN",
      value: "20 678 772 631",
      approval: "approved",
      queueItem: "Q-0010-footer-identity",
    },
    {
      id: "registered-office",
      label: "Registered office",
      value: "Level 1, 2–14 Vine Street, Redfern NSW 2016",
      approval: "approved",
      queueItem: "Q-0010-footer-identity",
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
  if (!QUEUE_ITEM_PATTERN.test(fact.queueItem)) {
    errors.push(
      `${context} ("${fact.id}") has an invalid approval-queue id "${fact.queueItem}"; expected the form "Q-NNNN".`,
    );
  }

  // An approved fact is published verbatim, so it may not still be a draft.
  if (fact.approval === "approved" && hasDraftMarker(fact.value)) {
    errors.push(
      `${context} ("${fact.id}") is approved but still contains a draft marker: "${fact.value}".`,
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
  if (!QUEUE_ITEM_PATTERN.test(link.queueItem)) {
    errors.push(
      `${context} ("${link.label}") has an invalid approval-queue id "${link.queueItem}"; expected the form "Q-NNNN".`,
    );
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

  if (link.approval === "approved" && hasDraftMarker(link.href)) {
    errors.push(
      `${context} ("${link.label}") is approved but its href is still a draft: "${link.href}".`,
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
    if (!content.contactEmail.value.includes("@") && content.contactEmail.approval === "approved") {
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

/**
 * The footer a production build should render: the always-safe brand mark and
 * copyright line, plus only those identity facts, social links, privacy link,
 * and contact email that have cleared approval. Pending facts are withheld so an
 * unverified ABN, entity, or office never reaches `dist`, while the footer still
 * renders in its minimal, honest current state.
 */
export function publishedFooter(content: FooterContent = footer): FooterContent {
  const isApproved = (item: { approval: FactApproval }) => item.approval === "approved";
  return {
    brand: content.brand,
    facts: content.facts.filter(isApproved),
    socialLinks: content.socialLinks.filter(isApproved),
    privacyLink:
      content.privacyLink && isApproved(content.privacyLink) ? content.privacyLink : undefined,
    contactEmail:
      content.contactEmail && isApproved(content.contactEmail) ? content.contactEmail : undefined,
    copyrightHolder: content.copyrightHolder,
  };
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
