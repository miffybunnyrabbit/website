/**
 * Typed, self-validating claims methodology (implementation plan §17.6 R-005,
 * output `docs/research/claims-methodology.md`).
 *
 * R-005 is the finance-lead-plus-copywriter document that defines what every
 * quantified claim on the site *means* before any figure is published: what
 * "enterprise value created" is, the attribution standard, currency treatment,
 * the valuation-date convention, how a multiple is calculated, how debt/cash/
 * funding are treated, whether a current post-engagement value may be cited,
 * what counts toward the `$500M+` headline, how double counting is prevented,
 * and the minimum evidence a figure needs to publish as approved. The plan makes
 * it a prerequisite for the ledger and the case-study copy (§27 item 6: "Create
 * the claims methodology and claims ledger before final case-study copy is
 * written"; Phase 1 priority #4, ahead of the ledger at #5).
 *
 * The ledger (`claimsLedger.ts`, R-006) shipped referencing "§17.6 claims
 * methodology" in its `ClaimMetricType` doc-comment, but the methodology it
 * points at did not exist — so a claim's `metricType` had no defined meaning and
 * the ledger's `calculation` column had nothing to derive from. This module is
 * that missing source of truth.
 *
 * Following the same convention as `engagementModel.ts` / `decisions.ts`, it is
 * thin, pure content plus validation: it renders no UI and invents no verified
 * figures. What it *adds* is a governance spine — the ten R-005 definitions as
 * structured data, a glossary defining every metric type the ledger uses, and
 * build-time cross-checks that (a) each definition whose open question is an §6
 * ambiguity links to the real decision that resolves it, and (b) every metric
 * type the live ledger asserts has a methodology definition behind it. A new
 * ledger metric type with no methodology basis, or a definition pointing at a
 * decision that does not exist, fails the build.
 *
 * `docs/research/claims-methodology.md` is generated from this model
 * (`renderClaimsMethodologyDoc`) and `claimsMethodology.test.ts` asserts the
 * committed file still matches, so the printable R-005 record cannot drift from
 * the code.
 */

import { claimsLedger, type ClaimMetricType, type ClaimRecord } from "./claimsLedger";
import { decisions, type DecisionRecord } from "./decisions";

/** Where the generated record lives, for the rendered header. */
export const CLAIMS_METHODOLOGY_DOC_PATH = "docs/research/claims-methodology.md";

/**
 * The ten R-005 topics the methodology must define, in a fixed order. Together
 * they cover the full §17.6 list; validation fails on a missing, extra, or
 * reordered topic so the definitional basis can never lose a rule.
 */
export type MethodologyTopicId =
  | "enterprise-value-definition"
  | "attribution-standard"
  | "currency-treatment"
  | "valuation-date-convention"
  | "multiple-calculation"
  | "debt-cash-and-funding"
  | "current-value-citation"
  | "portfolio-headline-inclusion"
  | "double-counting-prevention"
  | "minimum-evidence";

/**
 * One methodology definition. `definition` is the authoritative rule the ledger
 * and case-study copy must conform to. `governingDecision`, where present, is the
 * §6 decision id whose open ambiguity this rule resolves (e.g. currency treatment
 * is D-001), so the rule and the owner decision behind it stay linked.
 */
export interface MethodologyDefinition {
  id: MethodologyTopicId;
  /** Human heading for the rule. */
  title: string;
  /** The authoritative rule every quantified claim must conform to. */
  definition: string;
  /** The §6 decision id that resolves this rule's open question, if any. */
  governingDecision?: string;
}

/**
 * A glossary entry for one claim metric type. Every `ClaimMetricType` the ledger
 * uses must have one, so a `metricType` on a ledger claim always resolves to a
 * defined meaning and calculation basis.
 */
export interface MetricTypeDefinition {
  metricType: ClaimMetricType;
  /** Human label, e.g. "Enterprise value created". */
  label: string;
  /** What the quantity means. */
  meaning: string;
  /** How it is calculated, consistent with the definitions above. */
  calculation: string;
}

/**
 * The methodology's review state. Like every pending content model, the
 * methodology publishes as the plan's working baseline now; its *application* to
 * each figure is signed off through the category-B claim queue items the claims
 * ledger already tracks (Q-0001..Q-0005, Q-0007), so no separate queue item is
 * invented. The honest state is "documented baseline, per-figure sign-off
 * outstanding".
 */
