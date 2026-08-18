/**
 * Typed, self-validating claims ledger (implementation plan §15/§17.7 R-006, and
 * the §20.1 rule that every published quantified claim is backed by a claim ID).
 *
 * Every visible quantified claim on the site — each case study's enterprise-value
 * figure and the portfolio `$500M+` proof figure — is a *financial* claim that
 * needs finance, legal, and owner sign-off before it is published (approval
 * category B, §23). The `caseStudies` model already carries a `claimIds` field
 * "backing every quantified statement", but until now nothing defined those IDs,
 * so a published study could cite a claim ID that resolved to nothing, to a
 * `rejected` claim, or to a claim with no open approval item tracking it. This
 * module is the missing single source of truth those IDs point at.
 *
 * Following the same convention as `approvalQueue.ts`, the ledger is thin and
 * derives its public-facing wording, currency, and headline figure from the live
 * `caseStudies` / `proofBanner` models rather than duplicating them, so the
 * ledger can never drift from the copy it governs. What it *adds* is the
 * governance spine R-006 requires: each claim's `publishStatus` and the category-B
 * approval-queue item that must clear it. Validation cross-checks all of that —
 * a claim that points at a missing case study, a non-financial or non-covering
 * queue item, or that is unapproved with no open queue item, fails the build.
 *
 * `docs/research/claims-ledger.csv` is generated from this model
 * (`renderClaimsLedgerCsv`) with the exact R-006 column set, and
 * `claimsLedger.test.ts` asserts the committed file still matches, so the
 * printable ledger can never drift from the code.
 *
 * This module is pure content plus validation: no UI, no client-side state. It
 * invents no verified figures — every value is derived from an existing draft or
 * left empty while the claim is still `researching`.
 */

import {
  caseStudies,
  REMOVED_CASE_STUDY_SLUGS,
  type CaseStudy,
  type Currency,
} from "./caseStudies";
import { proofBanner, type ProofMetricId } from "./proofBanner";
import {
  approvalQueue,
  type QueueItem,
  type QueueStatus,
} from "./approvalQueue";

/**
 * Where a claim's public wording lives: a specific case study (by slug) or a
 * proof-banner metric (by id). Exactly one target per claim, so the ledger entry
 * always resolves to a single piece of published copy.
 */
export type ClaimTarget =
  | { kind: "case-study"; slug: string }
  | { kind: "proof-metric"; ref: ProofMetricId };

/** The kind of quantity a claim asserts (§17.6 claims methodology). */
export type ClaimMetricType =
  | "enterprise-value"
  | "value-created"
  | "value-multiple"
  | "portfolio-enterprise-value";

/**
 * R-006 publish-status lifecycle. A claim may appear in a production build at any
 * status *except* `rejected`; every status other than `approved` must have an
 * open approval-queue item tracking it (§17.7).
 */
export type PublishStatus =
  | "researching"
  | "internally_verified"
  | "client_approved"
  | "approved"
  | "rejected";

/**
 * One ledger claim. Deliberately thin: it links a quantified claim to its
 * governing approval-queue item and records its lifecycle status. The
 * visitor-facing wording, currency, and headline figure are *derived* from the
 * target's live content model (see {@link claimPublicCopy} etc.), never stored
 * here, so the ledger cannot drift from the copy.
 */
export interface ClaimRecord {
  /** Stable identifier, `C-NNNN-short-title`. */
  id: string;
  /** The published copy this claim quantifies. */
  target: ClaimTarget;
  /** What kind of quantity the claim asserts. */
  metricType: ClaimMetricType;
  /** R-006 lifecycle status; anything but `rejected` may publish in draft form. */
  publishStatus: PublishStatus;
  /** The category-B approval-queue item that must clear this claim. */
  queueItem: string;
  /** Optional free-text note (never verified figures). */
  notes?: string;
}

/** Format of a claim id, e.g. `C-0001-neara-enterprise-value`. */
export const CLAIM_ID_PATTERN = /^C-\d{4}-[a-z0-9-]+$/;

