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

/**
 * Human-facing labels for each formative stage (section 8.5 visual pattern uses
 * `0 → 1 → 10` as its worked example). Kept here, beside the `EngagementStage`
 * type, so the tag shown on a card is validated content rather than copy a
 * component invents in markup; `stageLabel()` is the single source the render
 * layer reads. Using a `Record` keyed on the union means adding a stage without
 * a label is a compile error, not a silently blank tag.
 */
export const STAGE_LABELS: Record<EngagementStage, string> = {
  "0-to-1": "0 → 1",
  "0-to-1-to-10": "0 → 1 → 10",
  scale: "Scale",
};

/** The display tag for a study's formative stage (section 8.5). */
export function stageLabel(stage: EngagementStage): string {
  return STAGE_LABELS[stage];
}

/** Section eyebrow, headline, and intro (section 8.5). */
export const caseStudyCopy = {
  eyebrow: "VALUE, BUILT",
  headline: "VALUE DOESN’T APPEAR. IT GETS BUILT.",
  intro:
    "Selected engagements where product, technology, commercial execution and capital came together to create a material step-change in business value.",
} as const;

/**
 * The five case studies, in the plan's recommended order (section 8.5): Neara
 * and Ferovinum lead because they best establish the scale of the proposition.
 *
 * Two have cleared their section-9 research and approval gates and now publish
 * with backing claim IDs: Neara (owner-approved 2026-08-03, Q-0001) and 13SICK
 * (owner-approved 2026-08-03, Q-0003).
 *
 * The remaining three — Ferovinum, Origami, and Veyor — had their *published
 * wording* approved on 2026-08-17 (Q-0002, Q-0004, Q-0005), but that approval
 * was explicitly scoped to the non-quantified headline and role description of
 * each. Their figures are blocked on research, not on approval, so they still
 * carry unresolved `[VERIFY:]`/`[RESEARCH:]` markers and each stays
 * `publish: false` with no claim IDs; Q-0012 is the open item that now tracks
 * that outstanding §9 research. The validator forbids publishing any entry while
 * it is still in that draft state.
 */
export const caseStudies: readonly CaseStudy[] = [
  {
    name: "Neara",
    slug: "neara",
    order: 1,
    approvalStatus: "approved",
    publish: true,
    outcomeHeadline: "FROM IDEA TO A$1B+",
    currentOutcome:
      "Public reporting in February 2026 supports an A$1.1b valuation following an A$90m Series D.",
    engagementStage: "0-to-1-to-10",
    valueMultiple: "20×",
    valueCreated: "A$200m",
    currency: "AUD",
    summary:
      "Helix helped shape the core technology and early business development that moved Neara from concept through its formative 0 → 1 → 10 stage.",
    helixContribution: [
      "Shaped the core technology.",
      "Seeded early business development.",
    ],
    claimIds: ["C-0001-neara-enterprise-value"],
    logo: "neara.png",
    clientApproval: "approved",
    assetApproval: "approved",
  },
  {
    name: "Ferovinum",
    slug: "ferovinum",
    order: 2,
    // The owner verified the 10× / $300m figures on 2026-08-18 (C-0002), so the
    // study publishes quantified. The §9.2 warning still governs the wording: the
    // headline stays qualitative and no copy describes the securitisation
    // programme as a company valuation.
    approvalStatus: "approved",
    publish: true,
    outcomeHeadline: "FROM IDEA TO A GLOBAL CAPITAL PLATFORM",
    engagementStage: "0-to-1-to-10",
    valueMultiple: "10×",
    valueCreated: "$300m",
    currency: "undecided",
    summary:
      "Helix helped shape the technology and anchor early fundraising, supporting Ferovinum through the formative 0 → 1 → 10 stage.",
    helixContribution: [
      "Shaped the technology.",
      "Anchored early fundraising rounds.",
    ],
    claimIds: ["C-0002-ferovinum-enterprise-value"],
    logo: "ferovinum.png",
    clientApproval: "approved",
    assetApproval: "approved",
  },
  {
    name: "13SICK",
    slug: "13sick",
    order: 3,
    approvalStatus: "approved",
    publish: true,
    outcomeHeadline: "A$30M → A$150M",
    engagementStage: "scale",
    valueMultiple: "5×",
    valueCreated: "A$100m",
    currency: "AUD",
    summary:
      "Helix applied systems thinking to the operating model and product rollout, helping turn delivery complexity into a repeatable growth engine.",
    helixContribution: [
      "Applied systems thinking to the operating model.",
      "Led the product rollout.",
    ],
    claimIds: ["C-0003-13sick-enterprise-value"],
    logo: "13sick.png",
    clientApproval: "approved",
    assetApproval: "approved",
  },
  {
    name: "Origami",
    slug: "origami",
    order: 4,
    // Published on the owner's 2026-08-18 instruction. The wording describes the
    // venture from public sources (the automated-leverage protocol, its lovToken
    // vaults, its seed round) and states Helix's contribution at the level the
    // owner directed. The §9.4 figures were verified by the owner later the same
    // day under Q-0012 and now publish; the currency is USD per the owner's call,
    // so the figure names it rather than using the bare `$` D-0001 reserves for
    // the portfolio aggregate.
    approvalStatus: "approved",
    publish: true,
    outcomeHeadline: "FROM CONCEPT TO A LIVE AUTOMATED-LEVERAGE PROTOCOL",
    engagementStage: "scale",
    valueMultiple: "10×",
    valueCreated: "US$50m",
    currency: "USD",
    summary:
      "Helix helped build Origami from an idea into a working automated-leverage protocol: one-click leveraged vaults that loop yield-bearing tokens and hold their own position health, rather than leaving that work to the user.",
    helixContribution: [
      "Shaped the leveraged-vault product.",
      "Built the protocol engineering behind the automated positions.",
      "Supported the launch into the wider DeFi market.",
    ],
    claimIds: ["C-0004-origami-enterprise-value"],
    logo: "origami.png",
    clientApproval: "approved",
    assetApproval: "approved",
  },
  {
    name: "Veyor Digital",
    slug: "veyor",
    order: 5,
    // Published on the owner's 2026-08-18 instruction. The venture description
    // comes from public reporting (site-logistics platform, tier-one projects
    // including Sydney Metro). The §9.5 value-created figure was verified by the
    // owner later the same day under Q-0012 and now publishes; the A$50m–A$75m
    // public valuation range still stays off the card, since §9.5 forbids citing
    // it as value attributable to Helix.
    approvalStatus: "approved",
    publish: true,
    outcomeHeadline: "FROM CONCEPT TO TIER-ONE SITE LOGISTICS",
    engagementStage: "0-to-1",
    valueMultiple: "10×",
    valueCreated: "A$50m",
    currency: "AUD",
    summary:
      "Helix helped build Veyor from an initial concept into a delivery-management platform that runs site logistics — bookings, materials and access — on some of Australia’s largest construction projects.",
    helixContribution: [
      "Shaped the delivery-management product.",
      "Built the platform technology through the 0 → 1 stage.",
      "Supported the commercial push into tier-one construction.",
    ],
    claimIds: ["C-0005-veyor-enterprise-value"],
    logo: "veyor.png",
    clientApproval: "approved",
    assetApproval: "approved",
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