export const CLAIMS_METHODOLOGY_REVIEW = {
  status: "pending" as "pending" | "approved",
} as const;

/**
 * The documented methodology, one entry per R-005 topic in a fixed order. The
 * wording is the plan's working baseline: it stays instrument- and
 * currency-neutral where §6 leaves the question open, and links each rule to the
 * decision that resolves it.
 */
export const methodologyDefinitions: readonly MethodologyDefinition[] = [
  {
    id: "enterprise-value-definition",
    title: "What “enterprise value created” means",
    definition:
      "Helix retains the strategic phrase “enterprise value” in the hero, but every quantified case-study statement is reviewed by finance and legal before publication. Where a disclosed figure is an equity or post-money valuation rather than enterprise value in the strict finance sense, the ledger records which measure the figure is and the copy uses “value” or “company value” rather than asserting enterprise value.",
    governingDecision: "D-0002-enterprise-value-terminology",
  },
  {
    id: "attribution-standard",
    title: "Attribution standard",
    definition:
      "Claims are phrased as “value created during Helix’s engagement, with Helix contributing through…” and never as “Helix created $X” implying sole causation. The defensible claim is bounded to the engagement window; Helix is never credited with the entire valuation movement unless the evidence supports that.",
    governingDecision: "D-0003-attribution",
  },
  {
    id: "currency-treatment",
    title: "Currency treatment",
    definition:
      "The $500M+ headline publishes deliberately currency-neutral. A case-study figure uses A$ where it is an Australian-dollar valuation and the actual local currency where the source is in another currency. Mixed currencies are never aggregated into a single figure without a documented conversion rate and its date.",
    governingDecision: "D-0001-currency",
  },
  {
    id: "valuation-date-convention",
    title: "Valuation-date convention",
    definition:
      "Every figure records the date and source of the value it cites and distinguishes value at engagement start, value at end of engagement, and current value. The default measure is value created across the engagement window — entry to end-of-engagement — not value movement after Helix left.",
  },
  {
    id: "multiple-calculation",
    title: "How a multiple is calculated",
    definition:
      "A stated multiple is end-of-engagement value divided by entry value for the same measure and the same currency. The measure (equity valuation, enterprise value, or another) is recorded alongside it. A multiple never mixes measures or currencies.",
  },
  {
    id: "debt-cash-and-funding",
    title: "How debt, cash, and funding facilities are treated",
    definition:
      "Debt raised, cash, funding facilities, securitisation programmes, assets financed through a platform, and total capital deployed are not company valuation and are never presented as such (the Ferovinum guardrail, §9.2). Enterprise value is computed as equity value plus net debt only where that computation is evidenced; otherwise the copy states the measure that is actually available.",
  },
  {
    id: "current-value-citation",
    title: "Whether a current post-engagement value may be cited",
    definition:
      "A current, post-engagement valuation may be cited only as dated context, clearly separated from the engagement-window claim and never phrased to imply continuous Helix involvement after the engagement ended.",
  },
  {
    id: "portfolio-headline-inclusion",
    title: "What counts toward the $500M+ headline",
    definition:
      "A case study’s value-created figure counts toward the $500M+ headline only when it is at least internally verified, not rejected, and expressed on (or converted to) the headline’s currency basis. The headline is a sum of per-engagement value-created figures — never equity valuations, funding capacity, or assets financed.",
  },
  {
    id: "double-counting-prevention",
    title: "How double counting is prevented",
    definition:
      "Each engagement contributes its value-created figure to the headline at most once. Overlapping measures for the same company (for example a valuation and a value-created figure) are never both counted; the ledger’s one-claim-per-target rule enforces a single governed figure per piece of published copy.",
  },
  {
    id: "minimum-evidence",
    title: "Minimum evidence required for publication",
    definition:
      "No figure publishes as approved without a dated source for entry and end-of-engagement value, the measure and currency, the attribution basis, and finance, legal, and owner sign-off (approval category B). Until then the claim publishes in its best-available, tracked wording under an open approval-queue item (§20.1, §23) rather than being represented as approved.",
  },
];

/** The exact topic ids required, in the exact order (R-005 / §17.6). */
const REQUIRED_TOPIC_ORDER: readonly MethodologyTopicId[] = [
  "enterprise-value-definition",
  "attribution-standard",
  "currency-treatment",
  "valuation-date-convention",
  "multiple-calculation",
  "debt-cash-and-funding",
  "current-value-citation",
  "portfolio-headline-inclusion",
  "double-counting-prevention",
  "minimum-evidence",
];

