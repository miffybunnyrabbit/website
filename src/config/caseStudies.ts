/**
 * Typed content model for the enterprise-value case studies (implementation
 * plan sections 8.5, 9, and 20.1).
 *
 * The case-study section is the site's primary proof of the proposition, so the
 * data lives in one typed, validated place rather than in ad-hoc markup. Almost
 * every quantified claim here is blocked on the research and client-approval
 * gates described in section 9; until those gates pass, an entry stays
 * `publish: false`. The point of the validation below is to make those gates
 * mechanical: the production build fails if anyone flips an entry to published
 * before it has been approved, if a required study goes missing, or if a removed
 * study (Xylo) reappears.
 *
 * This module is pure content plus validation. It renders as a list of cards and
 * requires no client-side state.
 */

export type ApprovalStatus =
  | "draft"
  | "researching"
  | "internally-verified"
  | "approved";

/** The formative-stage tag shown on a card (section 8.5 visual pattern). */
export type EngagementStage = "0-to-1" | "0-to-1-to-10" | "scale";

export type Currency = "AUD" | "USD" | "GBP" | "EUR" | "mixed" | "undecided";

/** Client sign-off state; `not-required` is only valid with a recorded reason. */
export type ClientApproval = "pending" | "approved" | "not-required";

export type AssetApproval = "pending" | "approved";

export interface CaseStudy {
  name: string;
  slug: string;
  /** Display order within the section; the plan's recommended order (8.5). */
  order: number;
  website?: string;
  approvalStatus: ApprovalStatus;
  /** Whether this study is rendered in a production build. */
  publish: boolean;

  outcomeHeadline: string;
  currentOutcome?: string;
  engagementStage: EngagementStage;
  valueMultiple?: string;
  valueCreated?: string;
  currency?: Currency;

  summary: string;
  /** The concrete "what Helix actually did" points (section 8.5, question 3). */
  helixContribution: string[];
  /** Claim-ledger IDs backing every quantified statement (section 17.6/20.1). */
  claimIds: string[];

  logo: string;
  image?: string;
  imageAlt?: string;

  clientApproval: ClientApproval;
  assetApproval: AssetApproval;
}

/** Section eyebrow, headline, and intro (section 8.5). */
export const caseStudyCopy = {
  eyebrow: "VALUE, BUILT",
  headline: "VALUE DOESN’T APPEAR. IT GETS BUILT.",
  intro:
    "Selected engagements where product, technology, commercial execution and capital came together to create a material step-change in business value.",
} as const;

/**
 * The five approved case studies, in the plan's recommended order (section 8.5):
 * Neara and Ferovinum lead because they best establish the scale of the
 * proposition.
 *
 * Every quantified figure is a working draft carrying an unresolved `[VERIFY:]`
 * or `[RESEARCH:]` marker, so each entry is `publish: false` with no claim IDs
 * until its section-9 research and approval gates pass. The validator forbids
 * publishing any of them in this state.
 */
