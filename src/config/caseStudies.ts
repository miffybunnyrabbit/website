/**
 * Typed content model for the enterprise-value case studies (§8.5).
 *
 * The case-study section is the site's primary proof of the proposition, so the
 * data lives in one typed place rather than in ad-hoc markup. Every entry here
 * renders; the approval, claims-ledger, and research gates that used to decide
 * which ones could publish were removed on 2026-08-18 once all five had cleared
 * them, and the record of how each figure was verified is frozen under `docs/`.
 *
 * What survives is structural validation: a required study going missing, the
 * removed Xylo study reappearing (§9.6), a duplicate slug or display order, or a
 * card with no "what Helix actually did" still fails the build, because those
 * are ways the section silently stops being proof.
 *
 * This module is pure content plus validation. It renders as a list of panes and
 * requires no client-side state.
 */

/** The formative-stage tag shown on a card (section 8.5 visual pattern). */
export type EngagementStage = "0-to-1" | "0-to-1-to-10" | "scale";

export type Currency = "AUD" | "USD" | "GBP" | "EUR" | "mixed" | "undecided";

export interface CaseStudy {
  name: string;
  slug: string;
  /** Display order within the section; the plan's recommended order (8.5). */
  order: number;
  website?: string;

  outcomeHeadline: string;
  currentOutcome?: string;
  engagementStage: EngagementStage;
  valueMultiple?: string;
  valueCreated?: string;
  currency?: Currency;

  summary: string;
  /** The concrete "what Helix actually did" points (section 8.5, question 3). */
  helixContribution: string[];

