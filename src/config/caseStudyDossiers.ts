/**
 * Typed, self-validating case-study research dossiers (implementation plan
 * §17.8 R-007, and the §9 per-study research direction).
 *
 * §17.8 requires one research dossier per case study under
 * `docs/research/case-studies/`, and states the gate plainly: "Dependent copy
 * may not be finalised until the corresponding dossier exists." The
 * `caseStudies` model already publishes each study in draft form behind its
 * approval gates, but nothing yet captured the underlying research — the
 * engagement timeline, the starting/end/current states, what Helix actually did,
 * the valuation evidence, the calculation, the attribution language, the
 * sources, and the asset/client-approval position. This module is that missing
 * research spine.
 *
 * Following the same convention as `claimsLedger.ts` and `assetRegister.ts`, a
 * dossier is thin: it stores only the §17.8 research narrative and *derives* the
 * public-facing facts (the study name, the proposed public claim, the draft
 * copy, the backing claim IDs, and the approval position) from the live
 * `caseStudies` / `claimsLedger` models, so a dossier can never drift from the
 * copy it documents. Validation cross-checks all of it: every required study has
 * exactly one dossier, no removed study (Xylo) has one, a dossier for an unknown
 * study fails, and — the R-007 gate — a *published* study with no dossier fails
 * the build.
 *
 * `docs/research/case-studies/<slug>.md` is generated from this model
 * (`renderDossierMarkdown`) using the exact §17.8 template, and
 * `caseStudyDossiers.test.ts` asserts the committed files still match, so the
 * printable dossiers can never drift from the code.
 *
 * This module is pure content plus validation: no UI, no client-side state. It
 * invents no verified figures — every value is derived from an existing draft or
 * left as an explicit `[RESEARCH:]` / `[VERIFY:]` marker while the research is
 * outstanding.
 */

import {
  caseStudies,
  REMOVED_CASE_STUDY_SLUGS,
  REQUIRED_CASE_STUDY_SLUGS,
  stageLabel,
  type CaseStudy,
} from "./caseStudies";
import { claimsForCaseStudy, type ClaimRecord } from "./claimsLedger";

/**
 * The "Helix contribution" buckets from the §17.8 template. Each is a short
 * statement of what Helix did on that lever, or an explicit `[RESEARCH:]` marker
 * where the contribution is not yet documented (§9.4/§9.5 block the "how" until
 * internal subject-matter research lands).
 */
export interface HelixContribution {
  product: string;
  technology: string;
  commercial: string;
  operatingModel: string;
  fundraisingCapital: string;
  other: string;
}

/**
 * One case-study research dossier (§17.8). Stores only the research narrative;
 * the study name, proposed public claim, draft copy, backing claim IDs, and
 * approval position are derived from the live models so nothing is duplicated.
 */
export interface CaseStudyDossier {
  /** Case-study slug; must resolve to an entry in `caseStudies`. */
  slug: string;
  /** The plan section giving this study's research direction, e.g. "§9.1". */
  planSection: string;
  /** Why this case earns a place on the site (§17.8). */
  whyItBelongs: string;
  /** Engagement start/end dates, or the marker for the outstanding dates. */
  engagementTimeline: string;
  /** Where the company was when Helix became involved. */
  startingState: string;
  /** Where it was at the end of Helix's engagement. */
  endOfEngagementState: string;
  /** Where it is now (public reporting), kept distinct from the above. */
  currentState: string;
  /** What Helix actually did, per lever (§8.5 question 3). */
  contribution: HelixContribution;
  /** The evidence for the value claim (§8.5 question 4). */
  valuationEvidence: string;
  /** How the multiple / value-created figure is calculated (§17.6, R-005). */
  calculation: string;
  /** Currency treatment for this study (D-001). */
  currencyTreatment: string;
  /** The approved attribution wording, avoiding sole-causation (D-003). */
  attributionLanguage: string;
  /** Public sources supporting the current-state claim; HTTPS URLs. */
  publicSources: readonly string[];
  /** Pointer to secure internal evidence — never the evidence itself. */
  internalSources: string;
  /** Logo / imagery rights position (cross-references the asset register). */
  assetPermissions: string;
  /** Client sign-off position (§23 category C). */
  clientApprovalNote: string;
  /** Wording that must not be published for this study (§9 warnings). */
  risksOrProhibitedWording: string;
  /** The approval position: which queue items gate this study. */
  approvalRecord: string;
}