/**
 * The glossary defining every metric type the claims ledger can assert. The
 * cross-check below requires that every `metricType` present in the live ledger
 * resolves to one of these, so a claim can never assert a quantity the
 * methodology has not defined.
 */
export const metricTypeDefinitions: readonly MetricTypeDefinition[] = [
  {
    metricType: "enterprise-value",
    label: "Enterprise value created",
    meaning:
      "The value created for a single company, subject to the enterprise-value definition and finance/legal review of the measure actually used.",
    calculation:
      "End-of-engagement value minus entry value for the agreed, recorded measure (D-002); reviewed before publication.",
  },
  {
    metricType: "value-created",
    label: "Value created during the engagement",
    meaning:
      "The value-creation figure attributed to the engagement window, phrased under the attribution standard.",
    calculation:
      "Recorded as value created during Helix’s engagement (D-003), bounded to the engagement window and not subsequent movement.",
  },
  {
    metricType: "value-multiple",
    label: "Value multiple",
    meaning: "The growth multiple in value over the engagement.",
    calculation:
      "End-of-engagement value divided by entry value for the same measure and currency (see the multiple-calculation rule).",
  },
  {
    metricType: "portfolio-enterprise-value",
    label: "Portfolio enterprise value created ($500M+)",
    meaning: "The aggregate headline figure across engagements.",
    calculation:
      "Sum of internally-verified, non-rejected per-engagement value-created figures on one currency basis, with no double counting (see the portfolio-headline-inclusion and double-counting-prevention rules).",
  },
];

const DRAFT_MARKERS: readonly string[] = [
  "[verify",
  "[research",
  "draft",
  "todo",
  "tbd",
  "placeholder",
  "lorem ipsum",
];

/** True when `text` contains any draft marker (case-insensitive). */
function hasDraftMarker(text: string): boolean {
  const lower = text.toLowerCase();
  return DRAFT_MARKERS.some((marker) => lower.includes(marker));
}

/**
 * Validate the methodology against the R-005 rules and cross-check it against the
 * live decisions register and claims ledger. Returns the list of problems; an
 * empty list means the methodology is complete and consistent. The production
 * build treats any non-empty result as fatal.
 */
export function validateClaimsMethodology(
  defs: readonly MethodologyDefinition[] = methodologyDefinitions,
  metricDefs: readonly MetricTypeDefinition[] = metricTypeDefinitions,
  register: readonly DecisionRecord[] = decisions,
  ledger: readonly ClaimRecord[] = claimsLedger,
): string[] {
  const errors: string[] = [];

  // --- Completeness: exactly the required topics, in the required order. ---
  if (defs.length !== REQUIRED_TOPIC_ORDER.length) {
    errors.push(
      `Expected exactly ${REQUIRED_TOPIC_ORDER.length} R-005 methodology topics, found ${defs.length}.`,
    );
  }
  defs.forEach((def, index) => {
    const expected = REQUIRED_TOPIC_ORDER[index];
    if (expected && def.id !== expected) {
      errors.push(`Topic ${index + 1} must be "${expected}" but is "${def.id}".`);
    }
  });

  // --- Per-definition content: present, free of draft markers, and any named
  //     decision must exist in the register so the link can never dangle. ---
  const decisionIds = new Set(register.map((d) => d.id));
  for (const def of defs) {
    if (!def.title.trim()) errors.push(`Methodology topic "${def.id}" is missing a title.`);
    if (!def.definition.trim()) {
      errors.push(`Methodology topic "${def.id}" is missing its definition (R-005).`);
    } else if (hasDraftMarker(def.definition)) {
      errors.push(`Methodology topic "${def.id}" contains a forbidden draft marker.`);
    }
    if (def.governingDecision && !decisionIds.has(def.governingDecision)) {
      errors.push(
        `Methodology topic "${def.id}" references decision "${def.governingDecision}", which is not in the decisions register.`,
      );
    }
  }

  // The three §6 ambiguities the methodology resolves must each be linked, so a
  // definition can never silently drop its governing decision.
  const GOVERNED: ReadonlyArray<[MethodologyTopicId, string]> = [
    ["enterprise-value-definition", "D-0002-enterprise-value-terminology"],
    ["attribution-standard", "D-0003-attribution"],
    ["currency-treatment", "D-0001-currency"],
  ];
  for (const [topicId, decisionId] of GOVERNED) {
    const def = defs.find((d) => d.id === topicId);
    if (def && def.governingDecision !== decisionId) {
      errors.push(
        `Methodology topic "${topicId}" must be governed by decision "${decisionId}".`,
      );
    }
  }

  // --- Metric-type glossary: well-formed, no duplicates, no draft markers. ---
  const seenMetricTypes = new Set<ClaimMetricType>();
  for (const md of metricDefs) {
    if (seenMetricTypes.has(md.metricType)) {
      errors.push(`Duplicate metric-type definition "${md.metricType}".`);
    }
    seenMetricTypes.add(md.metricType);
    if (!md.label.trim()) errors.push(`Metric type "${md.metricType}" is missing a label.`);
    if (!md.meaning.trim()) errors.push(`Metric type "${md.metricType}" is missing its meaning.`);
    if (!md.calculation.trim()) {
      errors.push(`Metric type "${md.metricType}" is missing its calculation basis.`);
    }
    const haystack = `${md.label} ${md.meaning} ${md.calculation}`;
    if (hasDraftMarker(haystack)) {
      errors.push(`Metric type "${md.metricType}" contains a forbidden draft marker.`);
    }
  }

  // --- Cross-check: every metric type the live ledger asserts must be defined
  //     here, so no published claim quantifies something the methodology has not
  //     given a meaning and calculation basis. ---
  for (const claim of ledger) {
    if (!seenMetricTypes.has(claim.metricType)) {
      errors.push(
        `Claim "${claim.id}" asserts metric type "${claim.metricType}", which the methodology does not define.`,
      );
    }
  }

  return errors;
}

