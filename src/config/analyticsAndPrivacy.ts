/**
 * Typed, self-validating analytics-and-privacy record (implementation plan
 * §17.12 R-011, output `docs/research/analytics-and-privacy.md`; decision
 * D-011).
 *
 * R-011 is the launch decision about measurement and data: what analytics the
 * site runs today, what it should run at launch, the cookie and privacy-policy
 * implications, data retention, the events the funnel is allowed to track, and —
 * just as important — the data it must never collect (a visitor's name, email,
 * free text, an entered revenue/EBITA figure, or Calendly form data).
 *
 * The mechanism already ships: `src/utils/analytics.ts` is a no-op-safe adapter
 * whose closed `ANALYTICS_EVENTS` enum is the *only* thing the site can emit, and
 * whether a provider is wired at all is the open D-011 decision. What was missing
 * is the R-011 record tying those pieces together and keeping them honest. This
 * module is that source of truth.
 *
 * Following the same convention as `claimsMethodology.ts` and `engagementModel.ts`,
 * it is thin, pure content plus validation: it renders no UI and wires no
 * provider. What it *adds* is a governance spine — the R-011 topics as structured
 * data, and build-time cross-checks that (a) the documented "events to track"
 * list is exactly the adapter's live `ANALYTICS_EVENTS` set, so a new event with
 * no R-011 documentation (or a documented event that no longer exists) fails the
 * build; (b) the topics contingent on the provider choice link to the real
 * D-011 decision; and (c) this record may only read "approved" once D-011 is
 * actually decided.
 *
 * `docs/research/analytics-and-privacy.md` is generated from this model
 * (`renderAnalyticsAndPrivacyDoc`) and `analyticsAndPrivacy.test.ts` asserts the
 * committed file still matches, so the printable R-011 record cannot drift from
 * the code.
 *
 * This module is pure content plus validation: no UI, no client-side state, no
 * I/O. It invents no owner decision — the analytics provider stays unchosen, the
 * honest current state.
 */

import { ANALYTICS_EVENTS, type AnalyticsEvent } from "../utils/analytics";
import { decisions, type DecisionRecord } from "./decisions";

/** Where the generated record lives, for the rendered header. */
export const ANALYTICS_AND_PRIVACY_DOC_PATH =
  "docs/research/analytics-and-privacy.md";

/** The §6 decision that governs whether — and which — analytics ships (D-011). */
export const GOVERNING_DECISION_ID = "D-0011-analytics";

/**
 * The record's review state. Like every pending content model, R-011 publishes
 * as the plan's working baseline now: the honest current state is "no provider
 * chosen, adapter collects nothing". It may only flip to `approved` once the
 * D-011 provider decision is actually recorded — `validateAnalyticsAndPrivacy`
 * enforces that so the record can never claim sign-off ahead of the decision.
 */
export const ANALYTICS_AND_PRIVACY_REVIEW = {
  status: "pending" as "pending" | "approved",
} as const;

/**
 * The R-011 topics, in a fixed order. Together they cover the full §17.12 list;
 * validation fails on a missing, extra, or reordered topic so the record can
 * never lose a rule.
 */
export type AnalyticsTopicId =
  | "current-analytics"
  | "desired-launch-analytics"
  | "cookie-implications"
  | "privacy-policy"
  | "data-retention";

/**
 * One R-011 topic. `governingDecision`, when present, links a topic that is
 * contingent on the provider choice to the decision that resolves it (D-011).
 */
export interface AnalyticsTopic {
  id: AnalyticsTopicId;
  /** Human title, e.g. "Current analytics". */
  title: string;
  /** The documented position — the plan's working baseline. */
  statement: string;
  /** The §6 decision this topic waits on, if any. */
  governingDecision?: string;
}

/**
 * The §17.12 topics that must appear, exactly once, in this order. A dropped or
 * reordered topic is a governance hole, so validation fails on any mismatch.
 */
export const REQUIRED_TOPIC_IDS: readonly AnalyticsTopicId[] = [
  "current-analytics",
  "desired-launch-analytics",
  "cookie-implications",
  "privacy-policy",
  "data-retention",
];

/**
 * The documented R-011 topics. The wording is the plan's working baseline: it
 * commits to no provider while D-011 is open, and records the honest "collects
 * nothing at launch" default that the no-op adapter already implements.
 */
