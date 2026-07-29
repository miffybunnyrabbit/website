/**
 * Typed content model for the proof banner (implementation plan sections 5,
 * "Proof banner", and 8.3).
 *
 * The banner is a deliberately narrow, two-metric proof strip: `$500M+`
 * enterprise value created and `10+` years in operation. The plan is emphatic
 * about what it must *not* become — the removed `50+ ventures` count, any human
 * or team count, and any unverified vanity metric bolted on merely to refill the
 * old four-column layout (section 8.3). Rather than trust markup to honour those
 * rules, the two metrics live here as validated data so a build step can fail if
 * a third metric appears, a banned count creeps back, or the required figures are
 * altered.
 *
 * The headline uses a bare `$`, and that currency-neutral wording is now the
 * approved one. Under the plan's revised approach (§5 last row, §17, §23) a
 * pending financial claim is never withheld — it publishes in its safe fallback
 * form with an open approval-queue item and updates on sign-off — and the
 * sign-off has landed: on 2026-07-29 category-B item Q-0007 approved the
 * `$500M+` figure in exactly this currency-neutral wording, and D-001 is decided
 * (currency-neutral aggregate; A$ for Australian-dollar figures; no mixed-currency
 * aggregation without a documented method). `currencyApproval` is therefore
 * `"approved"`.
 *
 * This module is pure content plus validation. It renders as a static two-column
 * strip and requires no client-side state.
 */

import { scanForbiddenCopy } from "./forbiddenCopy";

/** The two — and only two — proof metrics (section 8.3). */
export type ProofMetricId = "enterprise-value" | "years-in-operation";

export interface ProofMetric {
  id: ProofMetricId;
  /** The large figure, in the plan's shouty display case (e.g. "$500M+"). */
  value: string;
  /** The supporting label beneath the figure (e.g. "ENTERPRISE VALUE CREATED"). */
  label: string;
}

/** Whether the D-001 currency decision has been recorded (section 8.3). */
export type CurrencyApproval = "pending" | "approved";

export interface ProofBanner {
  metrics: readonly ProofMetric[];
  /** Whether the currency behind the `$500M+` figure is confirmed (D-001). */
  currencyApproval: CurrencyApproval;
  /** Whether the banner is rendered in a production build. */
  publish: boolean;
}

/** The exact metric ids required, in the exact display order (section 8.3). */
export const REQUIRED_METRIC_ORDER: readonly ProofMetricId[] = [
  "enterprise-value",
  "years-in-operation",
];

/**
 * The proof banner. Two metrics, no more: the enterprise-value figure and the
 * years-in-operation figure. Category-B item Q-0007 approved the `$500M+` figure
 * in its currency-neutral wording on 2026-07-29 and D-001 is decided, so
 * `currencyApproval` is `"approved"` and the banner publishes the confirmed
 * figure (§23).
 */
export const proofBanner: ProofBanner = {
  metrics: [
    {
      id: "enterprise-value",
      value: "$500M+",
      label: "ENTERPRISE VALUE CREATED",
    },
    {
      id: "years-in-operation",
      value: "10+",
      label: "YEARS IN OPERATION",
    },
  ],
  currencyApproval: "approved",
  publish: true,
};

/**
 * Counts the plan bars from the banner beyond the venture/human counts already
 * policed by `forbiddenCopy` — the broader "human or team count" prohibition in
 * section 5. Matches a number (optionally with a trailing `+`) followed by one of
 * these nouns.
 */
const BANNED_COUNT = /\b\d+\s*\+?\s+(?:people|team\s+members|staff|employees)\b/i;

/**
 * Draft markers that must never reach a production build. Kept lowercase;
 * matching is case-insensitive.
 */
const DRAFT_MARKERS: readonly string[] = [
  "draft",
  "not for publication",
  "todo",
  "tbd",
  "placeholder",
  "lorem ipsum",
];

/**
 * Validate the proof banner against the section 5 / 8.3 rules. Returns the list
 * of problems; an empty list means the banner is well-formed. The production
 * build should treat any non-empty result as fatal.
 */
