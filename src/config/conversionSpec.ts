/**
 * Typed, self-validating conversion specification (implementation plan §17.10
 * R-009, output `docs/research/conversion-spec.md`; §13 final CTA, §20.3 single
 * CTA configuration; decision D-006).
 *
 * The entire site funnels to one conversion event: a qualified visitor opens the
 * approved Helix Calendly booking page (§3). The mechanism already ships —
 * `src/config/cta.ts` is the single source of the CTA label, analytics event, and
 * the build-time-injected booking URL, and every component (hero, final CTA, each
 * fit outcome) renders that one `primaryCta`. What was missing is the R-009 record
 * that ties those pieces to the open D-006 questions (the exact Calendly URL,
 * event type, tab behaviour, UTM parameters, confirmation behaviour, test-booking
 * procedure, notification recipients, and the visible email fallback) and keeps
 * the documented spec honest against the live code.
 *
 * Following the same convention as `analyticsAndPrivacy.ts` and
 * `claimsMethodology.ts`, this module is thin, pure content plus validation: it
 * renders no UI and wires no CTA. What it *adds* is a governance spine — the
 * §17.10 topics as structured data plus a small set of machine-checkable facts,
 * and build-time cross-checks that (a) the documented CTA label is exactly
 * `cta.ts`'s `PRIMARY_CTA_LABEL`, so a divergent documented label fails the build;
 * (b) the documented conversion event is exactly `cta.ts`'s
 * `CTA_ANALYTICS_EVENT` and a real analytics event; (c) the documented approved
 * booking hosts are exactly `cta.ts`'s `APPROVED_CTA_HOSTS`; (d) the three
 * positive fit outcomes each resolve to a distinct `fit_result_*` event while the
 * shared conversion event stays separate, substantiating the "same event"
 * answer; and (e) this record may only read "approved" once D-006 is actually
 * decided.
 *
 * `docs/research/conversion-spec.md` is generated from this model
 * (`renderConversionSpecDoc`) and `conversionSpec.test.ts` asserts the committed
 * file still matches, so the printable R-009 record cannot drift from the code.
 *
 * This module is pure content plus validation: no UI, no client-side state, no
 * I/O. It invents no owner decision — the exact Calendly URL, event type, and
 * email fallback stay unconfirmed (D-006 open), the honest current state.
 */

import {
  APPROVED_CTA_HOSTS,
  CTA_ANALYTICS_EVENT,
  PRIMARY_CTA_LABEL,
} from "./cta";
import { decisions, type DecisionRecord } from "./decisions";
import { footer } from "./footer";
import { fitResultEvent } from "../utils/analytics";
import { isAnalyticsEvent } from "../utils/analytics";
import type { NodeId } from "../components/fit/fitFlow";

/** Where the generated record lives, for the rendered header. */
export const CONVERSION_SPEC_DOC_PATH = "docs/research/conversion-spec.md";

/** The §6 decision that governs the booking action's open questions (D-006). */
export const GOVERNING_DECISION_ID = "D-0006-calendly";

/**
 * The record's review state. Like every pending content model, R-009 publishes
 * as the plan's working baseline now: one shared `cta_click` event, a same-tab
 * outbound link, and a footer email fallback once approved. It may only flip to
 * `approved` once the D-006 decision (exact URL, event type, UTMs, fallback) is
 * recorded — `validateConversionSpec` enforces that so the record can never claim
 * sign-off ahead of the decision.
 */
export const CONVERSION_SPEC_REVIEW = {
  status: "pending" as "pending" | "approved",
} as const;

/**
 * The three positive fit outcomes (§12.3). D-006 asks whether they share one
 * booking event; the answer is yes — every one renders the single `primaryCta`
 * and so fires the shared conversion event — while each also emits its own
 * discrete `fit_result_*` event. Validation cross-checks both halves of that.
 */
export const POSITIVE_FIT_OUTCOMES: readonly NodeId[] = [
  "growth-fit",
  "idea-fit",
  "community-fit",
];

