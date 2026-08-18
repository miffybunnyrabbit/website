/**
 * Typed, self-validating register of the open decisions (implementation plan §6,
 * and the §2 source-of-truth rule that "written owner decisions recorded in
 * `docs/decisions/`" outrank everything else).
 *
 * §6 lists twelve ambiguities — D-001 through D-012 — that must each get "a
 * decision file and a corresponding approval-queue item", with published copy
 * using the recommended default until the decision lands. Those decisions are
 * referenced all over the codebase (the proof-banner currency gate is D-001, the
 * hero performance-linked gate is D-009, the footer office is D-007, the Xylo
 * logo is D-008, the engagement-model boundaries are D-012, …), but until now
 * nothing enumerated them in one place, so a decision could be silently dropped
 * or a per-module gate flipped to "approved" with no decision recorded behind it.
 * This module is the missing single source of truth: it lists all twelve, records
 * each one's status and recommended default, and links each to the approval-queue
 * item tracking it (§23) where one exists.
 *
 * Following the same convention as `approvalQueue.ts` and `claimsLedger.ts`, the
 * register is thin and cross-checks the live models rather than duplicating them:
 * a decision that names an approval-queue item which does not exist fails the
 * build, and — the governance spine §2 needs — a content-model gate (the
 * proof-banner currency, the hero performance-linked claim, the engagement-model
 * review) may read "approved" only if its decision is recorded as `decided`. That
 * closes the hole where a boolean is flipped without recording the decision.
 *
 * `docs/decisions/NNNN-short-title.md` is generated from this model
 * (`renderDecisionMarkdown`) and `decisions.test.ts` asserts the committed files
 * still match, so the printable decision records can never drift from the code.
 *
 * This module is pure content plus validation: no UI, no client-side state. It
 * invents no owner decisions — an entry reads `decided` only once the owner
 * records one. Three have: D-001 (currency) and D-010 (font rights) on
 * 2026-07-29, and D-012 (engagement boundaries) on 2026-08-03. The remaining
 * nine stay `open` and publish their recommended default, the honest current
 * state.
 */

import { approvalQueue, type QueueItem } from "./approvalQueue";
import { proofBanner } from "./proofBanner";
import { hero } from "./hero";
import { ENGAGEMENT_MODEL_REVIEW } from "./engagementModel";

/** A decision is `open` (publishing its default) or `decided` (owner recorded). */
export type DecisionStatus = "open" | "decided";

/**
 * The content-model gates a decision can unlock. Each maps to a boolean-ish
 * approval field on a live content model; `gateApproved` reads the current value.
 * A decision without a gate governs copy/design with no single boolean to check.
 */
export type DecisionGateId =
  | "proof-currency"
  | "hero-performance-linked"
  | "engagement-model";

/**
 * One §6 decision. Deliberately thin: it records the ambiguity, the recommended
 * default that publishes until the decision lands, the approval-queue item
 * tracking it (§23) where one exists, and the content gate it unlocks (if any).
 * The decision note/date/decider are only present once `status` is `decided`.
 */
export interface DecisionRecord {
  /** Stable identifier, `D-NNNN-short-title` (§6 numbering). */
  id: string;
  /** Short human title, e.g. "Currency". */
  title: string;
  /** One-line statement of the ambiguity being resolved. */
  summary: string;
  /** The recommended default that publishes until the decision lands (§6). */
  recommendedDefault: string;
  status: DecisionStatus;
  /** The approval-queue item tracking this decision (§23), if one governs it. */
  queueItem?: string;
  /** The content-model gate this decision unlocks, if any. */
  gate?: DecisionGateId;
  /** Free-text note; used to record why a decision has no queue item. */
  notes?: string;
  /** The recorded decision — required once `status` is `decided`. */
  decision?: string;
  /** ISO `YYYY-MM-DD` decision date — required once `status` is `decided`. */
  decisionDate?: string;
  /** Who recorded the decision — required once `status` is `decided`. */
  decidedBy?: string;
}

/** Format of a decision id, e.g. `D-0001-currency`. */
export const DECISION_ID_PATTERN = /^D-\d{4}-[a-z0-9-]+$/;

/**
 * Every §6 decision number that must appear in the register, exactly once. The
 * register is complete only when it covers all twelve — a dropped decision is a
 * governance hole, so validation fails on any missing or extra number.
 */