/**
 * Assert the methodology is valid and complete, throwing on failure. Intended for
 * build time so an incomplete methodology, a dangling decision reference, or a
 * ledger metric type with no methodology basis fails the production build.
 */
export function assertClaimsMethodologyValid(
  defs: readonly MethodologyDefinition[] = methodologyDefinitions,
  metricDefs: readonly MetricTypeDefinition[] = metricTypeDefinitions,
  register: readonly DecisionRecord[] = decisions,
  ledger: readonly ClaimRecord[] = claimsLedger,
): void {
  const errors = validateClaimsMethodology(defs, metricDefs, register, ledger);
  if (errors.length > 0) {
    throw new Error(`Invalid claims methodology:\n- ${errors.join("\n- ")}`);
  }
}

/** Comment written into the generated doc to discourage hand-edits. */
const DOC_COMMENT =
  "<!-- Generated from src/config/claimsMethodology.ts — do not edit by hand. -->";

/**
 * Render the exact markdown text of `docs/research/claims-methodology.md` from
 * this model. `claimsMethodology.test.ts` asserts the committed file still
 * matches, so the printable R-005 record cannot drift from the code. Ends with a
 * trailing newline.
 */
export function renderClaimsMethodologyDoc(
  defs: readonly MethodologyDefinition[] = methodologyDefinitions,
  metricDefs: readonly MetricTypeDefinition[] = metricTypeDefinitions,
): string {
  const lines: string[] = [
    "# Claims methodology (R-005)",
    "",
    DOC_COMMENT,
    "",
    "**Plan references:** §15 (claims discipline), §17.6 R-005.",
    `**Review status:** ${CLAIMS_METHODOLOGY_REVIEW.status} — this document is the plan's working baseline; its application to each figure is signed off through the category-B claim approval-queue items the claims ledger tracks (Q-0001..Q-0005, Q-0007).`,
    "",
    "This record defines what every quantified claim on the site means before any",
    "figure is published. It invents no verified figures; the per-claim evidence",
    "lives in `docs/research/claims-ledger.csv`, generated from `claimsLedger.ts`.",
    "",
    "## Definitions",
    "",
  ];

  defs.forEach((def, index) => {
    lines.push(
      `### ${index + 1}. ${def.title}`,
      "",
      def.definition,
      "",
      `- **Governing decision:** ${def.governingDecision ?? "none"}`,
      "",
    );
  });

  lines.push("## Metric-type glossary", "");
  for (const md of metricDefs) {
    lines.push(
      `### \`${md.metricType}\` — ${md.label}`,
      "",
      `- **Meaning:** ${md.meaning}`,
      `- **Calculation:** ${md.calculation}`,
      "",
    );
  }

  return lines.join("\n") + "\n";
}