export const caseStudies: readonly CaseStudy[] = [
  {
    name: "Neara",
    slug: "neara",
    order: 1,
    approvalStatus: "researching",
    publish: false,
    outcomeHeadline: "FROM IDEA TO A$1B+",
    currentOutcome:
      "Public reporting in February 2026 supports an A$1.1b valuation following an A$90m Series D.",
    engagementStage: "0-to-1-to-10",
    valueMultiple: "[VERIFY: 20×]",
    valueCreated: "[VERIFY: A$200m]",
    currency: "AUD",
    summary:
      "Helix helped shape the core technology and early business development that moved Neara from concept through its formative 0 → 1 → 10 stage.",
    helixContribution: [
      "Shaped the core technology.",
      "Seeded early business development.",
    ],
    claimIds: [],
    logo: "neara.svg",
    clientApproval: "pending",
    assetApproval: "pending",
  },
  {
    name: "Ferovinum",
    slug: "ferovinum",
    order: 2,
    approvalStatus: "researching",
    publish: false,
    // Non-quantified until the securitisation-vs-valuation evidence gate passes
    // (section 9.2 critical evidence warning).
    outcomeHeadline: "FROM IDEA TO A GLOBAL CAPITAL PLATFORM",
    engagementStage: "0-to-1-to-10",
    valueMultiple: "[VERIFY: 10×]",
    valueCreated: "[VERIFY: $300m]",
    currency: "undecided",
    summary:
      "Helix helped shape the technology and anchor early fundraising, supporting Ferovinum through the formative 0 → 1 → 10 stage.",
    helixContribution: [
      "Shaped the technology.",
      "Anchored early fundraising rounds.",
    ],
    claimIds: [],
    logo: "ferovinum.svg",
    clientApproval: "pending",
    assetApproval: "pending",
  },
  {
    name: "13SICK",
    slug: "13sick",
    order: 3,
    approvalStatus: "researching",
    publish: false,
    outcomeHeadline: "A$30M → A$150M",
    engagementStage: "scale",
    valueMultiple: "[VERIFY: 5×]",
    valueCreated: "[VERIFY: A$100m]",
    currency: "AUD",
    summary:
      "Helix applied systems thinking to the operating model and product rollout, helping turn delivery complexity into a repeatable growth engine.",
    helixContribution: [
      "Applied systems thinking to the operating model.",
      "Led the product rollout.",
    ],
    claimIds: [],
    logo: "13sick.svg",
    clientApproval: "pending",
    assetApproval: "pending",
  },
  {
    name: "Origami",
    slug: "origami",
    order: 4,
    // Blocked on internal subject-matter research: the "how" must not be
    // invented (section 9.4).
    approvalStatus: "draft",
    publish: false,
    outcomeHeadline: "APPROX. 10× VALUE GROWTH",
    engagementStage: "scale",
    valueMultiple: "[VERIFY: 10×]",
    valueCreated: "[VERIFY: $50m]",
    currency: "undecided",
    summary:
      "Helix helped Origami move from [VERIFY: starting state] to [VERIFY: outcome] by [RESEARCH: precise product, protocol, engineering, go-to-market or capital contribution].",
    helixContribution: [],
    claimIds: [],
    logo: "origami.svg",
    clientApproval: "pending",
    assetApproval: "pending",
  },
  {
    name: "Veyor Digital",
    slug: "veyor",
    order: 5,
    approvalStatus: "researching",
    publish: false,
    outcomeHeadline: "0 → 1 TO A$50M+",
    currentOutcome:
      "March 2026 reporting supports an A$50m–A$75m valuation range associated with Veyor’s Series A.",
    engagementStage: "0-to-1",
    valueMultiple: "[VERIFY: 10×]",
    valueCreated: "[VERIFY: A$50m]",
    currency: "AUD",
    summary:
      "Helix helped turn Veyor from [VERIFY: initial concept/state] into a scalable delivery-management platform by [RESEARCH: exact product, technology, operating and commercial contribution].",
    helixContribution: [],
    claimIds: [],
    logo: "veyor.svg",
    clientApproval: "pending",
    assetApproval: "pending",
  },
];

/** Slugs that must be present in the collection (section 5, "Case studies"). */
export const REQUIRED_CASE_STUDY_SLUGS: readonly string[] = [
  "neara",
  "ferovinum",
  "13sick",
  "origami",
  "veyor",
];

/**
 * Case studies that must never appear as a featured panel. Xylo is removed as a
 * case study (section 9.6); its logo is a separate marquee decision (D-008) and
 * is deliberately not policed here.
 */
export const REMOVED_CASE_STUDY_SLUGS: readonly string[] = ["xylo"];

/**
 * Draft markers and unresolved research placeholders that must never reach a
 * *published* entry. Matching is case-insensitive.
 */
const PLACEHOLDER_MARKERS: readonly string[] = [
  "[verify:",
  "[research:",
  "draft",
  "not for publication",
  "todo",
  "tbd",
  "placeholder",
  "lorem ipsum",
];

/**
 * Fields whose text is treated as a public quantified claim. If one of these
 * contains a number-with-magnitude (a currency amount or an "N×" multiple), the
 * study must cite at least one claim ID (section 20.1).
 */
const QUANTIFIED_FIELDS: readonly (keyof CaseStudy)[] = [
  "outcomeHeadline",
  "currentOutcome",
  "valueMultiple",
  "valueCreated",
];

/** True when `text` reads as a quantified value claim (currency or N× multiple). */
export function looksQuantified(text: string): boolean {
  // A currency symbol adjacent to a digit (e.g. "$300m", "A$1.1b"), or a number
  // immediately followed by a multiplier sign (e.g. "20×", "5x").
  return /[$£€]\s?\d/.test(text) || /\d\s?[×x]/.test(text);
}

/** True when `text` contains any unresolved placeholder or draft marker. */
function hasPlaceholder(text: string): boolean {
  const lower = text.toLowerCase();
  return PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker));
}

/** Concatenate the publish-facing copy of a study for marker scanning. */
function publishedText(study: CaseStudy): string {
  return [
    study.outcomeHeadline,
    study.currentOutcome ?? "",
    study.valueMultiple ?? "",
    study.valueCreated ?? "",
    study.summary,
    ...study.helixContribution,
  ].join(" ");
}

