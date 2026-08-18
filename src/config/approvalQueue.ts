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
import { footer } from "./footer";
import { logos, type LogoEntry } from "./logos";
import { proofBanner, type ProofMetricId } from "./proofBanner";
import { ENGAGEMENT_MODEL_REVIEW } from "./engagementModel";

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
  | "footer-identity"
  | "strategic-copy"
  | "engagement-model"
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
 * The live approval queue. Ten of its twelve entries have now cleared. On
 * 2026-07-29 Q-0006 (client logos and case-study role descriptions) and Q-0007
 * ($500M+ figure and the D-001 currency treatment) were approved; on 2026-08-03
 * the Neara (Q-0001) and 13SICK (Q-0003) valuations, the footer identity
 * (Q-0010), and the engagement model (Q-0011) followed; on 2026-08-17 the owner
 * cleared the three remaining case-study items (Q-0002, Q-0004, Q-0005) and the
 * strategic copy (Q-0008). Each carries `status: "approved"` with its decision
 * recorded, and the matching content models — `logos`, `proofBanner`,
 * `caseStudies`, `footer`, `engagementModel`, `toneOfVoice`,
 * `positioningResearch`, and `claimsLedger` — have flipped in step.
 *
 * The three case-study approvals are deliberately *scoped to the wording that
 * publishes today*: the non-quantified headline and role description of each
 * study, not its withheld figures. Those figures are blocked on research, not on
 * approval, so `claimsLedger` keeps C-0002/C-0004/C-0005 at `researching` and
 * each study stays `publish: false` while its `[VERIFY:]`/`[RESEARCH:]` markers
 * remain. Because both models require unapproved content to be tracked by an
 * *open* item, Q-0012 was opened to carry exactly that residue — closing a
 * wording gate must never leave an unverified figure untracked.
 *
 * Two items remain open: Q-0009, the standing launch review, which by design
 * spans the six reviewers before and after launch rather than closing once; and
 * Q-0012. Approvers clear items here (flipping status and recording the
 * decision) in parallel with development; the content model for a cleared item
 * is then marked approved.
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
    status: "approved",
    decision:
      "Owner approved the Neara claim: the FROM IDEA TO A$1B+ headline and the 20× / A$200m figures publish verbatim, backed by the February 2026 A$1.1b Series D reporting in the dossier. The study flips to approved and published.",
    decisionDate: "2026-08-03",
    decidedBy: "Helix owner (jeeva@helixcollective.com)",
  },
  {
    id: "Q-0002-ferovinum-valuation",
    category: "B",
    title: "Ferovinum enterprise-value claim",
    coverage: [{ kind: "case-study", ref: "ferovinum" }],
    publishedWording:
      "FROM IDEA TO A GLOBAL CAPITAL PLATFORM — securitisation-vs-valuation evidence unresolved (§9.2).",
    requiredApprovers: REQUIRED_APPROVERS.B,
    status: "approved",
    decision:
      "Owner approved the Ferovinum wording that publishes today: the non-quantified FROM IDEA TO A GLOBAL CAPITAL PLATFORM headline and the technology/fundraising role description. The approval is scoped to that wording only — the 10× and $300m figures stay withheld because the §9.2 securitisation-vs-valuation evidence gate is a research question, not an approval one. C-0002 stays `researching` and the study stays `publish: false` until the figures resolve.",
    decisionDate: "2026-08-17",
    decidedBy: "Helix owner (jeeva@helixcollective.com)",
  },
  {
    id: "Q-0003-13sick-valuation",
    category: "B",
    title: "13SICK enterprise-value claim",
    coverage: [{ kind: "case-study", ref: "13sick" }],
    publishedWording: "A$30M → A$150M — draft multiple carries a [VERIFY:] marker.",
    requiredApprovers: REQUIRED_APPROVERS.B,
    status: "approved",
    decision:
      "Owner verified the 13SICK claim: the A$30M → A$150M headline and the 5× / A$100m figures publish verbatim. The study flips to approved and published.",
    decisionDate: "2026-08-03",
    decidedBy: "Helix owner (jeeva@helixcollective.com)",
  },
  {
    id: "Q-0004-origami-valuation",
    category: "B",
    title: "Origami enterprise-value claim",
    coverage: [{ kind: "case-study", ref: "origami" }],
    publishedWording:
      "APPROX. 10× VALUE GROWTH — figures and the Helix contribution await internal research (§9.4).",
    requiredApprovers: REQUIRED_APPROVERS.B,
    status: "approved",
    decision:
      "Owner approved the Origami wording that publishes today: the APPROX. 10× VALUE GROWTH headline and the role description. The approval is scoped to that wording only — the figures and the Helix contribution await the internal subject-matter research §9.4 requires, and the plan is explicit that the \"how\" must not be invented. C-0004 stays `researching` and the study stays `publish: false` until that research lands.",
    decisionDate: "2026-08-17",
    decidedBy: "Helix owner (jeeva@helixcollective.com)",
  },
  {
    id: "Q-0005-veyor-valuation",
    category: "B",
    title: "Veyor Digital enterprise-value claim",
    coverage: [{ kind: "case-study", ref: "veyor" }],
    publishedWording:
      "0 → 1 TO A$50M+ — draft figures and the Helix contribution carry [VERIFY:]/[RESEARCH:] markers.",
    requiredApprovers: REQUIRED_APPROVERS.B,
    status: "approved",
    decision:
      "Owner approved the Veyor wording that publishes today: the 0 → 1 TO A$50M+ headline and the March 2026 A$50m–A$75m Series A range it rests on. The approval is scoped to that wording only — the multiple, the value-created figure, and the exact Helix contribution still carry [VERIFY:]/[RESEARCH:] markers, so C-0005 stays `researching` and the study stays `publish: false` until they resolve.",
    decisionDate: "2026-08-17",
    decidedBy: "Helix owner (jeeva@helixcollective.com)",
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
    status: "approved",
    decision:
      "Owner approved publication of every retained client/partner logo and the case-study role descriptions. The logo assets are the same files the live site already publishes, stored locally under public/logos/ (never hotlinked, §8.4); logos.ts permissions flip to approved.",
    decisionDate: "2026-07-29",
    decidedBy: "Helix owner (jeeva@helixcollective.com)",
  },
  {
    id: "Q-0007-proof-enterprise-value",
    category: "B",
    title: "$500M+ enterprise-value figure and currency",
    coverage: [{ kind: "proof-metric", ref: "enterprise-value" }],
    publishedWording:
      "$500M+ ENTERPRISE VALUE CREATED publishes in its safe, deliberately currency-neutral draft form; confirming the currency behind the figure is the open D-001 decision this item tracks.",
    requiredApprovers: REQUIRED_APPROVERS.B,
    status: "approved",
    decision:
      "Owner approved the $500M+ enterprise-value figure in its currency-neutral wording, and with it the D-001 currency treatment (currency-neutral aggregate; A$ for Australian-dollar figures; no mixed-currency aggregation without a documented method).",
    decisionDate: "2026-07-29",
    decidedBy: "Helix owner (jeeva@helixcollective.com)",
  },
  {
    id: "Q-0008-strategic-copy",
    category: "A",
    title: "Strategic copy: hero, model, fit, CTA, profanity",
    coverage: [{ kind: "strategic-copy" }],
    publishedWording:
      "Hero proposition, partnership model, fit criteria, the single CTA, the no-fit humour, and the profanity decision publish in their drafted wording.",
    requiredApprovers: REQUIRED_APPROVERS.A,
    status: "approved",
    decision:
      "Owner approved the strategic copy as published: the hero proposition with its `aligned` supporting line, the single LET'S CREATE ENTERPRISE VALUE CTA, the fit criteria and their outcomes, and the \"IT'S NOT US. IT'S YOU :)\" no-fit humour. Two things are deliberately *not* carried by this approval. Profanity is declined — the supplied \"get shit done\" phrasing does not publish, and PROFANITY_POLICY records \"get the hard part done\" as the sanctioned equivalent that keeps the irreverence without the swearing. D-009 also stays pending: the hero keeps the `aligned` variant and the literal \"get paid when you get paid\" claim remains unselected. D-0002, D-0004, D-0005, and D-0006 remain open — approving this copy does not settle them.",
    decisionDate: "2026-08-17",
    decidedBy: "Helix owner (jeeva@helixcollective.com)",
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
  {
    // The footer's institutional-identity facts (§14) — legal entity name, ABN,
    // and registered office — are owner-approved legitimacy facts with no
    // recorded decision yet. `publishedFooter()` withholds each until it clears,
    // so an unverified ABN or office never reaches `dist`; this item keeps that
    // pending content tracked. Category A (the single Helix-owner gate) is the
    // right approver: the registered office is the open D-007 locations decision,
    // and the entity/ABN are the owner's institutional facts.
    id: "Q-0010-footer-identity",
    category: "A",
    title: "Footer institutional identity: legal entity, ABN, registered office",
    coverage: [{ kind: "footer-identity" }],
    publishedWording:
      "Legal entity name and ABN publish as [VERIFY:] drafts and the registered office as the §12 Redfern address — all withheld from the rendered footer until the Helix owner confirms them (§14, D-007).",
    requiredApprovers: REQUIRED_APPROVERS.A,
    status: "approved",
    decision:
      "Owner approved the footer identity. The legal entity (Helix Venture Studio Pty Ltd) and ABN (20 678 772 631) are the values the live site already publishes, confirmed in the 2026-07-29 audit capture; the registered office publishes as the Vine Street, Redfern address. All three facts flip to approved and render.",
    decisionDate: "2026-08-03",
    decidedBy: "Helix owner (jeeva@helixcollective.com)",
  },
  {
    // The engagement-model validation record (§11.7, R-012,
    // docs/research/engagement-model.md) documents the real operating model
    // behind the "How we work" (§11) and "We're different because…" (§10) copy —
    // the site's most legally sensitive promises (unpaid preparation, gain-share,
    // embedded delivery, clean exit). The copy publishes as the plan's working
    // baseline now; this item tracks the outstanding sign-off. Category B is the
    // right gate: R-012 requires commercial, finance, and legal review plus the
    // owner, and the category-B set (finance-owner, legal-reviewer, helix-owner)
    // maps onto finance, legal, and the commercial owner.
    id: "Q-0011-engagement-model",
    category: "B",
    title: "Engagement-model validation (How we work operating model)",
    coverage: [{ kind: "engagement-model" }],
    publishedWording:
      "The four-stage 'How we work' model and its unpaid-preparation, paid-as-we-deliver, back-end gain-share, embedded-delivery, and clean-exit wording publish as the plan's working baseline, documented in docs/research/engagement-model.md and withheld from production sign-off until finance, legal, and the owner confirm it (§11.7, R-012).",
    requiredApprovers: REQUIRED_APPROVERS.B,
    status: "approved",
    decision:
      "Owner approved the engagement-model wording as published: unpaid preparation, paid-as-we-deliver, back-end gain-share, embedded delivery without an assigned legal status, and a clean engagement exit. The R-012 review flips to approved and D-012 is recorded on its instrument-neutral default.",
    decisionDate: "2026-08-03",
    decidedBy: "Helix owner (jeeva@helixcollective.com)",
  },
  {
    // Q-0002, Q-0004 and Q-0005 approved the *wording* each of those three
    // studies publishes today, not their withheld figures — the owner's
    // 2026-08-17 decisions say so in terms. The figures are still unresearched,
    // and both `claimsLedger` and `caseStudies` require an *open* item to track
    // content that has not cleared. This is that item: one homogeneous piece of
    // outstanding work (the §9.2/§9.4/§9.5 research behind three studies),
    // covered by one record in the same way Q-0006 covers five studies at once.
    // Category B, because what it gates is quantified financial claims.
    id: "Q-0012-outstanding-valuation-figures",
    category: "B",
    title: "Outstanding case-study valuation figures: Origami, Veyor",
    coverage: [
      { kind: "case-study", ref: "origami" },
      { kind: "case-study", ref: "veyor" },
    ],
    publishedWording:
      "Both studies publish qualitatively — headline, role description, and Helix contribution — with no multiple, value-created figure, or valuation range on the card, so nothing quantified is on the page while the §9.4 Origami research and the §9.5 Veyor figures remain outstanding. Ferovinum left this item on 2026-08-18 when the owner verified its figures under Q-0002.",
    requiredApprovers: REQUIRED_APPROVERS.B,
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

  // The footer's institutional-identity facts (legal entity, ABN, registered
  // office, any social/privacy link, contact email) publish withheld until owner
  // sign-off (§14). Like every other pending content model, they must be tracked
  // by an open queue item, or the governance record and the site drift apart.
  const footerFacts = [
    ...footer.facts,
    ...footer.socialLinks,
    ...(footer.privacyLink ? [footer.privacyLink] : []),
    ...(footer.contactEmail ? [footer.contactEmail] : []),
  ];
  if (
    footerFacts.some((f) => f.approval === "pending") &&
    !isCovered(openRefs, "footer-identity")
  ) {
    errors.push(
      `Footer identity facts publish under pending approval but no open queue item covers footer identity.`,
    );
  }

  // Every footer fact must reference a real footer-identity queue item, so its
  // `queueItem` id can never collide with an unrelated item (e.g. a case-study
  // valuation) or dangle. Resolved items still count — an approved fact keeps
  // pointing at the item that cleared it.
  const footerIdentityIds = new Set(
    queue
      .filter((item) => item.coverage.some((c) => c.kind === "footer-identity"))
      .map((item) => item.id),
  );
  for (const fact of footerFacts) {
    if (!footerIdentityIds.has(fact.queueItem)) {
      errors.push(
        `Footer fact references approval-queue item "${fact.queueItem}", which is not a footer-identity queue item.`,
      );
    }
  }

  // The engagement-model validation record (§11.7, R-012) publishes its "How we
  // work"/"We're different" copy in draft form until finance/legal/owner sign it
  // off. Like every other pending content model it must be tracked by an open
  // queue item, or the governance record and the site drift apart.
  if (
    ENGAGEMENT_MODEL_REVIEW.status === "pending" &&
    !isCovered(openRefs, "engagement-model")
  ) {
    errors.push(
      `The engagement model (§11.7, R-012) publishes copy in draft form but no open queue item covers engagement-model.`,
    );
  }

  // The record's declared `queueItem` must point at a real engagement-model queue
  // item, so it can never dangle or collide with an unrelated item.
  const engagementModelIds = new Set(
    queue
      .filter((item) => item.coverage.some((c) => c.kind === "engagement-model"))
      .map((item) => item.id),
  );
  if (!engagementModelIds.has(ENGAGEMENT_MODEL_REVIEW.queueItem)) {
    errors.push(
      `The engagement model references approval-queue item "${ENGAGEMENT_MODEL_REVIEW.queueItem}", which is not an engagement-model queue item.`,
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

/** Directory, relative to the repository root, holding the generated records. */
export const QUEUE_DOC_DIR = "docs/approvals/queue";

/** Filename, within {@link QUEUE_DOC_DIR}, of a queue item's generated record. */
export function queueItemFilename(item: QueueItem): string {
  return `${item.id}.md`;
}

/** Comment written into each generated record to discourage hand-edits. */
const QUEUE_DOC_COMMENT =
  "<!-- Generated from src/config/approvalQueue.ts — do not edit by hand. -->";

/** Render a coverage list as a readable, comma-separated string. */
function formatCoverage(coverage: readonly CoverageRef[]): string {
  return coverage
    .map((c) => (c.ref ? `${c.kind} (${c.ref})` : c.kind))
    .join(", ");
}

/**
 * Render the exact markdown text of the one-file-per-item record described in
 * §23, generated from this canonical model rather than hand-maintained in
 * parallel. `docs/approvals/queue/Q-*.md` is the rendered output and
 * `approvalQueue.test.ts` asserts the committed files still match, so the
 * printable/exportable approver records can never drift from the code. The shape
 * follows `docs/approvals/queue/TEMPLATE.md`. Ends with a trailing newline.
 */
export function renderQueueItemMarkdown(item: QueueItem): string {
  const lines: string[] = [
    `# ${item.id} — ${item.title}`,
    "",
    QUEUE_DOC_COMMENT,
    "",
    `- **Category:** ${item.category} — ${CATEGORY_LABELS[item.category]}`,
    `- **Covers:** ${formatCoverage(item.coverage)}`,
    `- **Required approvers:** ${item.requiredApprovers.join(", ")}`,
    `- **Status:** ${item.status}`,
    "",
    "## Currently published draft wording or asset",
    "",
    item.publishedWording,
    "",
    "## Decision",
    "",
  ];

  if (isDecided(item)) {
    // The model's validation guarantees these three fields are present once an
    // item is decided, so render them straight through.
    lines.push(
      item.decision as string,
      "",
      `- **Decision date:** ${item.decisionDate}`,
      `- **Decided by:** ${item.decidedBy}`,
    );
  } else {
    lines.push(
      "_No decision recorded yet — this item is still open and publishing in draft form._",
    );
  }

  return lines.join("\n") + "\n";
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