/**
 * The five case-study dossiers, one per required study (§17.8). Every research
 * field carries the best-available fact from §9/§28 or an explicit
 * `[RESEARCH:]` / `[VERIFY:]` marker, so the honest current state — "drafted,
 * publishing withheld, research outstanding" — is visible rather than invented.
 */
export const caseStudyDossiers: readonly CaseStudyDossier[] = [
  {
    slug: "neara",
    planSection: "§9.1",
    whyItBelongs:
      "Neara and Ferovinum lead the section because they best establish the scale of the proposition — here, from idea to A$1b+ (§8.5).",
    engagementTimeline:
      "[RESEARCH: exact engagement start and end dates]. Helix was involved through the formative 0 → 1 → 10 stage.",
    startingState:
      "Concept stage. [VERIFY: entry valuation and the evidence for it].",
    endOfEngagementState:
      "[VERIFY: end-of-engagement valuation evidence]. [VERIFY: whether the 20× figure is an equity valuation, enterprise value, or another measure].",
    currentState:
      "Public reporting in February 2026 supports an A$1.1b valuation following an A$90m Series D.",
    contribution: {
      product: "[RESEARCH: precise product contribution]",
      technology: "Shaped the core technology that seeded early momentum.",
      commercial: "Seeded the initial business development.",
      operatingModel: "[RESEARCH: operating-model contribution, if any]",
      fundraisingCapital: "[RESEARCH: capital/fundraising contribution, if any]",
      other: "[RESEARCH: any other contribution]",
    },
    valuationEvidence:
      "Current A$1.1b outcome is public (see sources). Entry and end-of-engagement values, and Helix's role in initial business development, need internal evidence.",
    calculation:
      "[VERIFY: the A$200m value-created basis and the 20× multiple, including the entry and end reference points and which measure they use].",
    currencyTreatment:
      "AUD, shown as A$ per the claims methodology and D-001; no mixed-currency aggregation into the headline.",
    attributionLanguage:
      "\"Approximately A$200m in value was created during Helix's engagement, with Helix contributing through the core technology and early business development\" (D-003) — never a claim that Helix alone caused the valuation movement.",
    publicSources: [
      "https://neara.com/resources/press/neara-raises-90-million-to-solve-the-global-infrastructure-crisis-with-ai/",
      "https://www.smartcompany.com.au/startupsmart/neara-powers-up-to-unicorn-status-with-90-million-capital-raise/",
    ],
    internalSources:
      "[RESEARCH: secure engagement records and valuation evidence — reference the secure location; do not commit sensitive files].",
    assetPermissions:
      "Logo and product imagery pending client permission (asset register; §23 category C, Q-0006).",
    clientApprovalNote: "Pending — client approval of the description required.",
    risksOrProhibitedWording:
      "Do not imply continuous involvement through to the current A$1.1b outcome; describe value as created during the engagement, not caused by it alone.",
    approvalRecord:
      "Valuation claim gated by Q-0001 (category B: finance, legal, owner); logo and role description gated by Q-0006 (category C).",
  },
  {
    slug: "ferovinum",
    planSection: "§9.2",
    whyItBelongs:
      "Leads alongside Neara on scale — from idea to a global capital platform (§8.5). Kept qualitative until the securitisation-vs-valuation evidence resolves.",
    engagementTimeline:
      "[RESEARCH: exact engagement start and end dates]. Helix supported Ferovinum through the formative 0 → 1 → 10 stage.",
    startingState: "Concept stage. [VERIFY: entry reference point].",
    endOfEngagementState:
      "[VERIFY: end-of-engagement position, distinguishing company valuation from funding capacity].",
    currentState:
      "Public materials support a large asset-backed securitisation/funding programme in the $500m–$550m range — which is not, on its own, a company valuation or enterprise value (§9.2 critical evidence warning).",
    contribution: {
      product: "[RESEARCH: precise product contribution]",
      technology: "Shaped the technology.",
      commercial: "Anchored early fundraising rounds.",
      operatingModel: "[RESEARCH: operating-model contribution, if any]",
      fundraisingCapital: "Helped anchor early fundraising.",
      other: "[RESEARCH: any other contribution]",
    },
    valuationEvidence:
      "The owner verified the 10× / $300m figures on 2026-08-18 (Q-0002, C-0002), so they publish. The §9.2 separation still binds the *wording*: nothing on the card describes the securitisation/funding programme as a company valuation, and the headline stays qualitative.",
    calculation:
      "10× value growth and ~$300m value created during the engagement, verified by the owner on 2026-08-18. [VERIFY: the currency basis — the figure publishes as a bare `$300m` while its sources span GBP and USD, and D-0001 reserves the bare `$` for the portfolio aggregate].",
    currencyTreatment:
      "Undecided — the underlying figures span GBP and USD sources; no aggregation until a documented conversion basis exists (D-001).",
    attributionLanguage:
      "\"Approximately $300m in value was created during Helix's engagement, with Helix contributing through the technology and early fundraising\" (D-003) — never a claim that conflates funding capacity with company value.",
    publicSources: [
      "https://www.ferodrinks.com/posts/ferovinum-announces-the-completion-of-its-ps17-5m-series-a-funding-round",
      "https://alternativecreditinvestor.com/2025/06/30/ferovinum-secures-world-first-550m-abs-for-drinks-industry/",
    ],
    internalSources:
      "[RESEARCH: secure valuation and cap-table evidence separating equity value from financing capacity — reference the secure location].",
    assetPermissions:
      "Logo and any product imagery pending client permission (asset register; §23 category C, Q-0006).",
    clientApprovalNote: "Pending — client approval of the description required.",
    risksOrProhibitedWording:
      "Do not describe the securitisation/funding programme as a company valuation or enterprise value; publish the qualitative headline until the evidence gate passes (§9.2).",
    approvalRecord:
      "Published wording approved by Q-0002 (category B, 2026-08-17); the owner verified the figures under the same item on 2026-08-18, so the study publishes quantified and left the Q-0012 residue; logo and role description gated by Q-0006 (category C).",
  },
  {
    slug: "13sick",
    planSection: "§9.3",
    whyItBelongs:
      "A scale-stage proof point: systems thinking and product rollout turning delivery complexity into a repeatable growth engine (§9.3).",
    engagementTimeline: "[RESEARCH: engagement dates].",
    startingState:
      "[VERIFY: the ~A$30m starting valuation, the entity valued, and the source].",
    endOfEngagementState:
      "[VERIFY: the ~A$150m end valuation, the source, and whether it comes from a transaction].",
    currentState: "[RESEARCH: current-state reference, if any may be cited].",
    contribution: {
      product: "Led the product rollout.",
      technology: "[RESEARCH: technology contribution, if any]",
      commercial: "[RESEARCH: commercial contribution, if any]",
      operatingModel: "Applied systems thinking to the operating model.",
      fundraisingCapital: "[RESEARCH: capital contribution, if any]",
      other: "[RESEARCH: any other contribution]",
    },
    valuationEvidence:
      "[VERIFY: dates and sources for both the A$30m and A$150m figures, and whether either comes from a transaction].",
    calculation:
      "A$30m → A$150m is a A$120m increase; the brief's ~A$100m value-created figure may be an intentionally conservative claim. Record the chosen methodology rather than silently correcting it (§9.3, R-005).",
    currencyTreatment: "AUD, shown as A$ per the claims methodology (D-001).",
    attributionLanguage:
      "\"More than A$100m in value was created during Helix's engagement, with Helix contributing through systems thinking and the product rollout\" (D-003).",
    publicSources: [],
    internalSources:
      "[RESEARCH: secure valuation evidence and the specific systems/product changes Helix led — reference the secure location].",
    assetPermissions:
      "Logo, screenshots, and any use of the 13SICK brand styling pending permission; check medical-advertising and confidentiality constraints (§9.3; asset register; Q-0006).",
    clientApprovalNote:
      "Pending — client approval and any medical-advertising review required.",
    risksOrProhibitedWording:
      "Do not publish either figure without its date, source, and entity; check whether medical-advertising or confidentiality constraints apply.",
    approvalRecord:
      "Valuation claim gated by Q-0003 (category B); logo and role description gated by Q-0006 (category C).",
  },
  {
    slug: "origami",
    planSection: "§9.4",
    whyItBelongs:
      "Demonstrates value creation in a capital/protocol context. Publishes qualitatively on the owner's 2026-08-18 instruction — the venture description is drawn from public sources and the contribution from the owner's statement that Helix materially helped build it; the ~10× figures stay unpublished pending §9.4 research.",
    engagementTimeline: "[RESEARCH: engagement dates].",
    startingState: "[VERIFY: starting state].",
    endOfEngagementState: "[VERIFY: outcome].",
    currentState:
      "Public sources describe Origami Finance as an automated-leverage protocol whose lovToken vaults one-click loop yield-bearing tokens (weETH, sUSDe) using flash loans and hold a near-constant loan-to-value ratio; it announced a $1.5m seed round in August 2024 and is among the larger leveraged-farming protocols by TVL. None of those public metrics is a company valuation (§9.4).",
    contribution: {
      product: "Shaped the leveraged-vault product (owner-stated, 2026-08-18).",
      technology:
        "Built the protocol engineering behind the automated positions (owner-stated, 2026-08-18).",
      commercial:
        "Supported the launch into the wider DeFi market (owner-stated, 2026-08-18).",
      operatingModel: "[RESEARCH: operating-model contribution]",
      fundraisingCapital: "[RESEARCH: capital contribution]",
      other: "[RESEARCH: any other contribution]",
    },
    valuationEvidence:
      "[VERIFY: the ~$50m value-created figure and the value basis, keeping company valuation distinct from funding raised or total value locked]. Nothing quantified publishes until this resolves — the card carries no figure.",
    calculation:
      "[VERIFY: the ~10× multiple and the ~$50m value-created basis, once the value measure is established].",
    currencyTreatment:
      "Undecided — crypto-market context; no aggregation until a documented basis exists (D-001).",
    attributionLanguage:
      "\"Approximately $50m in value was created during Helix's engagement\" (D-003) — pending the documented contribution.",
    publicSources: [
      "https://docs.origami.finance/",
      "https://www.binance.com/en/square/post/2024-08-27-origami-finance-secures-1-5-million-in-seed-funding-for-automated-leverage-protocol-12713591275417",
      "https://defillama.com/protocol/origami-finance",
    ],
    internalSources:
      "The published contribution is the owner's own statement (2026-08-18) that Helix materially helped build the venture, not documented evidence. [RESEARCH: secure subject-matter evidence for the product, protocol, engineering, go-to-market, or capital contribution — reference the secure location].",
    assetPermissions:
      "Logo and any imagery pending permission (asset register; §23 category C, Q-0006).",
    clientApprovalNote: "Pending — client approval of the description required.",
    risksOrProhibitedWording:
      "Do not confuse funding raised or total value locked with company valuation (§9.4). The published contribution rests on the owner's statement rather than documented evidence, so it must be re-read by the owner before launch and narrowed if any bullet overstates the role.",
    approvalRecord:
      "Wording approved by Q-0004 (category B, 2026-08-17); the card published on the owner's 2026-08-18 instruction, which also supplied the contribution wording — that copy postdates Q-0004 and needs the owner's re-read. Figures remain gated by the open Q-0012; logo and role description gated by Q-0006 (category C).",
  },
  {
    slug: "veyor",
    planSection: "§9.5",
    whyItBelongs:
      "A 0 → 1 proof point: from initial concept to a scalable delivery-management platform now valued at A$50m+ (§9.5).",
    engagementTimeline:
      "[RESEARCH: engagement dates]. Helix was involved through the 0 → 1 stage.",
    startingState: "[VERIFY: initial concept/state and any fundraising reference point].",
    endOfEngagementState:
      "[VERIFY: end-of-engagement position and the value attributable to Helix].",
    currentState:
      "March 2026 reporting supports an A$50m–A$75m valuation range associated with Veyor's Series A — the broad current valuation, but not the entry value, multiple, or Helix's exact contribution.",
    contribution: {
      product:
        "Shaped the delivery-management product (owner-stated, 2026-08-18).",
      technology:
        "Built the platform technology through the 0 → 1 stage (owner-stated, 2026-08-18).",
      commercial:
        "Supported the commercial push into tier-one construction (owner-stated, 2026-08-18).",
      operatingModel: "[RESEARCH: operating contribution]",
      fundraisingCapital: "[RESEARCH: capital contribution]",
      other: "[RESEARCH: any other contribution]",
    },
    valuationEvidence:
      "Current A$50m–A$75m range is public (see sources). The entry value, the multiple, and Helix's contribution need internal evidence (§9.5).",
    calculation:
      "[VERIFY: the ~10× multiple and the ~A$50m value-created basis, including the entry reference point].",
    currencyTreatment: "AUD, shown as A$ per the claims methodology (D-001).",
    attributionLanguage:
      "\"Approximately A$50m in value was created during Helix's engagement\" (D-003) — pending the documented contribution. Use the brand spelling \"Veyor\", not \"Veyordigital\" (§9.5).",
    publicSources: [
      "https://www.smartcompany.com.au/startupsmart/veyor-11-million-series-a-raise-us-expansion/",
      "https://www.veyordigital.com/news/australian-investors-back-construction-app-with-4m-over-subscribed-equity-raise",
      "https://www.businessnewsaustralia.com/articles/the--ubereats--of-construction-logistics--veyor-digital-raises--2-75-million-in-pre-series-a.html",
      "https://www.constructionadvisor.com.au/aussie-app-by-veyor-drives-construction-industry-into-digital-era-sydney-metro-case-study/",
    ],
    internalSources:
      "The published contribution is the owner's own statement (2026-08-18) that Helix materially helped build the venture, not documented evidence. [RESEARCH: secure engagement records, the initial value reference, and Helix's exact contribution — reference the secure location].",
    assetPermissions:
      "Logo and any imagery pending permission (asset register; §23 category C, Q-0006).",
    clientApprovalNote: "Pending — client approval of the description required.",
    risksOrProhibitedWording:
      "Do not cite the A$50m–A$75m range as value attributable to Helix — it is off the published card entirely; use the brand spelling \"Veyor\". The published contribution rests on the owner's statement rather than documented evidence, so it must be re-read by the owner before launch and narrowed if any bullet overstates the role.",
    approvalRecord:
      "Wording approved by Q-0005 (category B, 2026-08-17); the card published on the owner's 2026-08-18 instruction, which also supplied the contribution wording — that copy postdates Q-0005 and needs the owner's re-read. Figures remain gated by the open Q-0012; logo and role description gated by Q-0006 (category C).",
  },
];

