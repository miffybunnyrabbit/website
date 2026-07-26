/**
 * Typed, self-validating model of the content and legal approval queue
 * (implementation plan section 23; governance gates P0-003, P6-001, P6-002).
 *
 * Approval is asynchronous and never blocks building or publishing the site.
 * Every content item that previously required sign-off *before* publication is
 * instead recorded here as a queue item; the content publishes immediately in
 * its current best-available draft form (see the honest `publish: false` /
 * pending-approval defaults in `caseStudies`, `proofBanner`, and `logos`), and
 * the queue keeps the open work visible until an approver clears it.
 *
 * Rather than let the queue live as free-form markdown that silently drifts out
 * of sync with the site, this module is the single validated source of truth and
 * it cross-checks the real content models: if a case study, the proof figure, or
 * a retained logo still needs sign-off but has no open queue item, the build
 * fails. Conversely, a queue item that points at content which no longer exists
 * fails too. The human-readable one-file-per-item records described in section 23
 * live under `docs/approvals/queue/` and are generated from this model, not
 * hand-maintained in parallel.
 *
 * This module is pure content plus validation. It renders nothing and requires
 * no client-side state; `openQueueItems()` is what a build step surfaces as a
 * non-fatal warning so the queue and the published site stay in sync (§20.1).
 */

import { caseStudies, type CaseStudy } from "./caseStudies";
import { logos, type LogoEntry } from "./logos";
import { proofBanner, type ProofMetricId } from "./proofBanner";

/** The four approval categories and their required approvers (section 23). */
export type ApprovalCategory = "A" | "B" | "C" | "D";

/**
 * The people/roles who can clear a queue item. Kept as a closed union so a typo
 * in an item's `requiredApprovers` is a compile error, not a governance hole.
 */
export type Approver =
  | "helix-owner"
  | "finance-owner"
  | "legal-reviewer"
  | "client-or-owner"
  | "product-strategy"
  | "design"
  | "development"
  | "copy"
  | "finance-legal"
  | "final-owner";

/**
 * The canonical required-approver set for each category (section 23). An item
 * must declare exactly this set — no more, no fewer — so no category can quietly
 * drop a required reviewer.
 */
export const REQUIRED_APPROVERS: Record<ApprovalCategory, readonly Approver[]> =
  {
    // Category A — Strategic copy.
    A: ["helix-owner"],
    // Category B — Financial claims.
    B: ["finance-owner", "legal-reviewer", "helix-owner"],
    // Category C — Client representation.
    C: ["client-or-owner"],
    // Category D — Launch review.
    D: [
      "product-strategy",
      "design",
      "development",
      "copy",
      "finance-legal",
      "final-owner",
    ],
  };

/** Human-facing category labels (section 23). */
export const CATEGORY_LABELS: Record<ApprovalCategory, string> = {
  A: "Strategic copy",
  B: "Financial claims",
  C: "Client representation",
  D: "Launch review",
};

export type QueueStatus =
  | "open"
  | "changes-requested"
  | "approved"
  | "withdrawn";

/**
 * The kind of content a queue item covers. `case-study` and `proof-metric` items
 * name a specific target with `ref`; the others govern a whole content area and
 * carry no `ref`.
 */
export type CoverageKind =
  | "case-study"
  | "proof-metric"
  | "logo-permissions"
  | "strategic-copy"
  | "launch-review";

export interface CoverageRef {
  kind: CoverageKind;
  /** The specific target: a case-study slug or a proof-metric id. */
  ref?: string;
}

export interface QueueItem {
  /** Stable identifier, `Q-NNNN-short-title` (section 23 naming). */
  id: string;
  category: ApprovalCategory;
  /** Short human title, e.g. "Neara valuation claim". */
  title: string;
  /** The content this item covers, as structured references. */
  coverage: readonly CoverageRef[];
  /** The wording or asset currently published in draft form. */
  publishedWording: string;
  /** Exactly `REQUIRED_APPROVERS[category]`; declared for auditability. */
  requiredApprovers: readonly Approver[];
  status: QueueStatus;
  /** The recorded decision note — required once the item is decided. */
  decision?: string;
  /** ISO `YYYY-MM-DD` decision date — required once the item is decided. */
  decisionDate?: string;
  /** Who recorded the decision — required once the item is decided. */
  decidedBy?: string;
}