/**
 * The §17.10 topics, in a fixed order. Together they cover the full R-009 list;
 * validation fails on a missing, extra, or reordered topic so the record can
 * never lose a rule.
 */
export type ConversionTopicId =
  | "calendly-url"
  | "cta-label"
  | "target-behaviour"
  | "utm-convention"
  | "analytics-event"
  | "fallback-email"
  | "shared-outcome-event"
  | "confirmation-behaviour"
  | "test-booking-procedure"
  | "booking-notifications";

/**
 * One R-009 topic. `governingDecision`, when present, links a topic that is
 * contingent on the open D-006 questions to the decision that resolves it.
 */
export interface ConversionTopic {
  id: ConversionTopicId;
  /** Human title, e.g. "Exact Calendly URL". */
  title: string;
  /** The documented position — the plan's working baseline. */
  statement: string;
  /** The §6 decision this topic waits on, if any. */
  governingDecision?: string;
}

/**
 * The §17.10 topics that must appear, exactly once, in this order. A dropped or
 * reordered topic is a governance hole, so validation fails on any mismatch.
 */
export const REQUIRED_TOPIC_IDS: readonly ConversionTopicId[] = [
  "calendly-url",
  "cta-label",
  "target-behaviour",
  "utm-convention",
  "analytics-event",
  "fallback-email",
  "shared-outcome-event",
  "confirmation-behaviour",
  "test-booking-procedure",
  "booking-notifications",
];

/**
 * The machine-checkable half of the spec. Each value is documented here as a
 * literal and cross-checked against the live `cta.ts` constant it mirrors, so the
 * printed record can never quietly drift from the code the site actually ships
 * (the same technique `analyticsAndPrivacy.ts` uses for its event list). The
 * fields are deliberately widened (not `as const`) so the cross-check has
 * something to catch: a drifted value is a build error reported by
 * `validateConversionSpec`, not a compile error hidden by a literal type.
 */
export interface ConversionFacts {
  /** Must equal `cta.ts`'s `PRIMARY_CTA_LABEL`. */
  ctaLabel: string;
  /** Must equal `cta.ts`'s `CTA_ANALYTICS_EVENT` and be a real analytics event. */
  conversionEvent: string;
  /** Must equal `cta.ts`'s `APPROVED_CTA_HOSTS`. */
  approvedHosts: readonly string[];
  /** The build-time variable the booking URL is injected from (Phase 9.3). */
  urlSource: string;
}

export const conversionFacts: ConversionFacts = {
  ctaLabel: "LET’S CREATE ENTERPRISE VALUE",
  conversionEvent: "cta_click",
  approvedHosts: ["calendly.com"],
  urlSource: "PUBLIC_CALENDLY_URL",
};

/**
 * The documented R-009 topics. The wording is the plan's working baseline: it
 * commits to no exact URL, event type, or email address while D-006 is open, and
 * records the honest current state (one shared same-tab `cta_click`, no email
 * fallback rendered yet because the address is unapproved).
 */