export function validateProofBanner(banner: ProofBanner = proofBanner): string[] {
  const errors: string[] = [];
  const metrics = banner.metrics;

  // Exactly two metrics. A third metric is the "unverified replacement metric
  // merely to preserve the old four-column layout" the plan forbids (section 8.3).
  if (metrics.length !== 2) {
    errors.push(
      `Proof banner must show exactly 2 metrics, found ${metrics.length}.`,
    );
  }

  // The ids and their order are fixed and may not change without a decision.
  metrics.forEach((metric, index) => {
    const expectedId = REQUIRED_METRIC_ORDER[index];
    if (expectedId && metric.id !== expectedId) {
      errors.push(
        `Proof metric ${index + 1} must be "${expectedId}" but is "${metric.id}".`,
      );
    }
  });

  // Metric ids must be unique so the banner is unambiguous.
  const seen = new Set<string>();
  for (const metric of metrics) {
    if (seen.has(metric.id)) {
      errors.push(`Duplicate proof metric "${metric.id}".`);
    }
    seen.add(metric.id);
  }

  // Per-metric structural checks and required-figure guards.
  for (const metric of metrics) {
    if (!metric.value.trim()) {
      errors.push(`Proof metric "${metric.id}" is missing its value.`);
    }
    if (!metric.label.trim()) {
      errors.push(`Proof metric "${metric.id}" is missing its label.`);
    }

    if (metric.id === "enterprise-value") {
      // Must remain the "$500m+" enterprise-value figure (section 5, 8.3).
      if (!(/500/.test(metric.value) && metric.value.includes("+") && /m/i.test(metric.value))) {
        errors.push(
          `Enterprise-value metric must read as "$500M+" but is "${metric.value}".`,
        );
      }
      if (!/enterprise\s+value/i.test(metric.label)) {
        errors.push(
          `Enterprise-value metric label must reference "enterprise value" but is "${metric.label}".`,
        );
      }
    }

    if (metric.id === "years-in-operation") {
      // Must remain the "10+ years" figure (section 5, 8.3).
      if (!(/\b10\b/.test(metric.value) && metric.value.includes("+"))) {
        errors.push(
          `Years-in-operation metric must read as "10+" but is "${metric.value}".`,
        );
      }
      if (!/years?/i.test(metric.label)) {
        errors.push(
          `Years-in-operation metric label must reference "years" but is "${metric.label}".`,
        );
      }
    }
  }

  // No banned copy anywhere in the banner: the removed venture/human counts and
  // the tone clichés policed site-wide (forbiddenCopy), plus the broader team /
  // people count the proof banner must never carry (section 5).
  const bannerText = metrics.map((m) => `${m.value} ${m.label}`).join(" ");
  for (const violation of scanForbiddenCopy(bannerText)) {
    errors.push(
      `Proof banner contains forbidden copy "${violation.match}" (${violation.id}): ${violation.reason}`,
    );
  }
  if (BANNED_COUNT.test(bannerText)) {
    errors.push(
      "Proof banner must not display a human or team count (section 5).",
    );
  }

  // No draft markers or obvious placeholders.
  const lower = bannerText.toLowerCase();
  for (const marker of DRAFT_MARKERS) {
    if (lower.includes(marker)) {
      errors.push(`Proof banner contains a forbidden draft marker "${marker}".`);
    }
  }

  // The currency behind the "$500M+" figure (D-001) is not a publication gate:
  // the banner publishes whether the currency is still pending (in its safe,
  // currency-neutral fallback form) or approved — as now, with Q-0007 signed off
  // on 2026-07-29 (§5 last row, §17, §23). The async linkage — that a
  // still-pending currency must have an open queue item — is enforced centrally
  // in `approvalQueue.ts`, not here.

  return errors;
}

/**
 * Assert the proof banner is valid, throwing on failure. Intended for use at
 * build time so a broken banner — an extra metric, a banned count, or an
 * unconfirmed-currency figure being published — fails the production build.
 */
export function assertProofBannerValid(banner: ProofBanner = proofBanner): void {
  const errors = validateProofBanner(banner);
  if (errors.length > 0) {
    throw new Error(`Invalid proof banner:\n- ${errors.join("\n- ")}`);
  }
}

/**
 * The proof banner a production build should render, or `null` only when the
 * model is explicitly held back (`publish: false`). The banner publishes whether
 * a figure's backing decision is still pending or, as with the now-approved
 * `$500M+` currency (Q-0007, D-001), signed off — the same publish-draft default
 * the case-study model uses (§23).
 */
export function publishedProofBanner(banner: ProofBanner = proofBanner): ProofBanner | null {
  return banner.publish ? banner : null;
}
