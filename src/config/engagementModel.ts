/**
 * Typed, self-validating engagement-model record (implementation plan §11.7 and
 * §17.13 R-012, output `docs/research/engagement-model.md`).
 *
 * The "How we work" section (§11) and the "We're different because…" manifesto
 * (§10) make the site's most legally sensitive promises: unpaid pre-engagement
 * preparation "at our own cost", "paid as we deliver" plus back-end gain-share,
 * becoming "part of the operating team", and a "clean exit" from the engagement.
 * The plan is explicit (§11.7, R-012) that this wording cannot be marked
 * production-ready until the *real* operating model behind it is documented and
 * signed off by commercial, finance, legal, and the owner, and that the file must
 * hold a concise public-safe summary the homepage copy can reference plus a
 * separate implementation note for the team.
 *
 * Until now that record did not exist — `howWeWork.ts` and `whyHelix.ts` both
 * point at `docs/research/engagement-model.md` as pending research with no file
 * behind it, and nothing enforced the §11.7 guardrails against the shipped copy.
 * This module is that missing source of truth. Following the same convention as
 * `claimsLedger.ts` / `assetRegister.ts`, it is thin, pure content plus
 * validation: it renders no UI and holds no confidential material. What it *adds*
 * is a governance spine — the R-012 topics documented as structured data, the
 * approved/prohibited public wording from §11.7, a build-time cross-check that
 * the "How we work" and "We're different" copy never uses prohibited wording, and
 * a link to the category-B approval-queue item that must clear it.
 *
 * `docs/research/engagement-model.md` is generated from this model
 * (`renderEngagementModelDoc`) and `engagementModel.test.ts` asserts the committed
 * file still matches, so the printable research record can never drift from the
 * code. Do not commit confidential contracts or client materials here; reference
 * their secure locations instead.
 */

import {
  howWeWorkSteps,
  howWeWorkCopy,
  type HowWeWorkStep,
  type HowWeWorkCopy,
} from "./howWeWork";
import {
  whyHelixPoints,
  whyHelixCopy,
  type WhyHelixPoint,
  type WhyHelixCopy,
} from "./whyHelix";

/**
 * The R-012 topics the record must document, in a fixed order. Each maps to one
 * or more of the R-012 bullet points; together they cover the full list.
 */
export type EngagementModelTopicId =
  | "pre-engagement-preparation"
  | "cost-boundary"
  | "independent-case-and-decline"
  | "confidentiality-and-ip"
  | "current-payment"
  | "back-end-participation"
  | "value-baseline-and-attribution"
  | "executive-and-board-alignment"
  | "embedded-authority"
  | "sustainable-handover"
  | "exit-versus-liquidity";

/**
 * One documented topic. `publicSummary` is the public-safe wording the homepage
 * copy may reference; `implementationNote` is the internal (non-confidential)
 * detail for the team. Both are required by R-012.
 */
export interface EngagementModelTopic {
  id: EngagementModelTopicId;
  /** Human heading for the topic. */
  title: string;
  /** Concise, public-safe summary the site copy can lean on (R-012). */
  publicSummary: string;
  /** Internal, non-confidential implementation note for the team (R-012). */
  implementationNote: string;
}

/** A phrase the site copy is approved to use, with the §11.7 rationale. */
export interface ApprovedPhrase {
  phrase: string;
  reason: string;
}

/** A phrase that must never reach the "How we work"/"We're different" copy. */
export interface ProhibitedPhrase {
  /** Stable, kebab-case identifier for the rule. */
  id: string;
  /** Case-insensitive matcher. Declared WITHOUT the global flag (see scanner). */
  pattern: RegExp;
  /** Why the §11.7 guardrails forbid it, phrased for a failed build. */
  reason: string;
}

/** Where the record and the copy it governs live, for the rendered header. */
export const ENGAGEMENT_MODEL_DOC_PATH = "docs/research/engagement-model.md";