export const conversionTopics: readonly ConversionTopic[] = [
  {
    id: "calendly-url",
    title: "Exact Calendly URL",
    statement:
      "Not committed to source. The booking URL is injected at build time from the `PUBLIC_CALENDLY_URL` environment variable (Phase 9.3), so the approved production link is never in the repository and can differ between preview and production. The exact production path and event type are the open D-006 decision; `assertConfiguredCtaValid()` already fails the build if a configured URL is insecure or off an approved Calendly host.",
    governingDecision: GOVERNING_DECISION_ID,
  },
  {
    id: "cta-label",
    title: "CTA label",
    statement:
      "One label site-wide: “LET’S CREATE ENTERPRISE VALUE” (§13). It lives once in `cta.ts` as `PRIMARY_CTA_LABEL`; the hero, final CTA, and every fit outcome read it from `primaryCta`, and `findInconsistentCtaLabels()` catches any component that ships its own wording.",
  },
  {
    id: "target-behaviour",
    title: "Target behaviour",
    statement:
      "Same tab. The rendered CTA is a plain outbound link with no `target`, so the visitor navigates to Calendly in place — D-006's recommended default. It is an external link, not an embedded iframe (§5, Booking).",
    governingDecision: GOVERNING_DECISION_ID,
  },
  {
    id: "utm-convention",
    title: "UTM convention",
    statement:
      "None applied yet. Any UTM parameters belong on the approved `PUBLIC_CALENDLY_URL`, so they are part of the open D-006 decision rather than assembled in component code. When chosen, they are baked into the single injected URL so every CTA carries the same attribution.",
    governingDecision: GOVERNING_DECISION_ID,
  },
  {
    id: "analytics-event",
    title: "Analytics event",
    statement:
      "One event, `cta_click` (§20.3), fired by the delegated click listener in `src/utils/analytics.ts` whenever any element carrying `data-analytics-event=\"cta_click\"` is clicked. Every primary CTA carries that attribute from `primaryCta.analyticsEvent`, and the no-op-safe adapter means the call is a silent no-op until a provider is wired (D-011).",
  },
  {
    id: "fallback-email",
    title: "Fallback email",
    statement:
      "D-006's recommended default is a visible email fallback in the footer for when Calendly is unavailable. No such address is a recorded owner decision yet, so the footer carries no contact email today; it will be added as an approved footer identity fact (tracked with the other footer facts under Q-0010) once the address is confirmed. Until then the footer renders no fallback rather than an invented one.",
    governingDecision: GOVERNING_DECISION_ID,
  },
  {
    id: "shared-outcome-event",
    title: "Shared outcome event",
    statement:
      "Yes — all three positive fit outcomes (growth-fit, idea-fit, community-fit) use the same conversion event. Each renders the single `primaryCta`, so each fires the shared `cta_click` on booking, while additionally emitting its own discrete `fit_result_*` event so the funnel can tell the outcomes apart without tracking a visitor's answers (§12.4).",
  },
  {
    id: "confirmation-behaviour",
    title: "Expected Calendly confirmation behaviour",
    statement:
      "Owned by Calendly, not this site. After booking, Calendly shows its own confirmation and sends its own emails; the site's responsibility ends at the outbound link. The exact event type and its confirmation copy are part of the D-006 decision and must be checked during the test booking below.",
    governingDecision: GOVERNING_DECISION_ID,
  },
  {
    id: "test-booking-procedure",
    title: "Test booking procedure",
    statement:
      "Before launch, set `PUBLIC_CALENDLY_URL` to the approved link, build, and complete a real test booking from a production-like environment: confirm the CTA opens the correct event in the same tab, the confirmation screen and emails arrive, and the booking reaches the intended recipients. Record the result against D-006.",
    governingDecision: GOVERNING_DECISION_ID,
  },
  {
    id: "booking-notifications",
    title: "Who receives booking notifications",
    statement:
      "Configured in Calendly, outside this repository. Who is notified of a booking is part of the D-006 decision and is verified by the test booking rather than encoded in the site.",
    governingDecision: GOVERNING_DECISION_ID,
  },
];

/** Draft markers that must never appear in a documented statement. */
const DRAFT_MARKERS: readonly string[] = [
  "[verify",
  "[research",
  "todo",
  "tbd",
  "placeholder",
];

/** True if `text` contains any draft marker (case-insensitive). */
function hasDraftMarker(text: string): boolean {
  const lower = text.toLowerCase();
  return DRAFT_MARKERS.some((marker) => lower.includes(marker));
}

/** Order-independent equality between two string lists. */
function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((x) => set.has(x));
}

/**
 * Validate the R-009 record and cross-check it against the live CTA config, the
 * analytics adapter, the footer, and the decisions register. Returns the list of
 * problems; an empty list means the record is well-formed and complete. The
 * production build treats any non-empty result as fatal.
 */