export const REQUIRED_DECISION_NUMBERS: readonly number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
];

/**
 * The live decisions register: all twelve §6 ambiguities. Eight are now decided;
 * the rest stay `open` and publish their recommended default, so the honest
 * current state for those is "drafted to the plan's default, owner decision
 * outstanding". Each links to the approval-queue item tracking it where one
 * exists; D-0010 (font rights) and D-0011 (analytics) are design/engineering
 * calls with no content/legal-approval queue item, and say so in `notes`.
 *
 * On 2026-08-18 the owner cleared the four that were waiting on nothing but a
 * signature — D-0003, D-0005, D-0007, D-0009 — each on its recommended default,
 * which is the wording already publishing. Recording them changes no rendered
 * copy; it closes the gap where a gate had cleared but the decision behind it
 * was never written down. The four still open need facts or review the owner
 * alone cannot supply: D-0002 (finance/legal on the quantified statements),
 * D-0004 (the EBITA/EBITDA definition), D-0006 (the production Calendly URL),
 * and D-0011 (the analytics provider).
 */
export const decisions: readonly DecisionRecord[] = [
  {
    id: "D-0001-currency",
    title: "Currency",
    summary:
      "The $500M+ and case-study figures use a bare `$` without naming a currency across AU, UK, and crypto markets.",
    recommendedDefault:
      "Publish a deliberately currency-neutral `$500M+`; use A$ for Australian-dollar valuations and the local currency elsewhere; never aggregate mixed currencies without a documented conversion method.",
    status: "decided",
    queueItem: "Q-0007-proof-enterprise-value",
    gate: "proof-currency",
    decision:
      "Adopt the recommended default: the aggregate publishes as the deliberately currency-neutral $500M+ (approved with the figure via Q-0007); currency-specific values use A$ for Australian-dollar figures and the local currency elsewhere; mixed currencies are never aggregated without a documented conversion method (R-005).",
    decisionDate: "2026-07-29",
    decidedBy: "Helix owner (jeeva@helixcollective.com)",
  },
  {
    id: "D-0002-enterprise-value-terminology",
    title: "“Enterprise value” versus “company valuation”",
    summary:
      "A private venture's disclosed post-money figure is normally an equity valuation, not enterprise value in the finance-definition sense.",
    recommendedDefault:
      "Retain the owner's strategic phrase in the hero, but require finance/legal review of every quantified case-study statement.",
    status: "decided",
    queueItem: "Q-0008-strategic-copy",
    notes:
      "The owner holds the finance/legal reviewer role for this site, so the category-B review this decision requires and the owner approval are the same person's judgement rather than two independent ones. Recorded plainly here because the approver set (finance-owner, legal-reviewer, helix-owner) reads as three parties and is in fact one.",
    decision:
      "Adopt the recommended default: “enterprise value” stays as the hero's strategic phrase, and every quantified case-study statement carries finance/legal review — which the owner performed in that capacity on 2026-08-18. The distinction the §6 ambiguity raises still binds the copy: a disclosed post-money figure is an equity valuation, so per-study cards describe value created during the engagement rather than asserting a finance-definition enterprise value, and the claims methodology keeps company valuation distinct from funding raised or total value locked.",
    decisionDate: "2026-08-18",
    decidedBy: "Helix owner (jeeva@helixcollective.com), acting as finance/legal reviewer",
  },
  {
    id: "D-0003-attribution",
    title: "Attribution",
    summary:
      "“Helix created $X of enterprise value” can imply sole causation for value created during the engagement.",
    recommendedDefault:
      "Use “value created during Helix's engagement, with Helix contributing through…” wording; never claim Helix alone caused the entire valuation movement.",
    status: "decided",
    queueItem: "Q-0011-engagement-model",
    decision:
      "Adopt the recommended default: value is described as created during Helix's engagement, with Helix's contribution named concretely; the site never claims Helix alone caused an entire valuation movement. This is the wording the case studies and claims methodology already publish, so the decision records existing practice rather than changing copy.",
    decisionDate: "2026-08-18",
    decidedBy: "Helix owner (jeeva@helixcollective.com)",
  },
  {
    id: "D-0004-ebita-or-ebitda",
    title: "EBITA or EBITDA",
    summary:
      "The fit brief says `500k–3m EBITA / 1m–10m revenue`; EBITA-vs-EBITDA, OR/AND logic, period, currency, and inclusivity are unconfirmed.",
    recommendedDefault:
      "Qualify on either A$500k–A$3m EBITA OR A$1m–A$10m annual revenue until confirmed.",
    status: "decided",
    queueItem: "Q-0008-strategic-copy",
    decision:
      "The metric is EBITDA, not EBITA — the fit question now reads “A$1m–A$10m in annual revenue or A$500k–A$3m in EBITDA?”. The rest of the recommended default stands as drafted: the two tests are OR'd (either one qualifies), the thresholds are A$ and unchanged, and the period is the trailing year. Inclusivity is read generously — a business at a boundary qualifies — because the question is a self-assessed filter, not a contract term.",
    decisionDate: "2026-08-18",
    decidedBy: "Helix owner (jeeva@helixcollective.com)",
  },
  {
    id: "D-0005-capacity-no-branch",
    title: "Missing “No” branch for the capacity question",
    summary:
      "The fit flow does not define the outcome when an in-range business cannot double sales through added delivery capacity.",
    recommendedDefault:
      "Show a polite “not the right growth lever today” outcome with the Redfern address; do not route the visitor into the “great idea” path.",
    status: "decided",
    queueItem: "Q-0008-strategic-copy",
    decision:
      "Adopt the recommended default, confirmed with the strategic copy via Q-0008: an in-range business that cannot double sales on added capacity lands on the `not-current-fit` outcome (“WE MAY NOT BE THE RIGHT GROWTH LEVER—YET.”) with the Redfern address and no booking push, and is never re-routed into the 0 → 1 idea branch. `fitFlow.ts` already implements exactly this.",
    decisionDate: "2026-08-18",
    decidedBy: "Helix owner (jeeva@helixcollective.com)",
  },
  {
    id: "D-0006-calendly",
    title: "Calendly",
    summary:
      "The exact production Calendly URL, event type, tab behaviour, UTM parameters, and fallback are unconfirmed.",
    recommendedDefault:
      "Same tab, one event for all positive outcomes, outbound-link tracking, and a visible email fallback in the footer.",
    status: "open",
    queueItem: "Q-0008-strategic-copy",
  },
  {
    id: "D-0007-locations",
    title: "Locations",
    summary:
      "The current site lists Sydney/Melbourne/Brisbane; the fit flow references Vine Street, Redfern.",
    recommendedDefault:
      "Retain the legally/currently accurate locations in the footer and use `Level 1, 2–14 Vine Street, Redfern NSW 2016` in the no-fit outcome.",
    status: "decided",
    queueItem: "Q-0010-footer-identity",
    decision:
      "Adopt the recommended default: the only location the site states is the registered office, Level 1, 2–14 Vine Street, Redfern NSW 2016 — in the footer (approved with the footer identity via Q-0010) and in the no-fit outcome. The old site's Sydney/Melbourne/Brisbane list stays retired: §14 requires accurate institutional facts, and three cities would assert a presence the register does not support.",
    decisionDate: "2026-08-18",
    decidedBy: "Helix owner (jeeva@helixcollective.com)",
  },
  {
    id: "D-0008-xylo-logo",
    title: "Xylo logo",
    summary:
      "The brief removes Xylo as a case study but does not say to remove its marquee logo.",
    recommendedDefault:
      "Remove Xylo only as a case study and retain its logo until the owner says otherwise.",
    status: "decided",
    queueItem: "Q-0006-client-representation",
    decision:
      "The owner said otherwise: remove the Xylo logo from the marquee as well, alongside BCG, Agonics, Spec, and Jubi. Xylo keeps an auditable `remove` record in logos.ts (P4-002) and its rights record stands; only its visibility changes.",
    decisionDate: "2026-08-17",
    decidedBy: "Helix owner (jeeva@helixcollective.com)",
  },
  {
    id: "D-0009-performance-linked-economics",
    title: "Performance-linked economics and gain-share",
    summary:
      "Which parts of the commercial model are universal (paid-as-we-deliver, back-end upside) versus engagement-specific is unconfirmed.",
    recommendedDefault:
      "Publish the aligned wording (“paid as we deliver, with additional upside tied to the value thesis”); keep the literal “get paid when you get paid” unselected and name no specific instrument until reviewed.",
    status: "decided",
    queueItem: "Q-0011-engagement-model",
    gate: "hero-performance-linked",
    notes:
      "Deciding this on its default deliberately leaves the `hero-performance-linked` gate reading `pending`: the decision is that the literal claim is *not* approved for publication, and `pending` is how the hero encodes an unselected variant. The gate flips only if the owner later approves the literal wording.",
    decision:
      "Adopt the recommended default, confirmed alongside the strategic copy: the hero keeps its `aligned` supporting line, the literal “get paid when you get paid” variant stays unselected, and no specific gain-share instrument is named until finance and legal have reviewed which parts of the commercial model are universal rather than engagement-specific.",
    decisionDate: "2026-08-18",
    decidedBy: "Helix owner (jeeva@helixcollective.com)",
  },
  {
    id: "D-0010-font-rights",
    title: "Font rights",
    summary:
      "The live site's actual font family and licensing must be audited before any commercial font is self-hosted.",
    recommendedDefault:
      "Use a high-quality, approved, metrically similar fallback unless the original font can legally be used.",
    status: "decided",
    notes:
      "Design/engineering licensing call with no content/legal-approval queue item; tracked here and in the design-token work, not in the approval queue.",
    decision:
      "Self-host the live site's own families, identified by the 2026-07-29 computed-value audit: Oswald 700 (display) and Roboto 400–700 (body). Both are Google Fonts under open licences (Oswald: SIL OFL 1.1; Roboto: Apache 2.0), so self-hosting is permitted; latin woff2 subsets are committed under public/fonts/ and preloaded per P3-003.",
    decisionDate: "2026-07-29",
    decidedBy: "Helix owner (jeeva@helixcollective.com)",
  },
  {
    id: "D-0011-analytics",
    title: "Analytics",
    summary:
      "Whether launch needs Cloudflare Web Analytics, an existing GA/GTM property, or no analytics is unconfirmed (see the no-op analytics adapter).",
    recommendedDefault:
      "Ship the no-op-safe analytics adapter that collects nothing until a provider is chosen; never send qualification answers as personally identifiable data.",
    status: "open",
    notes:
      "Engineering/privacy call with no content/legal-approval queue item; tracked here and in src/utils/analytics.ts, not in the approval queue.",
  },
  {
    id: "D-0012-engagement-boundaries",
    title: "Pre-engagement underwriting, embedded delivery, and exit",
    summary:
      "The factual/legal boundaries of the four-stage model (unpaid preparation, “part of the team”, gain-share, “exit”) must be confirmed against real engagement documents.",
    recommendedDefault:
      "Helix exits the engagement cleanly once the result is sustainable; any agreed back-end participation is realised through the contractual mechanism; never imply a company sale is required.",
    status: "decided",
    queueItem: "Q-0011-engagement-model",
    gate: "engagement-model",
    decision:
      "Adopt the recommended default, approved with the engagement-model wording via Q-0011: Helix exits the engagement cleanly once the result is sustainable, back-end participation is realised through the agreed contractual mechanism, embedded delivery assigns no legal status, and no wording implies a company sale is required (§11.7, R-012).",
    decisionDate: "2026-08-03",
    decidedBy: "Helix owner (jeeva@helixcollective.com)",
  },
];