/** The `docs/research/case-studies` directory holding the generated dossiers. */
export const DOSSIER_DOC_DIR = "docs/research/case-studies";

/** Filename, within {@link DOSSIER_DOC_DIR}, of a study's generated dossier. */
export function dossierFilename(dossier: CaseStudyDossier): string {
  return `${dossier.slug}.md`;
}

/** The dossier for a case study, or `undefined` if none exists. */
export function dossierForStudy(
  slug: string,
  dossiers: readonly CaseStudyDossier[] = caseStudyDossiers,
): CaseStudyDossier | undefined {
  const key = slug.toLowerCase();
  return dossiers.find((d) => d.slug.toLowerCase() === key);
}

/** The live case study a dossier documents, or `undefined` if none. */
function studyForDossier(
  dossier: CaseStudyDossier,
  studies: readonly CaseStudy[] = caseStudies,
): CaseStudy | undefined {
  const key = dossier.slug.toLowerCase();
  return studies.find((s) => s.slug.toLowerCase() === key);
}

/** The contribution buckets, in the §17.8 template order, as label/value pairs. */
function contributionRows(
  c: HelixContribution,
): readonly (readonly [string, string])[] {
  return [
    ["Product", c.product],
    ["Technology", c.technology],
    ["Commercial", c.commercial],
    ["Operating model", c.operatingModel],
    ["Fundraising/capital", c.fundraisingCapital],
    ["Other", c.other],
  ];
}