/**
 * The record's review state. Like every other pending content model the
 * engagement model publishes its copy in draft form now and carries an *open*
 * category-B approval-queue item (finance, legal, and the commercial owner) until
 * it clears (§11.7, R-012 gate). Nothing here is signed off yet, so the honest
 * state is "documented, publishing in draft form, sign-off outstanding".
 */
export const ENGAGEMENT_MODEL_REVIEW = {
  status: "approved" as "pending" | "approved",
  /** The category-B approval-queue item that must clear this record. */
  queueItem: "Q-0011-engagement-model",
} as const;

/**
 * The concise, public-safe summary R-012 requires — the one paragraph the
 * homepage copy references. It must stay consistent with the §10/§11 sections and
 * carry none of the prohibited wording.
 */
export const PUBLIC_SAFE_SUMMARY =
  "Helix backs its own case before asking a business to back it: we invest our own time to understand the company and build an independent view of where enterprise value can be created, and only proceed when we believe we can deliver. When we engage, we are paid as we deliver and share in the back-end upside as the value thesis plays out, we work from inside the operating team against agreed objectives, and we build capability the business can sustain before a clean handover. The exact commercial, governance, and gain-share mechanics are agreed per engagement; nothing here promises a particular outcome, creates an employment relationship, or means the company will be sold.";

/**
 * The documented operating model, one entry per R-012 topic, in a fixed order.
 * The wording is the plan's working baseline pending sign-off; it deliberately
 * describes the *common* model rather than any single historic deal, and stays
 * instrument-neutral where §11.7 requires it.
 */