export const analyticsTopics: readonly AnalyticsTopic[] = [
  {
    id: "current-analytics",
    title: "Current analytics",
    statement:
      "None in production. `src/utils/analytics.ts` ships a no-op-safe adapter: until `configureAnalytics()` installs a sink, every `track()` call is a silent no-op, so the site collects and transmits nothing.",
  },
  {
    id: "desired-launch-analytics",
    title: "Desired launch analytics",
    statement:
      "Unconfirmed — whether the launch needs Cloudflare Web Analytics, an existing Google Analytics/Tag Manager property, or no analytics at all is the open D-011 decision. The recommended default is to ship the no-op adapter and collect only the minimum funnel events once a provider is chosen; a single `configureAnalytics(...)` call in the layout then wires it without touching any component.",
    governingDecision: GOVERNING_DECISION_ID,
  },
  {
    id: "cookie-implications",
    title: "Cookie implications",
    statement:
      "The no-op adapter sets no cookies and stores nothing, so the launch default has no cookie or consent obligation. A chosen provider's cookie behaviour must be assessed before it is wired; a cookie-setting provider may require a consent mechanism and a privacy page (see below). Cloudflare Web Analytics is cookie-free, which is why it is the recommended provider if any is needed.",
    governingDecision: GOVERNING_DECISION_ID,
  },
  {
    id: "privacy-policy",
    title: "Privacy-policy requirements",
    statement:
      "`/privacy` is optional (§7): it is only required if analytics, legal advice, or the chosen Calendly treatment demands it. Because the launch default collects nothing, no privacy page is required until a data-collecting provider (or a Calendly treatment that sets cookies) is introduced.",
    governingDecision: GOVERNING_DECISION_ID,
  },
  {
    id: "data-retention",
    title: "Data-retention requirements",
    statement:
      "Nothing is collected at launch, so there is nothing to retain. Once a provider is chosen, retention is set to the minimum the funnel needs, documented here, and never applied to any of the never-tracked data below.",
    governingDecision: GOVERNING_DECISION_ID,
  },
];

/** One event the funnel is allowed to track, with why it exists. */
export interface TrackedEventDoc {
  /** Must be one of the adapter's `ANALYTICS_EVENTS`. */
  event: AnalyticsEvent;
  /** What the event measures. */
  purpose: string;
}

/**
 * The events R-011 documents. The `event` field is typed as `AnalyticsEvent`, so
 * a typo is a compile error; validation additionally asserts this list is exactly
 * the adapter's live `ANALYTICS_EVENTS` set, so the two can never drift. The
 * §17.12 recommended list named four fit outcomes; the adapter added
 * `fit_result_not_current_fit` so all five outcomes have a discrete event, and
 * this record documents that extension rather than hiding it.
 */
export const trackedEvents: readonly TrackedEventDoc[] = [
  {
    event: "cta_click",
    purpose:
      "A visitor opened the single booking CTA — the primary conversion event.",
  },
  {
    event: "fit_flow_started",
    purpose: "A visitor began the interactive fit qualifier.",
  },
  {
    event: "fit_flow_completed",
    purpose: "A visitor reached any fit outcome.",
  },
  {
    event: "fit_result_growth",
    purpose: "The qualifier resolved to the growth-fit outcome (a category, never the answers).",
  },
  {
    event: "fit_result_idea",
    purpose: "The qualifier resolved to the idea-fit outcome.",
  },
  {
    event: "fit_result_community",
    purpose: "The qualifier resolved to the community/builder-energy outcome.",
  },
  {
    event: "fit_result_not_current_fit",
    purpose: "The qualifier resolved to the not-current-fit outcome.",
  },
  {
    event: "fit_result_no_fit",
    purpose: "The qualifier resolved to the no-fit outcome.",
  },
];

/**
 * Data the site must never collect (§17.12, §12.4). This is a structural
 * guarantee, not a policy hope: the adapter can only emit a bare name from a
 * fixed enum with no payload, so none of the below can be transmitted. The list
 * is documented so any future provider wiring stays inside these bounds.
 */