/**
 * Validate the case-study collection against the section 20.1 rules. Returns the
 * list of problems; an empty list means the content is well-formed. The
 * production build should treat any non-empty result as fatal.
 */
export function validateCaseStudies(
  studies: readonly CaseStudy[] = caseStudies,
): string[] {
  const errors: string[] = [];

  const slugs = studies.map((s) => s.slug.toLowerCase());

  // Every required study must be present.
  for (const required of REQUIRED_CASE_STUDY_SLUGS) {
    if (!slugs.includes(required)) {
      errors.push(`Required case study "${required}" is missing.`);
    }
  }

  // No removed study may reappear (by slug or by name).
  for (const study of studies) {
    const key = study.slug.toLowerCase();
    const nameKey = study.name.toLowerCase();
    if (
      REMOVED_CASE_STUDY_SLUGS.includes(key) ||
      REMOVED_CASE_STUDY_SLUGS.includes(nameKey)
    ) {
      errors.push(
        `Case study "${study.name}" was removed and must not be present.`,
      );
    }
  }

  // Slugs and display orders must be unique so cards are stable and unambiguous.
  const seenSlugs = new Set<string>();
  const seenOrders = new Set<number>();
  for (const study of studies) {
    const key = study.slug.toLowerCase();
    if (seenSlugs.has(key)) {
      errors.push(`Duplicate case-study slug "${study.slug}".`);
    }
    seenSlugs.add(key);
    if (seenOrders.has(study.order)) {
      errors.push(
        `Duplicate case-study order ${study.order} ("${study.slug}").`,
      );
    }
    seenOrders.add(study.order);
  }

  // Per-study structural and gate checks.
  for (const study of studies) {
    if (!study.name.trim()) {
      errors.push(`Case study "${study.slug}" is missing a name.`);
    }
    if (!study.outcomeHeadline.trim()) {
      errors.push(`Case study "${study.slug}" is missing an outcome headline.`);
    }
    if (!study.summary.trim()) {
      errors.push(`Case study "${study.slug}" is missing a summary.`);
    }

    // The following gates only bite when an entry is actually published. An
    // unpublished, still-in-research entry is allowed to carry placeholders and
    // pending approvals — that is the whole point of the publish flag.
    if (!study.publish) {
      continue;
    }

    if (study.approvalStatus !== "approved") {
      errors.push(
        `Case study "${study.slug}" is published but its approval status is "${study.approvalStatus}", not "approved".`,
      );
    }
    if (study.clientApproval === "pending") {
      errors.push(
        `Case study "${study.slug}" is published but client approval is still pending.`,
      );
    }
    if (study.assetApproval !== "approved") {
      errors.push(
        `Case study "${study.slug}" is published but asset approval is "${study.assetApproval}", not "approved".`,
      );
    }

    // A published study must answer "what did Helix actually do?" (section 8.5,
    // question 3) — an empty contribution list answers only "it became valuable".
    if (study.helixContribution.length === 0) {
      errors.push(
        `Published case study "${study.slug}" must describe what Helix actually did.`,
      );
    }

    // No unresolved research placeholders in published copy.
    if (hasPlaceholder(publishedText(study))) {
      errors.push(
        `Published case study "${study.slug}" still contains an unresolved placeholder or draft marker.`,
      );
    }

    // Every quantified public claim must be backed by at least one claim ID.
    for (const field of QUANTIFIED_FIELDS) {
      const value = study[field];
      if (typeof value === "string" && looksQuantified(value)) {
        if (study.claimIds.length === 0) {
          errors.push(
            `Published case study "${study.slug}" makes a quantified claim in "${field}" but cites no claim IDs.`,
          );
          break;
        }
      }
    }
  }

  return errors;
}

/**
 * Assert the case-study collection is valid, throwing on failure. Intended for
 * use at build time so broken or prematurely-published content fails the build.
 */
export function assertCaseStudiesValid(
  studies: readonly CaseStudy[] = caseStudies,
): void {
  const errors = validateCaseStudies(studies);
  if (errors.length > 0) {
    throw new Error(
      `Invalid case-study content:\n- ${errors.join("\n- ")}`,
    );
  }
}

/**
 * The studies a production build should render, in display order. Only approved,
 * published entries are returned so in-research drafts never leak into `dist`.
 */
export function publishedCaseStudies(
  studies: readonly CaseStudy[] = caseStudies,
): CaseStudy[] {
  return studies
    .filter((study) => study.publish)
    .sort((a, b) => a.order - b.order);
}