/**
 * The live approval queue. Every entry is `open`: nothing on the site is
 * approved yet, mirroring the pending state of every content model. Approvers
 * clear items here (flipping status and recording the decision) in parallel with
 * development; the content model for a cleared item is then marked approved.
 */
export const approvalQueue: readonly QueueItem[] = [
  {
    id: "Q-0001-neara-valuation",
    category: "B",
    title: "Neara enterprise-value claim",
    coverage: [{ kind: "case-study", ref: "neara" }],
    publishedWording:
      "FROM IDEA TO A$1B+ — draft multiple and value-created figures carry [VERIFY:] markers.",
    requiredApprovers: REQUIRED_APPROVERS.B,
    status: "open",
  },
  {
    id: "Q-0002-ferovinum-valuation",
    category: "B",
    title: "Ferovinum enterprise-value claim",
    coverage: [{ kind: "case-study", ref: "ferovinum" }],
    publishedWording:
      "FROM IDEA TO A GLOBAL CAPITAL PLATFORM — securitisation-vs-valuation evidence unresolved (§9.2).",
    requiredApprovers: REQUIRED_APPROVERS.B,
    status: "open",
  },
  {
    id: "Q-0003-13sick-valuation",
    category: "B",
    title: "13SICK enterprise-value claim",
    coverage: [{ kind: "case-study", ref: "13sick" }],
    publishedWording: "A$30M → A$150M — draft multiple carries a [VERIFY:] marker.",
    requiredApprovers: REQUIRED_APPROVERS.B,
    status: "open",
  },
  {
    id: "Q-0004-origami-valuation",
    category: "B",
    title: "Origami enterprise-value claim",
    coverage: [{ kind: "case-study", ref: "origami" }],
    publishedWording:
      "APPROX. 10× VALUE GROWTH — figures and the Helix contribution await internal research (§9.4).",
    requiredApprovers: REQUIRED_APPROVERS.B,
    status: "open",
  },
  {
    id: "Q-0005-veyor-valuation",
    category: "B",
    title: "Veyor Digital enterprise-value claim",
    coverage: [{ kind: "case-study", ref: "veyor" }],
    publishedWording:
      "0 → 1 TO A$50M+ — draft figures and the Helix contribution carry [VERIFY:]/[RESEARCH:] markers.",
    requiredApprovers: REQUIRED_APPROVERS.B,
    status: "open",
  },
  {
    id: "Q-0006-client-representation",
    category: "C",
    title: "Client logo permissions and role descriptions",
    coverage: [
      { kind: "logo-permissions" },
      { kind: "case-study", ref: "neara" },
      { kind: "case-study", ref: "ferovinum" },
      { kind: "case-study", ref: "13sick" },
      { kind: "case-study", ref: "origami" },
      { kind: "case-study", ref: "veyor" },
    ],
    publishedWording:
      "All marquee logos and case-study role descriptions publish under pending permission until each client or authorised owner confirms.",
    requiredApprovers: REQUIRED_APPROVERS.C,
    status: "open",
  },
  {
    id: "Q-0007-proof-enterprise-value",
    category: "B",
    title: "$500M+ enterprise-value figure and currency",
    coverage: [{ kind: "proof-metric", ref: "enterprise-value" }],
    publishedWording:
      "$500M+ ENTERPRISE VALUE CREATED — held out of production until the D-001 currency decision is recorded.",
    requiredApprovers: REQUIRED_APPROVERS.B,
    status: "open",
  },
  {
    id: "Q-0008-strategic-copy",
    category: "A",
    title: "Strategic copy: hero, model, fit, CTA, profanity",
    coverage: [{ kind: "strategic-copy" }],
    publishedWording:
      "Hero proposition, partnership model, fit criteria, the single CTA, the no-fit humour, and the profanity decision publish in their drafted wording.",
    requiredApprovers: REQUIRED_APPROVERS.A,
    status: "open",
  },
  {
    id: "Q-0009-launch-review",
    category: "D",
    title: "Standing launch review",
    coverage: [{ kind: "launch-review" }],
    publishedWording:
      "Product/strategy, design, development, copy, finance/legal, and the final owner each review before and after launch; findings are applied as content updates.",
    requiredApprovers: REQUIRED_APPROVERS.D,
    status: "open",
  },
];