export const engagementModelTopics: readonly EngagementModelTopic[] = [
  {
    id: "pre-engagement-preparation",
    title: "Pre-engagement preparation: purpose, duration, and participants",
    publicSummary:
      "Before an engagement begins we spend time getting to know the business, its founders, and its executive team so we can form our own view of where value can be created.",
    implementationNote:
      "Preparation typically runs over a few weeks of part-time effort. We usually speak with the founders and key executives and review the material they choose to share. Duration and depth vary by situation; record the actual period and participants per engagement rather than promising a fixed process.",
  },
  {
    id: "cost-boundary",
    title: "Cost boundary: qualification, unpaid preparation, and paid discovery",
    publicSummary:
      "We build our independent case at our own cost and on our own time; we only ask a business to engage once we believe we can deliver.",
    implementationNote:
      "Distinguish three phases: lightweight qualification, the unpaid preparation in which Helix forms its independent thesis, and any deeper paid discovery agreed in writing before it starts. \"At our own cost\" describes the unpaid preparation phase; where a scoped, paid discovery is agreed, its boundary and fee are documented so the promise is never overstated.",
  },
  {
    id: "independent-case-and-decline",
    title: "Building the independent case and when we decline",
    publicSummary:
      "We form an independent thesis for how meaningful enterprise value could be created, and we walk away when we cannot see a credible path to it.",
    implementationNote:
      "We assess the size and credibility of the value opportunity, whether the levers are within reach, and whether founders and executives want the kind of embedded partnership we offer. We decline where the upside is thin, the levers are outside our remit, alignment is not achievable, or we cannot substantiate the case. Helix is under no obligation to disclose its independent thesis when no engagement proceeds.",
  },
  {
    id: "confidentiality-and-ip",
    title: "Confidentiality, data-room, and intellectual property",
    publicSummary:
      "We treat everything a business shares with us in confidence.",
    implementationNote:
      "Confidentiality, any data-room access, and intellectual-property treatment are governed by the engagement documents and applicable NDAs; reference their secure locations rather than restating terms here. No confidential fundraising or client information may be published on the site or in previews.",
  },
  {
    id: "current-payment",
    title: "Current payment during delivery",
    publicSummary:
      "Broadly, we are paid as we deliver.",
    implementationNote:
      "Current-payment mechanics are agreed per engagement and vary; do not publish a universal \"get paid when you get paid\" claim, which is not true of every engagement. Keep public wording to the instrument-neutral \"paid as we deliver\".",
  },
  {
    id: "back-end-participation",
    title: "Back-end participation and gain-share",
    publicSummary:
      "We earn back-end upside as the value thesis plays out, so our incentives point the same way as the business's.",
    implementationNote:
      "The form of back-end participation differs between engagements and may be structured in more than one way. Keep public wording instrument-neutral; the specific instrument, quantum, and tax treatment are for the engagement documents and require finance/legal review. Never describe the back-end as guaranteed.",
  },
  {
    id: "value-baseline-and-attribution",
    title: "Value baseline, targets, attribution, vesting, and realisation",
    publicSummary:
      "We agree the objectives and the evidence for them before delivery begins, and describe value as created during our engagement rather than caused by us alone.",
    implementationNote:
      "Baseline value, target outcomes, the attribution basis, any vesting, and the realisation mechanism are agreed and documented per engagement. Public claims use \"value created during our engagement\" language and never assert Helix alone caused the entire movement (see D-003 and the claims ledger).",
  },
  {
    id: "executive-and-board-alignment",
    title: "Executive and board alignment",
    publicSummary:
      "We need meaningful alignment with founders and executives, and with the board where relevant.",
    implementationNote:
      "Alignment means agreed objectives, decision rights, reporting, and approvals defined before the engagement, not an asserted governance role without a mechanism. Any board involvement is by agreement and does not by itself create a directorship.",
  },
  {
    id: "embedded-authority",
    title: "Embedded authority, access, and decision rights",
    publicSummary:
      "We work from inside the operating team against the agreed objectives.",
    implementationNote:
      "Being \"part of the operating team\" describes how we work, not a legal status: it does not create an employment, partnership, agency, directorship, or fiduciary relationship. The access and decision rights Helix holds while embedded are defined in the engagement documents.",
  },
  {
    id: "sustainable-handover",
    title: "Sustainable handover",
    publicSummary:
      "We build capability, systems, and ownership the business can sustain without Helix.",
    implementationNote:
      "Sustainable handover means the business can carry the result forward without ongoing dependence on Helix. Define the handover criteria per engagement.",
  },
  {
    id: "exit-versus-liquidity",
    title: "Exiting the engagement versus a company sale",
    publicSummary:
      "We then agree a clean exit from the engagement; that is separate from any decision the business makes about a sale or liquidity event.",
    implementationNote:
      "\"Exit\" refers to Helix leaving the active engagement, not a requirement that the company be sold. Realisation of the back-end may track a liquidity event by agreement, but the public wording must not imply that a sale is mandatory or inevitable.",
  },
];

/** The exact topic ids required, in the exact order (R-012). */
const REQUIRED_TOPIC_ORDER: readonly EngagementModelTopicId[] = [
  "pre-engagement-preparation",
  "cost-boundary",
  "independent-case-and-decline",
  "confidentiality-and-ip",
  "current-payment",
  "back-end-participation",
  "value-baseline-and-attribution",
  "executive-and-board-alignment",
  "embedded-authority",
  "sustainable-handover",
  "exit-versus-liquidity",
];

/**
 * Public wording §11.7 approves for the "How we work"/"We're different" copy.
 * This is documentary (it records what the sign-off covers); the enforced half of
 * the guardrail is {@link PROHIBITED_WORDING}.
 */
export const APPROVED_WORDING: readonly ApprovedPhrase[] = [
  {
    phrase: "at our own cost",
    reason:
      "Describes the unpaid preparation phase; bounded by the cost-boundary topic.",
  },
  {
    phrase: "paid as we deliver",
    reason: "Instrument-neutral current-payment wording (§11.7).",
  },
  {
    phrase: "back-end upside",
    reason: "Instrument-neutral back-end participation wording (§11.7).",
  },
  {
    phrase: "part of the operating team",
    reason:
      "Describes embedded delivery without assigning a legal status (§11.7).",
  },
  {
    phrase: "clean exit from the engagement",
    reason:
      "Helix exits the engagement; distinct from any company sale (§11.7).",
  },
];