const HTTPS_URL = /^https:\/\/\S+$/;

/**
 * Validate the dossiers against the §17.8 rules and cross-check them against the
 * live `caseStudies` model. Returns the list of problems; an empty list means
 * the dossiers are well-formed and complete. The production build treats any
 * non-empty result as fatal.
 */
export function validateCaseStudyDossiers(
  dossiers: readonly CaseStudyDossier[] = caseStudyDossiers,
  studies: readonly CaseStudy[] = caseStudies,
): string[] {
  const errors: string[] = [];

  const seen = new Set<string>();
  for (const dossier of dossiers) {
    const key = dossier.slug.toLowerCase();

    if (seen.has(key)) {
      errors.push(`Duplicate dossier for case study "${dossier.slug}".`);
    }
    seen.add(key);

    // A dossier must document a study that exists and is not a removed one.
    if (REMOVED_CASE_STUDY_SLUGS.includes(key)) {
      errors.push(
        `Dossier "${dossier.slug}" documents a removed case study and must not exist (§9.6).`,
      );
    } else if (!studyForDossier(dossier, studies)) {
      errors.push(`Dossier "${dossier.slug}" documents an unknown case study.`);
    }

    // Required narrative fields must carry content (a [RESEARCH:] marker counts —
    // it records that the research is outstanding, which is the point).
    const requiredText: readonly (readonly [string, string])[] = [
      ["planSection", dossier.planSection],
      ["whyItBelongs", dossier.whyItBelongs],
      ["engagementTimeline", dossier.engagementTimeline],
      ["startingState", dossier.startingState],
      ["endOfEngagementState", dossier.endOfEngagementState],
      ["currentState", dossier.currentState],
      ["valuationEvidence", dossier.valuationEvidence],
      ["calculation", dossier.calculation],
      ["currencyTreatment", dossier.currencyTreatment],
      ["attributionLanguage", dossier.attributionLanguage],
      ["internalSources", dossier.internalSources],
      ["assetPermissions", dossier.assetPermissions],
      ["clientApprovalNote", dossier.clientApprovalNote],
      ["risksOrProhibitedWording", dossier.risksOrProhibitedWording],
      ["approvalRecord", dossier.approvalRecord],
    ];
    for (const [field, value] of requiredText) {
      if (!value.trim()) {
        errors.push(`Dossier "${dossier.slug}" is missing "${field}".`);
      }
    }

    // Every Helix-contribution bucket must be filled (§8.5 question 3).
    for (const [label, value] of contributionRows(dossier.contribution)) {
      if (!value.trim()) {
        errors.push(
          `Dossier "${dossier.slug}" is missing the "${label}" contribution.`,
        );
      }
    }

    // Public sources must be HTTPS URLs; an empty list is allowed (some studies
    // have only internal evidence), but a malformed URL is not.
    for (const url of dossier.publicSources) {
      if (!HTTPS_URL.test(url)) {
        errors.push(
          `Dossier "${dossier.slug}" has a public source that is not an HTTPS URL: "${url}".`,
        );
      }
    }
  }

  // Every required study must have a dossier (§17.8).
  for (const slug of REQUIRED_CASE_STUDY_SLUGS) {
    if (!dossierForStudy(slug, dossiers)) {
      errors.push(`Required case study "${slug}" has no research dossier (§17.8).`);
    }
  }

  // The R-007 gate: dependent copy may not be finalised until the dossier exists,
  // so a *published* study with no dossier fails the build.
  for (const study of studies) {
    if (study.publish && !dossierForStudy(study.slug, dossiers)) {
      errors.push(
        `Case study "${study.slug}" is published but has no research dossier (§17.8 gate).`,
      );
    }
  }

  return errors;
}