/** A queue item is resolved once it is approved or withdrawn — no longer open work. */
export function isResolved(item: QueueItem): boolean {
  return item.status === "approved" || item.status === "withdrawn";
}

/** A queue item is decided once a decision has been recorded against it. */
function isDecided(item: QueueItem): boolean {
  return item.status === "approved" || item.status === "changes-requested" ||
    item.status === "withdrawn";
}

/**
 * The still-open items a build should surface as a non-fatal warning so the queue
 * and the published site stay in sync (§20.1, §23). `changes-requested` is open
 * work too — the copy is being revised — so it is included; only approved and
 * withdrawn items drop off.
 */
export function openQueueItems(
  queue: readonly QueueItem[] = approvalQueue,
): QueueItem[] {
  return queue.filter((item) => !isResolved(item));
}

/** True when a case study still needs any form of sign-off. */
function studyNeedsSignoff(study: CaseStudy): boolean {
  return (
    study.approvalStatus !== "approved" ||
    study.clientApproval === "pending" ||
    study.assetApproval !== "approved"
  );
}

/** True when a retained logo is still published under pending permission. */
function logoNeedsSignoff(logo: LogoEntry): boolean {
  return logo.status === "retain" && logo.permission === "pending";
}

const QUEUE_ID_PATTERN = /^Q-\d{4}-[a-z0-9-]+$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Order-independent equality between two approver lists. */
function sameApprovers(
  a: readonly Approver[],
  b: readonly Approver[],
): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((x) => set.has(x));
}

/** True when `refs` contains a non-resolved item covering the given target. */
function isCovered(
  openRefs: readonly CoverageRef[],
  kind: CoverageKind,
  ref?: string,
): boolean {
  return openRefs.some((c) => c.kind === kind && c.ref === ref);
}

/**
 * Validate the approval queue against the section 23 rules and cross-check it
 * against the live content models. Returns the list of problems; an empty list
 * means the queue is well-formed and complete. The production build treats any
 * non-empty result as fatal.
 */