/**
 * Wording that must never reach the "How we work"/"We're different" copy (§11.7
 * accuracy and legal guardrails). These complement the site-wide
 * `forbiddenCopy.ts` rules with the engagement-model-specific promises §11.7
 * bans: an employment relationship, a guaranteed result, a universal payment
 * claim, a mandatory sale, a fiduciary/agency/directorship representation, or an
 * over-specified/guaranteed back-end instrument.
 *
 * Patterns are case-insensitive and declared WITHOUT the global flag; the scanner
 * clones each with `g` per call so `lastIndex` is never shared between scans.
 */
export const PROHIBITED_WORDING: readonly ProhibitedPhrase[] = [
  {
    id: "employment-relationship",
    pattern:
      /\b(?:as|become|becoming|are|join(?:ing)?\s+as)\s+(?:your\s+|full[\s-]time\s+)*employees?\b/i,
    reason:
      "\"Part of the operating team\" must not imply an employment relationship (§11.7).",
  },
  {
    id: "on-your-payroll",
    pattern: /\bon\s+your\s+payroll\b/i,
    reason: "Embedded delivery must not be described as being on the payroll (§11.7).",
  },
  {
    id: "guaranteed-result",
    pattern:
      /\bguarantee(?:d|s)?\s+(?:a\s+|the\s+)?(?:result|outcome|valuation|multiple|success)\w*\b/i,
    reason: "The site must never guarantee an enterprise-value result (§11.7, §4).",
  },
  {
    id: "universal-payment-claim",
    pattern: /\bwe\s+(?:only\s+)?get\s+paid\s+when\s+you\s+get\s+paid\b/i,
    reason:
      "\"Get paid when you get paid\" is not true of every engagement; keep payment wording instrument-neutral (§11.7).",
  },
  {
    id: "mandatory-sale",
    pattern:
      /\b(?:must|required\s+to|have\s+to|obligated\s+to)\s+sell\s+(?:the|your)\s+(?:company|business)\b/i,
    reason: "\"Exit\" must not imply a mandatory sale of the company (§11.7).",
  },
  {
    id: "sale-required",
    pattern: /\b(?:requires?|mandatory|guaranteed)\s+(?:a\s+)?(?:company\s+)?(?:sale|liquidity\s+event)\b/i,
    reason:
      "A company sale or liquidity event must never be presented as required or inevitable (§11.7).",
  },
  {
    id: "fiduciary-agency-directorship",
    pattern:
      /\b(?:as|acting\s+as|serving\s+as)\s+(?:your\s+)?(?:fiduciary|agent|directors?)\b/i,
    reason:
      "Embedded delivery must not assert a fiduciary, agency, or directorship representation (§11.7).",
  },
  {
    id: "guaranteed-instrument",
    pattern: /\bguaranteed\s+(?:equity|options?|carry|gain[\s-]share|shares?|warrants?)\b/i,
    reason:
      "The back-end instrument varies per engagement and must never be described as guaranteed (§11.7).",
  },
];