/**
 * Assert the dossiers are valid and complete, throwing on failure. Intended for
 * build time so a missing or malformed dossier fails the production build.
 */
export function assertCaseStudyDossiersValid(
  dossiers: readonly CaseStudyDossier[] = caseStudyDossiers,
  studies: readonly CaseStudy[] = caseStudies,
): void {
  const errors = validateCaseStudyDossiers(dossiers, studies);
  if (errors.length > 0) {
    throw new Error(
      `Invalid case-study dossiers:\n- ${errors.join("\n- ")}`,
    );
  }
}

/** Comment written into each generated dossier to discourage hand-edits. */
const DOSSIER_DOC_COMMENT =
  "<!-- Generated from src/config/caseStudyDossiers.ts — do not edit by hand. -->";

/** Render a claim's id and lifecycle status as a readable bullet. */
function claimBullet(claim: ClaimRecord): string {
  return `- \`${claim.id}\` — ${claim.metricType} (${claim.publishStatus}, tracked by ${claim.queueItem})`;
}

/**
 * Render the exact markdown of a study's dossier (§17.8 template), generated from
 * this model rather than hand-maintained. The study name, proposed public claim,
 * draft copy, and backing claim IDs are derived from the live `caseStudies` /
 * `claimsLedger` models so the dossier cannot drift from the copy. Ends with a
 * trailing newline. Falls back to the slug when no live study exists (a state the
 * validator already flags as an error).
 */