/**
 * The live claims ledger. One entry per quantified claim the site drafts today:
 * each case study's enterprise-value claim plus the portfolio `$500M+` proof
 * figure. Each names the category-B queue item tracking it.
 *
 * Three figures have cleared owner review and publish (Neara, 13SICK, and the
 * portfolio `$500M+`). The other three — Ferovinum, Origami, Veyor — stay
 * `researching`: the owner's 2026-08-17 decisions on Q-0002/Q-0004/Q-0005
 * approved the *wording* those studies publish, explicitly not their figures, so
 * each claim points at Q-0012, the open item carrying the outstanding §9
 * research. A claim only ever reads `approved` once its own number has been
 * verified — never as a side effect of a neighbouring wording approval.
 */
export const claimsLedger: readonly ClaimRecord[] = [
  {
    id: "C-0001-neara-enterprise-value",
    target: { kind: "case-study", slug: "neara" },
    metricType: "enterprise-value",
    publishStatus: "approved",
    queueItem: "Q-0001-neara-valuation",
    notes: "Owner approved the 20× / A$200m figures and the A$1B+ headline via Q-0001 (2026-08-03).",
  },
  {
    id: "C-0002-ferovinum-enterprise-value",
    target: { kind: "case-study", slug: "ferovinum" },
    metricType: "enterprise-value",
    publishStatus: "approved",
    queueItem: "Q-0002-ferovinum-valuation",
    notes:
      "Owner verified the 10× / $300m figures on 2026-08-18, so the study publishes quantified under Q-0002 and no longer sits in the open Q-0012 residue. The §9.2 warning still binds the wording: the card's headline stays qualitative and no copy describes the securitisation programme as a company valuation. The currency basis is still unnamed — the figure publishes as a bare `$300m`, which D-0001 reserves for the deliberately currency-neutral portfolio aggregate; naming it GBP or USD is an outstanding owner call.",
  },
  {
    id: "C-0003-13sick-enterprise-value",
    target: { kind: "case-study", slug: "13sick" },
    metricType: "enterprise-value",
    publishStatus: "approved",
    queueItem: "Q-0003-13sick-valuation",
    notes: "Owner verified the 5× / A$100m figures behind the A$30M → A$150M headline via Q-0003 (2026-08-03).",
  },
  {
    id: "C-0004-origami-enterprise-value",
    target: { kind: "case-study", slug: "origami" },
    metricType: "enterprise-value",
    publishStatus: "researching",
    queueItem: "Q-0012-outstanding-valuation-figures",
    notes:
      "Figures and Helix contribution await internal research (§9.4). Q-0004 approved the study's wording on 2026-08-17 but not this figure, so tracking moved to the open Q-0012.",
  },
  {
    id: "C-0005-veyor-enterprise-value",
    target: { kind: "case-study", slug: "veyor" },
    metricType: "enterprise-value",
    publishStatus: "researching",
    queueItem: "Q-0012-outstanding-valuation-figures",
    notes:
      "Draft figures and Helix contribution carry [VERIFY:]/[RESEARCH:] markers (§9.5). Q-0005 approved the study's wording on 2026-08-17 but not this figure, so tracking moved to the open Q-0012.",
  },
  {
    id: "C-0006-portfolio-enterprise-value",
    target: { kind: "proof-metric", ref: "enterprise-value" },
    metricType: "portfolio-enterprise-value",
    publishStatus: "approved",
    queueItem: "Q-0007-proof-enterprise-value",
    notes:
      "Owner approved the currency-neutral $500M+ wording via Q-0007 (2026-07-29), which also settled D-001 on its currency-neutral default.",
  },
];

/** A claim is publishable when its status is anything but `rejected` (R-006). */
export function isPublishable(claim: ClaimRecord): boolean {
  return claim.publishStatus !== "rejected";
}

/** A claim's target slug (case study) — `undefined` for proof-metric claims. */
function targetSlug(claim: ClaimRecord): string | undefined {
  return claim.target.kind === "case-study" ? claim.target.slug : undefined;
}

/** Look up a claim by id (case-insensitive on the id is *not* wanted — ids are exact). */
export function claimById(
  id: string,
  ledger: readonly ClaimRecord[] = claimsLedger,
): ClaimRecord | undefined {
  return ledger.find((c) => c.id === id);
}