const DRAFT_MARKERS: readonly string[] = [
  "draft",
  "not for publication",
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

/** One occurrence of prohibited wording found in scanned copy. */
export interface ProhibitedWordingHit {
  /** The `id` of the rule that matched. */
  id: string;
  /** Label of the copy source the match was found in. */
  source: string;
  /** The exact substring that triggered the match. */
  match: string;
  reason: string;
}

/**
 * Scan one copy string for every prohibited-wording occurrence. An empty array
 * means the copy is clean. Mirrors the safe-clone approach in `forbiddenCopy.ts`.
 */
export function scanProhibitedWording(
  source: string,
  text: string,
  rules: readonly ProhibitedPhrase[] = PROHIBITED_WORDING,
): ProhibitedWordingHit[] {
  const hits: ProhibitedWordingHit[] = [];
  for (const rule of rules) {
    const flags = rule.pattern.flags.includes("g")
      ? rule.pattern.flags
      : rule.pattern.flags + "g";
    const re = new RegExp(rule.pattern.source, flags);
    for (let m = re.exec(text); m !== null; m = re.exec(text)) {
      hits.push({ id: rule.id, source, match: m[0], reason: rule.reason });
      if (m.index === re.lastIndex) re.lastIndex += 1;
    }
  }
  return hits;
}

/**
 * The copy the engagement model governs: the "How we work" stages and framing,
 * and the "We're different because…" manifesto. Collected here so the guardrail
 * check has a single, testable view of everything §10/§11 ship.
 */
export function governedCopySources(
  steps: readonly HowWeWorkStep[] = howWeWorkSteps,
  howCopy: HowWeWorkCopy = howWeWorkCopy,
  points: readonly WhyHelixPoint[] = whyHelixPoints,
  whyCopy: WhyHelixCopy = whyHelixCopy,
): { label: string; text: string }[] {
  const sources: { label: string; text: string }[] = [
    { label: "how-we-work:framing", text: `${howCopy.eyebrow} ${howCopy.headline} ${howCopy.intro} ${howCopy.closing}` },
    { label: "why-helix:framing", text: `${whyCopy.eyebrow} ${whyCopy.headline} ${whyCopy.intro}` },
  ];
  for (const step of steps) {
    sources.push({ label: `how-we-work:${step.id}`, text: `${step.title} ${step.body}` });
  }
  for (const point of points) {
    sources.push({ label: `why-helix:${point.id}`, text: `${point.title} ${point.body}` });
  }
  return sources;
}

/**
 * Validate the engagement-model record against the R-012 / §11.7 rules and
 * cross-check the §10/§11 copy it governs. Returns the list of problems; an empty
 * list means the record is complete and the copy is clean. The production build
 * treats any non-empty result as fatal.
 */
export function validateEngagementModel(
  topics: readonly EngagementModelTopic[] = engagementModelTopics,
  steps: readonly HowWeWorkStep[] = howWeWorkSteps,
  howCopy: HowWeWorkCopy = howWeWorkCopy,
  points: readonly WhyHelixPoint[] = whyHelixPoints,
  whyCopy: WhyHelixCopy = whyHelixCopy,
): string[] {
  const errors: string[] = [];

  // --- Completeness: exactly the required topics, in the required order. ---
  if (topics.length !== REQUIRED_TOPIC_ORDER.length) {
    errors.push(
      `Expected exactly ${REQUIRED_TOPIC_ORDER.length} R-012 topics, found ${topics.length}.`,
    );
  }
  topics.forEach((topic, index) => {
    const expected = REQUIRED_TOPIC_ORDER[index];
    if (expected && topic.id !== expected) {
      errors.push(`Topic ${index + 1} must be "${expected}" but is "${topic.id}".`);
    }
  });

  // --- Per-topic content: both R-012 halves present and free of draft markers. ---
  for (const topic of topics) {
    if (!topic.title.trim()) errors.push(`Topic "${topic.id}" is missing a title.`);
    if (!topic.publicSummary.trim()) {
      errors.push(`Topic "${topic.id}" is missing its public-safe summary (R-012).`);
    }
    if (!topic.implementationNote.trim()) {
      errors.push(`Topic "${topic.id}" is missing its implementation note (R-012).`);
    }
    const haystack = `${topic.title} ${topic.publicSummary} ${topic.implementationNote}`;
    if (hasDraftMarker(haystack)) {
      errors.push(`Topic "${topic.id}" contains a forbidden draft marker.`);
    }
  }

  // The public-safe summary R-012 mandates must be present and clean.
  if (!PUBLIC_SAFE_SUMMARY.trim()) {
    errors.push("The record is missing its concise public-safe summary (R-012).");
  } else if (hasDraftMarker(PUBLIC_SAFE_SUMMARY)) {
    errors.push("The public-safe summary contains a forbidden draft marker.");
  }

  // The approved/prohibited wording lists must both be non-empty; the record's
  // whole purpose is to define what wording sign-off covers and bans (§11.7).
  if (APPROVED_WORDING.length === 0) {
    errors.push("The record must list the approved public wording (§11.7).");
  }
  if (PROHIBITED_WORDING.length === 0) {
    errors.push("The record must list the prohibited wording (§11.7).");
  }

  // --- Enforcement: the governed §10/§11 copy must carry no prohibited wording,
  //     and the public-safe summary itself must stay clean. ---
  const sources = [
    ...governedCopySources(steps, howCopy, points, whyCopy),
    { label: "engagement-model:public-summary", text: PUBLIC_SAFE_SUMMARY },
  ];
  for (const source of sources) {
    for (const hit of scanProhibitedWording(source.label, source.text)) {
      errors.push(
        `Prohibited wording "${hit.match}" [${hit.id}] in ${hit.source} — ${hit.reason}`,
      );
    }
  }

  return errors;
}

/**
 * Assert the engagement-model record is valid and the copy it governs is clean,
 * throwing on failure. Intended for build time so an incomplete record or a
 * §11.7-prohibited phrase in the shipped copy fails the production build.
 */
export function assertEngagementModelValid(
  topics: readonly EngagementModelTopic[] = engagementModelTopics,
  steps: readonly HowWeWorkStep[] = howWeWorkSteps,
  howCopy: HowWeWorkCopy = howWeWorkCopy,
  points: readonly WhyHelixPoint[] = whyHelixPoints,
  whyCopy: WhyHelixCopy = whyHelixCopy,
): void {
  const errors = validateEngagementModel(topics, steps, howCopy, points, whyCopy);
  if (errors.length > 0) {
    throw new Error(`Invalid engagement model:\n- ${errors.join("\n- ")}`);
  }
}

/** Comment written into the generated doc to discourage hand-edits. */
const DOC_COMMENT =
  "<!-- Generated from src/config/engagementModel.ts — do not edit by hand. -->";

/**
 * Render the exact markdown text of `docs/research/engagement-model.md` from this
 * model. `engagementModel.test.ts` asserts the committed file still matches, so
 * the printable R-012 record cannot drift from the code. Ends with a trailing
 * newline.
 */
export function renderEngagementModelDoc(
  topics: readonly EngagementModelTopic[] = engagementModelTopics,
): string {
  const lines: string[] = [
    "# Engagement-model validation (R-012)",
    "",
    DOC_COMMENT,
    "",
    "**Plan references:** §11.7 (accuracy and legal guardrails), §17.13 R-012.",
    `**Review status:** ${ENGAGEMENT_MODEL_REVIEW.status} — tracked by approval-queue item ${ENGAGEMENT_MODEL_REVIEW.queueItem} (category B: finance, legal, and the commercial owner).`,
    "",
    "This record documents the real operating model behind the \"How we work\" (§11)",
    "and \"We're different because…\" (§10) copy. It contains no confidential",
    "contracts or client materials; those are referenced in their secure locations.",
    "The \"How we work\" section cannot be marked production-ready until this record",
    "has commercial, finance, legal, and owner sign-off.",
    "",
    "## Public-safe summary",
    "",
    PUBLIC_SAFE_SUMMARY,
    "",
    "## Operating model",
    "",
  ];

  topics.forEach((topic, index) => {
    lines.push(
      `### ${index + 1}. ${topic.title}`,
      "",
      "**Public-safe summary:** " + topic.publicSummary,
      "",
      "**Implementation note:** " + topic.implementationNote,
      "",
    );
  });

  lines.push("## Approved public wording", "");
  for (const w of APPROVED_WORDING) {
    lines.push(`- \`${w.phrase}\` — ${w.reason}`);
  }
  lines.push("", "## Prohibited wording", "");
  for (const w of PROHIBITED_WORDING) {
    lines.push(`- **${w.id}** — ${w.reason}`);
  }
  lines.push("");

  return lines.join("\n") + "\n";
}