export function validateConversionSpec(
  topics: readonly ConversionTopic[] = conversionTopics,
  facts: ConversionFacts = conversionFacts,
): string[] {
  const errors: string[] = [];

  // --- Topics: exactly the §17.10 set, in order, well-formed. ---
  const ids = topics.map((t) => t.id);
  if (
    ids.length !== REQUIRED_TOPIC_IDS.length ||
    ids.some((id, i) => id !== REQUIRED_TOPIC_IDS[i])
  ) {
    errors.push(
      `Conversion topics must be exactly [${REQUIRED_TOPIC_IDS.join(", ")}] in that order, found [${ids.join(", ")}].`,
    );
  }

  const decisionIds = new Set(decisions.map((d: DecisionRecord) => d.id));
  const seen = new Set<ConversionTopicId>();
  for (const topic of topics) {
    if (seen.has(topic.id)) {
      errors.push(`Duplicate conversion topic "${topic.id}".`);
    }
    seen.add(topic.id);

    if (!topic.title.trim()) {
      errors.push(`Conversion topic "${topic.id}" is missing a title.`);
    }
    if (!topic.statement.trim()) {
      errors.push(`Conversion topic "${topic.id}" is missing a statement.`);
    }
    if (hasDraftMarker(topic.statement)) {
      errors.push(`Conversion topic "${topic.id}" statement still contains a draft marker.`);
    }
    if (topic.governingDecision && !decisionIds.has(topic.governingDecision)) {
      errors.push(
        `Conversion topic "${topic.id}" links decision "${topic.governingDecision}", which is not in the decisions register.`,
      );
    }
  }

  // The record's anchor: the exact-URL topic must be governed by D-006.
  const url = topics.find((t) => t.id === "calendly-url");
  if (url && url.governingDecision !== GOVERNING_DECISION_ID) {
    errors.push(
      `The calendly-url topic must be governed by ${GOVERNING_DECISION_ID}.`,
    );
  }

  // --- Facts: exactly the live cta.ts constants, so the doc cannot drift. ---
  if (facts.ctaLabel !== PRIMARY_CTA_LABEL) {
    errors.push(
      `Documented CTA label "${facts.ctaLabel}" must be exactly cta.ts's PRIMARY_CTA_LABEL "${PRIMARY_CTA_LABEL}".`,
    );
  }
  if (facts.conversionEvent !== CTA_ANALYTICS_EVENT) {
    errors.push(
      `Documented conversion event "${facts.conversionEvent}" must be exactly cta.ts's CTA_ANALYTICS_EVENT "${CTA_ANALYTICS_EVENT}".`,
    );
  }
  if (!isAnalyticsEvent(facts.conversionEvent)) {
    errors.push(
      `Documented conversion event "${facts.conversionEvent}" is not one of the adapter's analytics events.`,
    );
  }
  if (!sameSet(facts.approvedHosts, APPROVED_CTA_HOSTS)) {
    errors.push(
      `Documented approved booking hosts [${facts.approvedHosts.join(", ")}] must be exactly cta.ts's APPROVED_CTA_HOSTS [${APPROVED_CTA_HOSTS.join(", ")}].`,
    );
  }
  if (!facts.urlSource.trim()) {
    errors.push("Documented URL source (the build-time env variable) is missing.");
  }

  // --- Positive outcomes: distinct fit_result_* events, separate from booking. ---
  const outcomeEvents = new Set<string>();
  for (const outcome of POSITIVE_FIT_OUTCOMES) {
    const event = fitResultEvent(outcome);
    if (!event) {
      errors.push(`Positive fit outcome "${outcome}" has no fit_result_* event.`);
      continue;
    }
    if (event === facts.conversionEvent) {
      errors.push(
        `Positive fit outcome "${outcome}" maps to the shared conversion event "${facts.conversionEvent}"; the two must stay distinct.`,
      );
    }
    if (outcomeEvents.has(event)) {
      errors.push(`Positive fit outcomes share the outcome event "${event}"; each must be distinct.`);
    }
    outcomeEvents.add(event);
  }

  // --- Fallback email: honest state — no unapproved contact email may ship. ---
  const contactEmail = footer.contactEmail;
  if (contactEmail && contactEmail.approval !== "approved") {
    errors.push(
      "The footer carries a contact email that is not approved; the fallback email must not ship until it clears its approval-queue item.",
    );
  }

  // --- Review state may not outrun the governing decision. ---
  const governing = decisions.find(
    (d: DecisionRecord) => d.id === GOVERNING_DECISION_ID,
  );
  if (!governing) {
    errors.push(
      `Governing decision "${GOVERNING_DECISION_ID}" is missing from the decisions register.`,
    );
  } else if (
    CONVERSION_SPEC_REVIEW.status === "approved" &&
    governing.status !== "decided"
  ) {
    errors.push(
      `R-009 is marked approved but its governing decision ${GOVERNING_DECISION_ID} is still ${governing.status}.`,
    );
  }

  return errors;
}