/** Every ledger claim backing a given case study, in ledger order. */
export function claimsForCaseStudy(
  slug: string,
  ledger: readonly ClaimRecord[] = claimsLedger,
): ClaimRecord[] {
  const key = slug.toLowerCase();
  return ledger.filter((c) => targetSlug(c)?.toLowerCase() === key);
}

/**
 * The company a claim is attributed to, derived from its target: the case
 * study's display name, or the portfolio holder for the proof figure.
 */
export function claimCompany(claim: ClaimRecord): string {
  const { target } = claim;
  if (target.kind === "case-study") {
    const study = caseStudies.find((s) => s.slug === target.slug);
    return study?.name ?? "";
  }
  return "Helix Collective (portfolio)";
}

/**
 * The visitor-facing copy a claim quantifies, derived from the live model: a case
 * study's outcome headline, or the proof metric's figure and label. Never stored,
 * so it cannot drift from the rendered site.
 */
export function claimPublicCopy(claim: ClaimRecord): string {
  const { target } = claim;
  if (target.kind === "case-study") {
    const study = caseStudies.find((s) => s.slug === target.slug);
    return study?.outcomeHeadline ?? "";
  }
  const metric = proofBanner.metrics.find((m) => m.id === target.ref);
  return metric ? `${metric.value} ${metric.label}` : "";
}

/**
 * The best-available draft figure behind a claim, derived from the live model:
 * the case study's drafted value-created (or its outcome headline as a fallback),
 * or the proof metric's figure. May still carry a `[VERIFY:]` marker while the
 * claim is `researching` — that is the honest current state, not an invention.
 */
export function claimDraftValue(claim: ClaimRecord): string {
  const { target } = claim;
  if (target.kind === "case-study") {
    const study = caseStudies.find((s) => s.slug === target.slug);
    if (!study) return "";
    return (study.valueCreated ?? "").trim() || study.outcomeHeadline;
  }
  const metric = proofBanner.metrics.find((m) => m.id === target.ref);
  return metric?.value ?? "";
}

/**
 * The currency behind a claim, derived from its target. Case studies carry their
 * own currency; the portfolio figure's currency is the open D-001 decision, so it
 * reads `undecided`.
 */
export function claimCurrency(claim: ClaimRecord): Currency {
  const { target } = claim;
  if (target.kind === "case-study") {
    const study = caseStudies.find((s) => s.slug === target.slug);
    return study?.currency ?? "undecided";
  }
  return "undecided";
}

/** The approval-queue item that governs a claim, if it exists. */
function coveringQueueItem(
  claim: ClaimRecord,
  queue: readonly QueueItem[],
): QueueItem | undefined {
  return queue.find((item) => item.id === claim.queueItem);
}

/**
 * True when `item`'s coverage includes this claim's target — a case-study slug or
 * the proof metric. This is the link that stops a claim from pointing at a real
 * queue item that governs unrelated content.
 */
function queueItemCoversClaim(item: QueueItem, claim: ClaimRecord): boolean {
  const { target } = claim;
  if (target.kind === "case-study") {
    return item.coverage.some(
      (c) =>
        c.kind === "case-study" &&
        c.ref?.toLowerCase() === target.slug.toLowerCase(),
    );
  }
  return item.coverage.some(
    (c) => c.kind === "proof-metric" && c.ref === target.ref,
  );
}

const DRAFT_MARKERS: readonly string[] = [
  "[verify",
  "[research",
  "draft",
  "todo",
  "tbd",
  "placeholder",
  "lorem ipsum",
];

/** True if `text` contains any draft marker (case-insensitive). */
function hasDraftMarker(text: string): boolean {
  const lower = text.toLowerCase();
  return DRAFT_MARKERS.some((marker) => lower.includes(marker));
}

/**
 * Validate the claims ledger against the R-006 / §20.1 / §23 rules and
 * cross-check it against the live content and approval models. Returns the list
 * of problems; an empty list means the ledger is well-formed and complete. The
 * production build treats any non-empty result as fatal.
 */