  logo: string;
  image?: string;
  imageAlt?: string;
  /**
   * The image's intrinsic pixel dimensions. Rendered as `width`/`height` on the
   * `<img>` so the browser reserves the right box before the file arrives
   * (P7-007). They must be the file's real size: a square placeholder over a
   * 2:1 picture reserves the wrong space and shifts the layout on load, which is
   * the exact CLS the attributes exist to prevent.
   */
  imageWidth?: number;
  imageHeight?: number;
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
 * The other three took a longer route. Their *published wording* was approved on
 * 2026-08-17 (Q-0002, Q-0004, Q-0005) with the approval explicitly scoped to the
 * headline and role description, leaving their figures blocked on §9 research
 * and tracked by the open Q-0012. That research closed on 2026-08-18: the owner
 * verified Ferovinum, then Origami and Veyor, so all five now publish with
 * backing claim IDs and no `[VERIFY:]`/`[RESEARCH:]` markers anywhere in the
 * collection. The validator still forbids publishing any entry that carries one,
 * which is the gate that held these three back for three weeks.
 *
 * Four studies carry a product image; 13SICK does not, because the only imagery
 * on its site is stock photography of models, which §16.4 forbids and which
 * would be weak proof besides. `CaseStudies.astro` renders a pane without one.
 */
export const caseStudies: readonly CaseStudy[] = [
  {
    name: "Neara",
    slug: "neara",
    order: 1,
    outcomeHeadline: "FROM IDEA TO A$1B+",
    currentOutcome:
      "Public reporting in February 2026 supports an A$1.1b valuation following an A$90m Series D.",
    engagementStage: "0-to-1-to-10",
    valueMultiple: "20×",
    valueCreated: "A$200m",
    currency: "AUD",
    summary:
      "We helped shape the core technology and early business development that moved Neara from concept through its formative 0 → 1 → 10 stage.",
    helixContribution: [
      "Shaped the core technology.",
      "Seeded early business development.",
    ],
    logo: "neara.png",
    image: "neara-platform.png",
    imageWidth: 800,
    imageHeight: 800,
    imageAlt:
      "The Neara platform showing a 3D model of powerline spans over forested terrain, with clearance analytics alongside field imagery of a transmission tower.",
  },
  {
    name: "Ferovinum",
    slug: "ferovinum",
    order: 2,
    // The owner verified the 10× / 300m figures on 2026-08-18 (C-0002), so the
    // study publishes quantified, and named the currency as GBP later the same
    // day — the figure had briefly published as a bare `$300m`, which D-0001
    // reserves for the currency-neutral portfolio aggregate. The §9.2 warning
    // still governs the wording: the headline stays qualitative and no copy
    // describes the securitisation programme as a company valuation.
    outcomeHeadline: "FROM IDEA TO A GLOBAL CAPITAL PLATFORM",
    engagementStage: "0-to-1-to-10",
    valueMultiple: "10×",
    valueCreated: "£300m",
    currency: "GBP",
    summary:
      "We helped shape the technology and anchor early fundraising, supporting Ferovinum through the formative 0 → 1 → 10 stage.",
    helixContribution: [
      "Shaped the technology.",
      "Anchored early fundraising rounds.",
    ],
    logo: "ferovinum.png",
    image: "ferovinum-platform.png",
    imageWidth: 800,
    imageHeight: 799,
    imageAlt:
      "The Ferovinum platform over a vineyard, showing a stock and sale-order dashboard with forward sale prices and deposit balances.",
  },
  {
    name: "13SICK",
    slug: "13sick",
    order: 3,
    outcomeHeadline: "A$30M → A$150M",
    engagementStage: "scale",
    valueMultiple: "5×",
    valueCreated: "A$100m",
    currency: "AUD",
    summary:
      "We applied systems thinking to the operating model and product rollout, helping turn delivery complexity into a repeatable growth engine.",
    helixContribution: [
      "Applied systems thinking to the operating model.",
      "Led the product rollout.",
    ],
    logo: "13sick.png",
    image: "13sick-booking.webp",
    imageWidth: 800,
    imageHeight: 534,
    imageAlt:
      "Booking a 13SICK home-doctor visit on a phone — the first step of the after-hours service.",
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
    outcomeHeadline: "FROM CONCEPT TO A LIVE AUTOMATED-LEVERAGE PROTOCOL",
    engagementStage: "scale",
    valueMultiple: "10×",
    valueCreated: "US$50m",
    currency: "USD",
    summary:
      "We helped build Origami from an idea into a working automated-leverage protocol: one-click leveraged vaults that loop yield-bearing tokens and hold their own position health, rather than leaving that work to the user.",
    helixContribution: [
      "Shaped the leveraged-vault product.",
      "Built the protocol engineering behind the automated positions.",
      "Supported the launch into the wider DeFi market.",
    ],
    logo: "origami.png",
    image: "origami-vaults.png",
    imageWidth: 800,
    imageHeight: 800,
    imageAlt:
      "The Origami protocol interface listing leveraged vaults with their yield, price, and total value locked.",
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
    outcomeHeadline: "FROM CONCEPT TO TIER-ONE SITE LOGISTICS",
    engagementStage: "0-to-1",
    valueMultiple: "10×",
    valueCreated: "A$50m",
    currency: "AUD",
    summary:
      "We helped build Veyor from an initial concept into a delivery-management platform that runs site logistics — bookings, materials and access — on some of Australia’s largest construction projects.",
    helixContribution: [
      "Shaped the delivery-management product.",
      "Built the platform technology through the 0 → 1 stage.",
      "Supported the commercial push into tier-one construction.",
    ],
    logo: "veyor.png",
    image: "veyor-platform.webp",
    imageWidth: 800,
    imageHeight: 403,
    imageAlt:
      "The Veyor platform, showing a site delivery schedule on tablet alongside the mobile booking flow, with live delivery overview and on-site delivery actions called out.",
    // Veyor is the one study whose image is not on Helix's own live site, so it
    // comes from the client's marketing site on the owner's 2026-08-18
    // instruction — a different rights position, stated rather than assumed.
    // Their photography of the product in use was the obvious pick but shows an
    // identifiable person, which §16.4 forbids and `validateAssetRegister()`
    // rejects; this is their product-UI composite, which carries the same proof
    // without a portrait.
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

/** True when `text` contains any unresolved placeholder or draft marker. */
function hasPlaceholder(text: string): boolean {
  const lower = text.toLowerCase();
  return PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker));
}

/** Concatenate a study's visitor-facing copy for marker scanning. */
function renderedText(study: CaseStudy): string {
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

    // A card must answer "what did Helix actually do?" (§8.5, question 3) — an
    // empty contribution list answers only "it became valuable".
    if (study.helixContribution.length === 0) {
      errors.push(
        `Case study "${study.slug}" must describe what Helix actually did.`,
      );
    }

    // Draft copy must never render. The research that resolved these markers is
    // done, but the guard is cheap and a half-written edit is exactly the kind of
    // thing that ships unnoticed.
    if (hasPlaceholder(renderedText(study))) {
      errors.push(
        `Case study "${study.slug}" still contains an unresolved placeholder or draft marker.`,
      );
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

/** The studies in display order (§8.5). Every entry renders. */
export function orderedCaseStudies(
  studies: readonly CaseStudy[] = caseStudies,
): CaseStudy[] {
  return [...studies].sort((a, b) => a.order - b.order);
}