export const NEVER_TRACKED: readonly string[] = [
  "A visitor's name",
  "An email address",
  "Any free text a visitor types",
  "A revenue or EBITA figure a visitor enters in the fit qualifier",
  "Any Calendly booking-form data",
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
 * Validate the R-011 record and cross-check it against the live analytics
 * adapter and the decisions register. Returns the list of problems; an empty
 * list means the record is well-formed and complete. The production build treats
 * any non-empty result as fatal.
 */
export function validateAnalyticsAndPrivacy(
  topics: readonly AnalyticsTopic[] = analyticsTopics,
  events: readonly TrackedEventDoc[] = trackedEvents,
): string[] {
  const errors: string[] = [];

  // --- Topics: exactly the §17.12 set, in order, well-formed. ---
  const ids = topics.map((t) => t.id);
  if (
    ids.length !== REQUIRED_TOPIC_IDS.length ||
    ids.some((id, i) => id !== REQUIRED_TOPIC_IDS[i])
  ) {
    errors.push(
      `Analytics topics must be exactly [${REQUIRED_TOPIC_IDS.join(", ")}] in that order, found [${ids.join(", ")}].`,
    );
  }

  const decisionIds = new Set(decisions.map((d: DecisionRecord) => d.id));
  const seen = new Set<AnalyticsTopicId>();
  for (const topic of topics) {
    if (seen.has(topic.id)) {
      errors.push(`Duplicate analytics topic "${topic.id}".`);
    }
    seen.add(topic.id);

    if (!topic.title.trim()) {
      errors.push(`Analytics topic "${topic.id}" is missing a title.`);
    }
    if (!topic.statement.trim()) {
      errors.push(`Analytics topic "${topic.id}" is missing a statement.`);
    }
    if (hasDraftMarker(topic.statement)) {
      errors.push(`Analytics topic "${topic.id}" statement still contains a draft marker.`);
    }
    if (topic.governingDecision && !decisionIds.has(topic.governingDecision)) {
      errors.push(
        `Analytics topic "${topic.id}" links decision "${topic.governingDecision}", which is not in the decisions register.`,
      );
    }
  }

  // The record's anchor: the launch-analytics choice must be governed by D-011.
  const launch = topics.find((t) => t.id === "desired-launch-analytics");
  if (launch && launch.governingDecision !== GOVERNING_DECISION_ID) {
    errors.push(
      `The desired-launch-analytics topic must be governed by ${GOVERNING_DECISION_ID}.`,
    );
  }

  // --- Events: exactly the adapter's live enum, each with a purpose. ---
  const documented = events.map((e) => e.event);
  const documentedSet = new Set(documented);
  if (documentedSet.size !== documented.length) {
    errors.push("Analytics events documentation lists a duplicate event.");
  }
  if (!sameSet(documented, ANALYTICS_EVENTS)) {
    const missing = ANALYTICS_EVENTS.filter((e) => !documentedSet.has(e));
    const extra = documented.filter(
      (e) => !ANALYTICS_EVENTS.includes(e as AnalyticsEvent),
    );
    errors.push(
      `Documented events must be exactly the adapter's ANALYTICS_EVENTS.${
        missing.length ? ` Missing: [${missing.join(", ")}].` : ""
      }${extra.length ? ` Extra: [${extra.join(", ")}].` : ""}`,
    );
  }
  for (const doc of events) {
    if (!doc.purpose.trim()) {
      errors.push(`Tracked event "${doc.event}" is missing a purpose.`);
    }
  }

  // --- Never-tracked list must be present and well-formed. ---
  if (NEVER_TRACKED.length === 0) {
    errors.push("The never-tracked list must record the data R-011 forbids.");
  }
  for (const item of NEVER_TRACKED) {
    if (!item.trim()) {
      errors.push("The never-tracked list has an empty entry.");
    }
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
    ANALYTICS_AND_PRIVACY_REVIEW.status === "approved" &&
    governing.status !== "decided"
  ) {
    errors.push(
      `R-011 is marked approved but its governing decision ${GOVERNING_DECISION_ID} is still ${governing.status}.`,
    );
  }

  return errors;
}

/**
 * Assert the R-011 record is valid and complete, throwing on failure. Intended
 * for build time so a drifted event list, a dangling decision link, or a record
 * claiming sign-off ahead of D-011 fails the build.
 */
export function assertAnalyticsAndPrivacyValid(
  topics: readonly AnalyticsTopic[] = analyticsTopics,
  events: readonly TrackedEventDoc[] = trackedEvents,
): void {
  const errors = validateAnalyticsAndPrivacy(topics, events);
  if (errors.length > 0) {
    throw new Error(`Invalid analytics-and-privacy record:\n- ${errors.join("\n- ")}`);
  }
}

const DOC_COMMENT =
  "<!-- Generated from src/config/analyticsAndPrivacy.ts — do not edit by hand. -->";

/**
 * Render the exact markdown text of `docs/research/analytics-and-privacy.md`
 * from this model. `analyticsAndPrivacy.test.ts` asserts the committed file
 * still matches, so the printable R-011 record cannot drift from the code. Ends
 * with a trailing newline.
 */
export function renderAnalyticsAndPrivacyDoc(
  topics: readonly AnalyticsTopic[] = analyticsTopics,
  events: readonly TrackedEventDoc[] = trackedEvents,
): string {
  const lines: string[] = [
    "# Analytics and privacy (R-011)",
    "",
    DOC_COMMENT,
    "",
    "**Plan references:** §17.12 R-011, §12.4 (no personal data in the fit qualifier), decision D-011.",
    `**Review status:** ${ANALYTICS_AND_PRIVACY_REVIEW.status} — this document is the plan's working baseline; the provider choice is the open ${GOVERNING_DECISION_ID} decision, and this record may only be marked approved once that decision is recorded.`,
    "",
    "The mechanism ships in `src/utils/analytics.ts`: a no-op-safe adapter whose",
    "closed `ANALYTICS_EVENTS` enum is the only thing the site can emit. Until a",
    "provider is chosen and wired, the site collects nothing.",
    "",
    "## Current state and launch plan",
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
    "## Events to track",
    "",
    "Exactly the adapter's `ANALYTICS_EVENTS`; each carries no payload — a bare",
    "name from a fixed enum.",
    "",
  );
  for (const doc of events) {
    lines.push(`- \`${doc.event}\` — ${doc.purpose}`);
  }
  lines.push("");

  lines.push(
    "## Events never tracked",
    "",
    "Structurally impossible for the adapter to send (§17.12, §12.4). The fit",
    "qualifier reports which outcome category a visitor reached, never their",
    "answers.",
    "",
  );
  for (const item of NEVER_TRACKED) {
    lines.push(`- ${item}`);
  }

  return lines.join("\n") + "\n";
}