export function validateClaimsLedger(
  ledger: readonly ClaimRecord[] = claimsLedger,
  queue: readonly QueueItem[] = approvalQueue,
  studies: readonly CaseStudy[] = caseStudies,
): string[] {
  const errors: string[] = [];

  // Target existence is checked against the canonical content universe; the
  // injectable `studies` argument is used only for the published cross-check
  // below, so a test can supply a published study without hiding the other
  // claims' real targets.
  const validSlugs = new Set(caseStudies.map((s) => s.slug.toLowerCase()));
  const validMetricIds = new Set<ProofMetricId>(
    proofBanner.metrics.map((m) => m.id),
  );

  // --- Per-claim structural and referential checks. ---
  const seenIds = new Set<string>();
  for (const claim of ledger) {
    if (!CLAIM_ID_PATTERN.test(claim.id)) {
      errors.push(
        `Claim id "${claim.id}" is not of the form C-NNNN-short-title.`,
      );
    }
    if (seenIds.has(claim.id)) {
      errors.push(`Duplicate claim id "${claim.id}".`);
    }
    seenIds.add(claim.id);

    // The target must point at content that exists and is not a removed study.
    if (claim.target.kind === "case-study") {
      const key = claim.target.slug.toLowerCase();
      if (!validSlugs.has(key)) {
        errors.push(
          `Claim "${claim.id}" targets unknown case study "${claim.target.slug}".`,
        );
      }
      if (REMOVED_CASE_STUDY_SLUGS.includes(key)) {
        errors.push(
          `Claim "${claim.id}" targets removed case study "${claim.target.slug}".`,
        );
      }
    } else if (!validMetricIds.has(claim.target.ref)) {
      errors.push(
        `Claim "${claim.id}" targets unknown proof metric "${claim.target.ref}".`,
      );
    }

    // The queue item must exist, be a financial-claims item (category B), and
    // actually cover this claim's target — otherwise the governance link is a
    // dangling or mismatched reference.
    const item = coveringQueueItem(claim, queue);
    if (!item) {
      errors.push(
        `Claim "${claim.id}" references approval-queue item "${claim.queueItem}", which does not exist.`,
      );
    } else {
      if (item.category !== "B") {
        errors.push(
          `Claim "${claim.id}" is a financial claim but its queue item "${item.id}" is category ${item.category}, not B.`,
        );
      }
      if (!queueItemCoversClaim(item, claim)) {
        errors.push(
          `Claim "${claim.id}" references queue item "${item.id}", which does not cover its target.`,
        );
      }
    }

    // Completeness (§17.7, §23): a claim that is not yet approved and not
    // rejected must have an *open* queue item tracking it.
    if (
      claim.publishStatus !== "approved" &&
      claim.publishStatus !== "rejected" &&
      item &&
      isResolvedStatus(item.status)
    ) {
      errors.push(
        `Claim "${claim.id}" is "${claim.publishStatus}" but its queue item "${item.id}" is already ${item.status}; an unapproved claim needs an open queue item.`,
      );
    }

    // An approved claim is published verbatim, so its public copy and draft value
    // may no longer carry unresolved draft markers.
    if (claim.publishStatus === "approved") {
      const copy = `${claimPublicCopy(claim)} ${claimDraftValue(claim)}`;
      if (hasDraftMarker(copy)) {
        errors.push(
          `Claim "${claim.id}" is approved but its copy still contains a draft marker.`,
        );
      }
    }
  }

  // --- Cross-check: published case studies may only cite live, non-rejected
  //     claims that actually back them. This closes the previously-dangling
  //     `caseStudies.claimIds` reference. Unpublished, in-research studies are
  //     exempt (their claimIds are intentionally empty until research passes).
  for (const study of studies) {
    if (!study.publish) continue;
    for (const id of study.claimIds) {
      const claim = claimById(id, ledger);
      if (!claim) {
        errors.push(
          `Published case study "${study.slug}" cites claim id "${id}", which is not in the ledger.`,
        );
        continue;
      }
      if (claim.publishStatus === "rejected") {
        errors.push(
          `Published case study "${study.slug}" cites rejected claim "${id}".`,
        );
      }
      if (targetSlug(claim)?.toLowerCase() !== study.slug.toLowerCase()) {
        errors.push(
          `Published case study "${study.slug}" cites claim "${id}", which backs a different target.`,
        );
      }
    }
  }

  return errors;
}