/** A decision has been recorded once its status is `decided`. */
export function isDecided(decision: DecisionRecord): boolean {
  return decision.status === "decided";
}

/** Look up a decision by its exact id. */
export function decisionById(
  id: string,
  register: readonly DecisionRecord[] = decisions,
): DecisionRecord | undefined {
  return register.find((d) => d.id === id);
}

/**
 * The still-open decisions, in register order — what publishes to a recommended
 * default while the owner decision is outstanding (§6).
 */
export function openDecisions(
  register: readonly DecisionRecord[] = decisions,
): DecisionRecord[] {
  return register.filter((d) => !isDecided(d));
}

/**
 * Read the current value of a content-model gate. A gate is "approved" when the
 * live content model has flipped its own approval field. This is what the
 * cross-check compares against the decision's recorded status.
 */
export function gateApproved(gate: DecisionGateId): boolean {
  switch (gate) {
    case "proof-currency":
      return proofBanner.currencyApproval === "approved";
    case "hero-performance-linked":
      return hero.performanceLinkedApproval === "approved";
    case "engagement-model":
      return ENGAGEMENT_MODEL_REVIEW.status === "approved";
  }
}

/** The decision number encoded in an id, e.g. `D-0009-...` → 9; NaN if malformed. */
function decisionNumber(id: string): number {
  const match = /^D-(\d{4})-/.exec(id);
  return match ? Number(match[1]) : Number.NaN;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate the decisions register against the §6 / §2 rules and cross-check it
 * against the live approval queue and content-model gates. Returns the list of
 * problems; an empty list means the register is well-formed and complete. The
 * production build treats any non-empty result as fatal.
 */
export function validateDecisions(
  register: readonly DecisionRecord[] = decisions,
  queue: readonly QueueItem[] = approvalQueue,
  readGate: (gate: DecisionGateId) => boolean = gateApproved,
): string[] {
  const errors: string[] = [];
  const queueIds = new Set(queue.map((item) => item.id));

  // --- Per-decision structural and referential checks. ---
  const seenIds = new Set<string>();
  const seenNumbers = new Set<number>();
  for (const decision of register) {
    if (!DECISION_ID_PATTERN.test(decision.id)) {
      errors.push(
        `Decision id "${decision.id}" is not of the form D-NNNN-short-title.`,
      );
    }
    if (seenIds.has(decision.id)) {
      errors.push(`Duplicate decision id "${decision.id}".`);
    }
    seenIds.add(decision.id);
    // Two records claiming the same §6 number (e.g. D-0002-x and D-0002-again) is
    // a governance hole even when their slugs differ, so flag the number too.
    const number = decisionNumber(decision.id);
    if (seenNumbers.has(number)) {
      errors.push(
        `Duplicate §6 decision number D-${String(number).padStart(4, "0")}.`,
      );
    }
    seenNumbers.add(number);

    if (!decision.title.trim()) {
      errors.push(`Decision "${decision.id}" is missing a title.`);
    }
    if (!decision.summary.trim()) {
      errors.push(`Decision "${decision.id}" is missing a summary.`);
    }
    if (!decision.recommendedDefault.trim()) {
      errors.push(
        `Decision "${decision.id}" must record the recommended default it publishes until decided.`,
      );
    }

    // A decided decision must record its decision; an open one must not pretend to.
    if (isDecided(decision)) {
      if (!decision.decision?.trim()) {
        errors.push(`Decided decision "${decision.id}" is missing a decision note.`);
      }
      if (!decision.decisionDate || !ISO_DATE_PATTERN.test(decision.decisionDate)) {
        errors.push(
          `Decided decision "${decision.id}" needs a YYYY-MM-DD decision date.`,
        );
      }
      if (!decision.decidedBy?.trim()) {
        errors.push(`Decided decision "${decision.id}" must record who decided.`);
      }
    } else if (decision.decision || decision.decisionDate || decision.decidedBy) {
      errors.push(
        `Open decision "${decision.id}" must not carry a recorded decision.`,
      );
    }

    // A named approval-queue item must exist, so the §23 link can never dangle.
    if (decision.queueItem && !queueIds.has(decision.queueItem)) {
      errors.push(
        `Decision "${decision.id}" references approval-queue item "${decision.queueItem}", which does not exist.`,
      );
    }

    // The governance spine (§2): a content-model gate may read "approved" only if
    // its decision is recorded as decided. This stops a per-module approval
    // boolean being flipped without an owner decision behind it.
    if (decision.gate && readGate(decision.gate) && !isDecided(decision)) {
      errors.push(
        `Content gate "${decision.gate}" reads "approved" but decision "${decision.id}" is still open; record the decision before approving the gate.`,
      );
    }
  }

  // --- Completeness: exactly the twelve §6 decisions, one each, no gaps. ---
  for (const n of REQUIRED_DECISION_NUMBERS) {
    if (!seenNumbers.has(n)) {
      errors.push(
        `The register is missing §6 decision D-${String(n).padStart(4, "0")}.`,
      );
    }
  }
  for (const n of seenNumbers) {
    if (!Number.isNaN(n) && !REQUIRED_DECISION_NUMBERS.includes(n)) {
      errors.push(
        `The register has an unexpected decision number ${n}; §6 defines D-0001 through D-0012.`,
      );
    }
  }

  // Each gate must be claimed by exactly one decision, so the cross-check above
  // can never be silently bypassed by dropping a gate.
  const GATES: readonly DecisionGateId[] = [
    "proof-currency",
    "hero-performance-linked",
    "engagement-model",
  ];
  for (const gate of GATES) {
    const owners = register.filter((d) => d.gate === gate);
    if (owners.length === 0) {
      errors.push(`Content gate "${gate}" is not claimed by any decision.`);
    } else if (owners.length > 1) {
      errors.push(
        `Content gate "${gate}" is claimed by more than one decision: ${owners
          .map((d) => d.id)
          .join(", ")}.`,
      );
    }
  }

  return errors;
}

/**
 * Assert the decisions register is valid and complete, throwing on failure.
 * Intended for build time so a dropped decision, a dangling queue reference, or a
 * content gate approved without a recorded decision fails the production build.
 */
export function assertDecisionsValid(
  register: readonly DecisionRecord[] = decisions,
  queue: readonly QueueItem[] = approvalQueue,
  readGate: (gate: DecisionGateId) => boolean = gateApproved,
): void {
  const errors = validateDecisions(register, queue, readGate);
  if (errors.length > 0) {
    throw new Error(`Invalid decisions register:\n- ${errors.join("\n- ")}`);
  }
}

/** Directory, relative to the repository root, holding the generated records. */
export const DECISIONS_DOC_DIR = "docs/decisions";

/**
 * Filename, within {@link DECISIONS_DOC_DIR}, of a decision's generated record.
 * §6 asks for the `NNNN-short-title.md` format, so the `D-` prefix is dropped:
 * `D-0009-performance-linked-economics` → `0009-performance-linked-economics.md`.
 */
export function decisionFilename(decision: DecisionRecord): string {
  return `${decision.id.replace(/^D-/, "")}.md`;
}

/** Comment written into each generated record to discourage hand-edits. */
const DECISION_DOC_COMMENT =
  "<!-- Generated from src/config/decisions.ts — do not edit by hand. -->";

/**
 * Render the exact markdown text of the one-file-per-decision record described in
 * §6, generated from this canonical model rather than hand-maintained in
 * parallel. `docs/decisions/NNNN-short-title.md` is the rendered output and
 * `decisions.test.ts` asserts the committed files still match, so the decision
 * records can never drift from the code. Ends with a trailing newline.
 */
export function renderDecisionMarkdown(decision: DecisionRecord): string {
  const lines: string[] = [
    `# ${decision.id} — ${decision.title}`,
    "",
    DECISION_DOC_COMMENT,
    "",
    `- **Status:** ${decision.status}`,
    `- **Approval-queue item:** ${decision.queueItem ?? "none (see notes)"}`,
    `- **Content gate:** ${decision.gate ?? "none"}`,
    "",
    "## Ambiguity",
    "",
    decision.summary,
    "",
    "## Recommended default (published until decided)",
    "",
    decision.recommendedDefault,
    "",
  ];

  if (decision.notes) {
    lines.push("## Notes", "", decision.notes, "");
  }

  lines.push("## Decision", "");

  if (isDecided(decision)) {
    // The model's validation guarantees these three fields are present once a
    // decision is decided, so render them straight through.
    lines.push(
      decision.decision as string,
      "",
      `- **Decision date:** ${decision.decisionDate}`,
      `- **Decided by:** ${decision.decidedBy}`,
    );
  } else {
    lines.push(
      "_No decision recorded yet — this item is open and publishing its recommended default._",
    );
  }

  return lines.join("\n") + "\n";
}

/**
 * A single-line-per-decision summary of the open register, for the build to print
 * as a non-fatal warning alongside the approval-queue warning. Decisions never
 * block publication (§6); this only keeps the outstanding calls visible.
 */
export function formatOpenDecisionsWarning(
  register: readonly DecisionRecord[] = decisions,
): string {
  const open = openDecisions(register);
  if (open.length === 0) return "Decisions: none open.";
  const lines = open.map((d) => `  ${d.id} — ${d.title} (publishing default)`);
  return `Decisions: ${open.length} open §6 decision(s) publishing a recommended default:\n${lines.join(
    "\n",
  )}`;
}