export function renderDossierMarkdown(
  dossier: CaseStudyDossier,
  studies: readonly CaseStudy[] = caseStudies,
): string {
  const study = studyForDossier(dossier, studies);
  const name = study?.name ?? dossier.slug;
  const proposedClaim = study?.outcomeHeadline ?? "[RESEARCH: proposed public claim]";
  const draftCopy = study?.summary ?? "[RESEARCH: draft copy]";
  const stage = study ? stageLabel(study.engagementStage) : "[RESEARCH: stage]";
  const claims = claimsForCaseStudy(dossier.slug);

  const sources =
    dossier.publicSources.length > 0
      ? dossier.publicSources.map((url) => `- ${url}`).join("\n")
      : "None documented — internal evidence only.";

  const claimList =
    claims.length > 0
      ? claims.map(claimBullet).join("\n")
      : "None — no ledger claim references this study yet.";

  const contribution = contributionRows(dossier.contribution)
    .map(([label, value]) => `- ${label}: ${value}`)
    .join("\n");

  const lines: string[] = [
    `# ${name}`,
    "",
    DOSSIER_DOC_COMMENT,
    "",
    `**Plan references:** ${dossier.planSection} (research direction), §17.8 R-007.`,
    `**Formative stage:** ${stage}.`,
    "",
    "## Proposed public claim",
    "",
    proposedClaim,
    "",
    "## Why this case belongs on the site",
    "",
    dossier.whyItBelongs,
    "",
    "## Engagement timeline",
    "",
    dossier.engagementTimeline,
    "",
    "## Starting state",
    "",
    dossier.startingState,
    "",
    "## End-of-engagement state",
    "",
    dossier.endOfEngagementState,
    "",
    "## Current state",
    "",
    dossier.currentState,
    "",
    "## Helix contribution",
    "",
    contribution,
    "",
    "## Valuation or value evidence",
    "",
    dossier.valuationEvidence,
    "",
    "## Backing claim IDs",
    "",
    claimList,
    "",
    "## Calculation",
    "",
    dossier.calculation,
    "",
    "## Currency treatment",
    "",
    dossier.currencyTreatment,
    "",
    "## Attribution language",
    "",
    dossier.attributionLanguage,
    "",
    "## Public sources",
    "",
    sources,
    "",
    "## Internal sources",
    "",
    "Reference secure document IDs or locations. Do not commit sensitive source files.",
    "",
    dossier.internalSources,
    "",
    "## Asset permissions",
    "",
    dossier.assetPermissions,
    "",
    "## Client approval",
    "",
    dossier.clientApprovalNote,
    "",
    "## Risks or prohibited wording",
    "",
    dossier.risksOrProhibitedWording,
    "",
    "## Draft copy",
    "",
    draftCopy,
    "",
    "## Approval record",
    "",
    dossier.approvalRecord,
  ];

  return lines.join("\n") + "\n";
}