/** True when a queue status is no longer open work (approved or withdrawn). */
function isResolvedStatus(status: QueueStatus): boolean {
  return status === "approved" || status === "withdrawn";
}

/**
 * Assert the claims ledger is valid and complete, throwing on failure. Intended
 * for build time so a dangling, mismatched, or prematurely-published claim fails
 * the production build.
 */
export function assertClaimsLedgerValid(
  ledger: readonly ClaimRecord[] = claimsLedger,
  queue: readonly QueueItem[] = approvalQueue,
  studies: readonly CaseStudy[] = caseStudies,
): void {
  const errors = validateClaimsLedger(ledger, queue, studies);
  if (errors.length > 0) {
    throw new Error(`Invalid claims ledger:\n- ${errors.join("\n- ")}`);
  }
}

/** Path, relative to the repository root, of the generated CSV. */
export const CLAIMS_LEDGER_CSV_PATH = "docs/research/claims-ledger.csv";

/** The exact R-006 column order for `claims-ledger.csv`. */
export const CLAIMS_LEDGER_COLUMNS: readonly string[] = [
  "claim_id",
  "company",
  "public_copy",
  "draft_value",
  "currency",
  "metric_type",
  "entry_date",
  "entry_value",
  "end_date",
  "end_value",
  "calculation",
  "source_type",
  "source_location",
  "source_url",
  "confidence",
  "client_approval",
  "finance_approval",
  "legal_approval",
  "owner_approval",
  "publish_status",
  "notes",
];

/** Escape one CSV field: quote it when it contains a comma, quote, or newline. */
function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * The four per-claim approval columns, derived from the governing queue item so
 * they cannot contradict the queue. Finance, legal, and owner clear together when
 * the category-B item is approved; client approval for a case study is tracked on
 * the study itself, and the portfolio figure has no client. Everything is
 * `pending` while the claim is still in research — the honest current state.
 */
function claimApprovals(
  claim: ClaimRecord,
  queue: readonly QueueItem[],
): { client: string; finance: string; legal: string; owner: string } {
  const item = coveringQueueItem(claim, queue);
  const cleared = item?.status === "approved";
  const gate = cleared ? "approved" : "pending";
  const { target } = claim;
  let client = gate;
  if (target.kind === "case-study") {
    const study = caseStudies.find((s) => s.slug === target.slug);
    client = study?.clientApproval ?? "pending";
  } else {
    client = "not-required";
  }
  return { client, finance: gate, legal: gate, owner: gate };
}

/**
 * Render the exact CSV text of the claims ledger with the R-006 columns, derived
 * from the live models. `docs/research/claims-ledger.csv` is the committed output
 * and `claimsLedger.test.ts` asserts it still matches, so the printable ledger
 * cannot drift. Values that are genuinely unknown while a claim is `researching`
 * (verified entry/end figures, dates, sources) are left blank rather than
 * invented. Ends with a trailing newline.
 */
export function renderClaimsLedgerCsv(
  ledger: readonly ClaimRecord[] = claimsLedger,
  queue: readonly QueueItem[] = approvalQueue,
): string {
  const rows: string[] = [CLAIMS_LEDGER_COLUMNS.join(",")];

  for (const claim of ledger) {
    const approvals = claimApprovals(claim, queue);
    const cells: Record<string, string> = {
      claim_id: claim.id,
      company: claimCompany(claim),
      public_copy: claimPublicCopy(claim),
      draft_value: claimDraftValue(claim),
      currency: claimCurrency(claim),
      metric_type: claim.metricType,
      // Verified figures, dates, sources, and confidence are unknown while the
      // claim is in research; they are populated as the queue item is worked.
      entry_date: "",
      entry_value: "",
      end_date: "",
      end_value: "",
      calculation: "",
      source_type: "",
      source_location: "",
      source_url: "",
      confidence: "",
      client_approval: approvals.client,
      finance_approval: approvals.finance,
      legal_approval: approvals.legal,
      owner_approval: approvals.owner,
      publish_status: claim.publishStatus,
      notes: claim.notes ?? "",
    };
    rows.push(CLAIMS_LEDGER_COLUMNS.map((col) => csvField(cells[col])).join(","));
  }

  return rows.join("\n") + "\n";
}