export function validateApprovalQueue(
  queue: readonly QueueItem[] = approvalQueue,
): string[] {
  const errors: string[] = [];

  const validMetricIds = new Set<ProofMetricId>(
    proofBanner.metrics.map((m) => m.id),
  );
  const validSlugs = new Set(caseStudies.map((s) => s.slug.toLowerCase()));

  // --- Per-item structural checks. ---
  const seenIds = new Set<string>();
  for (const item of queue) {
    if (!QUEUE_ID_PATTERN.test(item.id)) {
      errors.push(
        `Queue item id "${item.id}" is not of the form Q-NNNN-short-title.`,
      );
    }
    if (seenIds.has(item.id)) {
      errors.push(`Duplicate queue item id "${item.id}".`);
    }
    seenIds.add(item.id);

    if (!item.title.trim()) {
      errors.push(`Queue item "${item.id}" is missing a title.`);
    }
    if (!item.publishedWording.trim()) {
      errors.push(
        `Queue item "${item.id}" must record the currently-published draft wording.`,
      );
    }

    // The declared approvers must be exactly the canonical set for the category.
    if (!sameApprovers(item.requiredApprovers, REQUIRED_APPROVERS[item.category])) {
      errors.push(
        `Queue item "${item.id}" (category ${item.category}) must require exactly [${REQUIRED_APPROVERS[
          item.category
        ].join(", ")}].`,
      );
    }

    // A decided item must record its decision; an open item must not pretend to.
    if (isDecided(item)) {
      if (!item.decision?.trim()) {
        errors.push(`Decided queue item "${item.id}" is missing a decision note.`);
      }
      if (!item.decisionDate || !ISO_DATE_PATTERN.test(item.decisionDate)) {
        errors.push(
          `Decided queue item "${item.id}" needs a YYYY-MM-DD decision date.`,
        );
      }
      if (!item.decidedBy?.trim()) {
        errors.push(`Decided queue item "${item.id}" must record who decided.`);
      }
    } else {
      if (item.decision || item.decisionDate || item.decidedBy) {
        errors.push(
          `Open queue item "${item.id}" must not carry a recorded decision.`,
        );
      }
    }

    if (item.coverage.length === 0) {
      errors.push(`Queue item "${item.id}" covers nothing.`);
    }

    // Coverage references must point at content that exists.
    for (const cov of item.coverage) {
      if (cov.kind === "case-study") {
        if (!cov.ref || !validSlugs.has(cov.ref.toLowerCase())) {
          errors.push(
            `Queue item "${item.id}" covers unknown case study "${cov.ref ?? ""}".`,
          );
        }
      } else if (cov.kind === "proof-metric") {
        if (!cov.ref || !validMetricIds.has(cov.ref as ProofMetricId)) {
          errors.push(
            `Queue item "${item.id}" covers unknown proof metric "${cov.ref ?? ""}".`,
          );
        }
      } else if (cov.ref) {
        errors.push(
          `Queue item "${item.id}" coverage of kind "${cov.kind}" must not name a ref.`,
        );
      }
    }
  }

  // --- Completeness cross-checks: pending content needs an open item. ---
  const openRefs = openQueueItems(queue).flatMap((item) => item.coverage);

  for (const study of caseStudies) {
    if (studyNeedsSignoff(study) && !isCovered(openRefs, "case-study", study.slug)) {
      errors.push(
        `Case study "${study.slug}" still needs sign-off but has no open queue item.`,
      );
    }
  }

  if (
    proofBanner.currencyApproval === "pending" &&
    !isCovered(openRefs, "proof-metric", "enterprise-value")
  ) {
    errors.push(
      `The $500M+ proof figure still needs sign-off but has no open queue item.`,
    );
  }

  if (
    logos.some(logoNeedsSignoff) &&
    !isCovered(openRefs, "logo-permissions")
  ) {
    errors.push(
      `Retained logos publish under pending permission but no open queue item covers logo permissions.`,
    );
  }

  return errors;
}

/**
 * Assert the approval queue is valid and complete, throwing on failure. Intended
 * for build time so a malformed queue — or content that needs sign-off with no
 * open item tracking it — fails the build.
 */
export function assertApprovalQueueValid(
  queue: readonly QueueItem[] = approvalQueue,
): void {
  const errors = validateApprovalQueue(queue);
  if (errors.length > 0) {
    throw new Error(`Invalid approval queue:\n- ${errors.join("\n- ")}`);
  }
}

/**
 * A single-line-per-item summary of the open queue, for the build to print as a
 * non-fatal warning. Approval never blocks publication (§23); this only keeps the
 * open work visible.
 */
export function formatOpenQueueWarning(
  queue: readonly QueueItem[] = approvalQueue,
): string {
  const open = openQueueItems(queue);
  if (open.length === 0) return "Approval queue: no open items.";
  const lines = open.map(
    (item) =>
      `  ${item.id} [${CATEGORY_LABELS[item.category]}] ${item.title} (${item.status})`,
  );
  return `Approval queue: ${open.length} open item(s) publishing in draft form:\n${lines.join(
    "\n",
  )}`;
}