/**
 * Assert the R-009 record is valid and complete, throwing on failure. Intended
 * for build time so a documented CTA label/event/host that has drifted from
 * `cta.ts`, a dangling decision link, an unapproved footer email, or a record
 * claiming sign-off ahead of D-006 fails the build.
 */
export function assertConversionSpecValid(
  topics: readonly ConversionTopic[] = conversionTopics,
  facts: ConversionFacts = conversionFacts,
): void {
  const errors = validateConversionSpec(topics, facts);
  if (errors.length > 0) {
    throw new Error(`Invalid conversion specification:\n- ${errors.join("\n- ")}`);
  }
}

const DOC_COMMENT =
  "<!-- Generated from src/config/conversionSpec.ts — do not edit by hand. -->";

/**
 * Render the exact markdown text of `docs/research/conversion-spec.md` from this
 * model. `conversionSpec.test.ts` asserts the committed file still matches, so the
 * printable R-009 record cannot drift from the code. Ends with a trailing newline.
 */
export function renderConversionSpecDoc(
  topics: readonly ConversionTopic[] = conversionTopics,
  facts: ConversionFacts = conversionFacts,
): string {
  const lines: string[] = [
    "# Conversion specification (R-009)",
    "",
    DOC_COMMENT,
    "",
    "**Plan references:** §17.10 R-009, §13 (final CTA), §20.3 (single CTA configuration), decision D-006.",
    `**Review status:** ${CONVERSION_SPEC_REVIEW.status} — this document is the plan's working baseline; the exact Calendly URL, event type, UTMs, and email fallback are the open ${GOVERNING_DECISION_ID} decision, and this record may only be marked approved once that decision is recorded.`,
    "",
    "The site funnels to one conversion event: a qualified visitor opens the",
    "approved Helix Calendly booking page. The mechanism ships in `src/config/cta.ts`",
    "as the single `primaryCta` — one label, one analytics event, and a booking URL",
    "injected at build time — read by the hero, the final CTA, and every fit outcome.",
    "",
    "## Fixed configuration",
    "",
    `- **CTA label:** ${facts.ctaLabel}`,
    `- **Conversion event:** \`${facts.conversionEvent}\``,
    `- **Approved booking hosts:** ${facts.approvedHosts.join(", ")}`,
    `- **Booking URL source:** \`${facts.urlSource}\` (injected at build time; never committed)`,
    "",
    "## Specification",
    "",
  ];

  for (const topic of topics) {
    lines.push(
      `### ${topic.title}`,
      "",
      topic.statement,
      "",
      `- **Governing decision:** ${topic.governingDecision ?? "none"}`,
      "",
    );
  }

  lines.push(
    "## Positive fit outcomes share the conversion event",
    "",
    "All three positive outcomes render the single `primaryCta`, so each fires the",
    "shared conversion event on booking, while additionally emitting its own",
    "discrete outcome event (a category, never a visitor's answers):",
    "",
  );
  for (const outcome of POSITIVE_FIT_OUTCOMES) {
    lines.push(`- \`${outcome}\` → \`${fitResultEvent(outcome)}\` + \`${facts.conversionEvent}\``);
  }
  lines.push("");

  return lines.join("\n") + "\n";
}
