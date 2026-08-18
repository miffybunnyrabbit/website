/**
 * Single site-wide call-to-action configuration (implementation plan sections
 * 13, 20.3, and D-006).
 *
 * The whole site funnels to one conversion event: a qualified visitor opens the
 * approved Helix Calendly booking page. To keep that promise honest, the URL,
 * label, and analytics event live in exactly one place and are read from a
 * central value rather than hardcoded per component (section 13). The Calendly
 * URL itself is supplied at build time via the `PUBLIC_CALENDLY_URL` environment
 * variable so the approved production link is never committed to source and can
 * differ between preview and production.
 *
 * This module is pure configuration plus validation. The homepage build gate
 * calls `assertConfiguredCtaValid()` so an insecure or off-domain booking URL
 * fails the build instead of shipping a wrong conversion action. Presence of the
 * URL is enforced by the deploy environment rather than the build, because a
 * local `astro build` runs in the same `production` mode as the deploy with the
 * variable unset; `assertPrimaryCtaValid()` is the stricter check that also
 * treats an absent URL as fatal, for callers that require one.
 */

/** The single approved CTA label, in the plan's shouty display case (section 13). */
export const PRIMARY_CTA_LABEL = "LET’S CREATE ENTERPRISE VALUE";

/** The single approved analytics event fired on CTA click (section 20.3). */
export const CTA_ANALYTICS_EVENT = "cta_click";

/**
 * Hosts on which a booking URL is allowed to live. Helix books through
 * Calendly, so any other host is treated as a misconfiguration rather than a
 * silently-accepted redirect. A URL is accepted when its host is one of these
 * exactly or a subdomain of one (for example `helix.calendly.com`).
 */
export const APPROVED_CTA_HOSTS: readonly string[] = ["calendly.com"];

/**
 * The environment variable the booking URL is injected through at build time.
 * Named here rather than in the env documentation so the documented example and
 * the real gate cannot drift apart.
 */
export const CTA_URL_ENV_VAR = "PUBLIC_CALENDLY_URL";

export interface CtaConfig {
  /** Public button label. */
  label: string;
  /** Absolute booking URL; undefined when the environment variable is unset. */
  href: string | undefined;
  /** Analytics event name fired when the CTA is clicked. */
  analyticsEvent: string;
}

/**
 * The one primary CTA. `href` reads from the build-time environment so the
 * approved Calendly URL is injected rather than committed. Components must
 * import this value instead of hardcoding a URL or label of their own.
 */
export const primaryCta: CtaConfig = {
  label: PRIMARY_CTA_LABEL,
  href: import.meta.env.PUBLIC_CALENDLY_URL as string | undefined,
  analyticsEvent: CTA_ANALYTICS_EVENT,
};

/**
 * Copy for the single closing call-to-action section (section 13). The plan
 * replaces the old "build something" / "invest in ventures" split with one
 * action, so this section carries one headline, one supporting line, and the
 * one `primaryCta` button — never a second competing action. The button itself
 * always reads its URL and label from `primaryCta` above rather than from here,
 * keeping the conversion action in exactly one place (section 13).
 */
export interface FinalCtaCopy {
  /** Section heading, in the plan's shouty display case. */
  headline: string;
  /** Supporting line shown beneath the heading. */
  supportingLine: string;
}

/** The approved closing-CTA copy (section 13 working draft). */
export const finalCtaCopy: FinalCtaCopy = {
  headline: "SEE A CREDIBLE PATH TO MORE ENTERPRISE VALUE?",
  supportingLine:
    "Let’s work out whether Helix is the right partner to move it.",
};

/**
 * Draft markers and obvious placeholders that must never reach a production
 * build (kept lowercase; matching is case-insensitive).
 */
const CTA_DRAFT_MARKERS: readonly string[] = [
  "draft",
  "not for publication",
  "todo",
  "tbd",
  "placeholder",
  "lorem ipsum",
];

/**
 * Validate the closing-CTA copy. Returns the list of problems; an empty list
 * means the copy is well-formed. The production build should treat any
 * non-empty result as fatal so a missing or placeholder headline cannot ship.
 */
export function validateFinalCtaCopy(
  copy: FinalCtaCopy = finalCtaCopy,
): string[] {
  const errors: string[] = [];

  if (!copy.headline.trim()) {
    errors.push("Final CTA headline is missing.");
  }
  if (!copy.supportingLine.trim()) {
    errors.push("Final CTA supporting line is missing.");
  }

  const haystack = `${copy.headline} ${copy.supportingLine}`.toLowerCase();
  for (const marker of CTA_DRAFT_MARKERS) {
    if (haystack.includes(marker)) {
      errors.push(`Final CTA copy contains a forbidden draft marker "${marker}".`);
    }
  }

  return errors;
}

/**
 * Assert the closing-CTA copy is valid, throwing on failure. Intended for use
 * at render/build time so broken copy fails the build instead of shipping.
 */
export function assertFinalCtaCopyValid(copy: FinalCtaCopy = finalCtaCopy): void {
  const errors = validateFinalCtaCopy(copy);
  if (errors.length > 0) {
    throw new Error(`Invalid final CTA copy:\n- ${errors.join("\n- ")}`);
  }
}

/** True when `host` is an approved host exactly or a subdomain of one. */
function isApprovedHost(host: string): boolean {
  const lower = host.toLowerCase();
  return APPROVED_CTA_HOSTS.some(
    (approved) => lower === approved || lower.endsWith(`.${approved}`),
  );
}

/**
 * Validate the label and analytics event — the parts of the CTA that are
 * compile-time constants and so must be consistent in every build regardless of
 * environment. A differing label means a component has introduced its own
 * wording (the "inconsistent primary CTA labels" failure the plan calls out).
 */
function validateCtaMeta(cta: CtaConfig): string[] {
  const errors: string[] = [];

  if (!cta.label.trim()) {
    errors.push("CTA label is missing.");
  } else if (cta.label !== PRIMARY_CTA_LABEL) {
    errors.push(
      `CTA label "${cta.label}" does not match the single approved label "${PRIMARY_CTA_LABEL}".`,
    );
  }

  if (!cta.analyticsEvent.trim()) {
    errors.push("CTA analytics event is missing.");
  }

  return errors;
}

/**
 * Validate a booking URL that is already known to be present: it must be an
 * absolute HTTPS URL on an approved Calendly host. Returns the list of problems.
 */
function validateCtaUrl(href: string): string[] {
  const errors: string[] = [];

  let url: URL;
  try {
    url = new URL(href);
  } catch {
    errors.push(`CTA URL "${href}" is not a valid absolute URL.`);
    return errors;
  }

  if (url.protocol !== "https:") {
    errors.push(`CTA URL "${href}" must use HTTPS, not "${url.protocol}".`);
  }

  if (!isApprovedHost(url.hostname)) {
    errors.push(
      `CTA URL host "${url.hostname}" is not an approved Calendly host (${APPROVED_CTA_HOSTS.join(", ")}).`,
    );
  }

  return errors;
}

/** True when a booking URL has actually been supplied (a non-blank string). */
export function isCtaConfigured(cta: CtaConfig = primaryCta): boolean {
  return typeof cta.href === "string" && cta.href.trim().length > 0;
}

/**
 * Validate a CTA configuration against the section 20.3 rules, treating an
 * absent booking URL as a failure. Returns the list of problems; an empty list
 * means the configuration is fully deploy-ready. Use this where a booking URL is
 * required (for example an environment that is meant to have one).
 */
export function validatePrimaryCta(cta: CtaConfig = primaryCta): string[] {
  const errors = validateCtaMeta(cta);

  if (!isCtaConfigured(cta)) {
    errors.push(
      "CTA URL is missing. Set PUBLIC_CALENDLY_URL to the approved Calendly booking link.",
    );
    return errors;
  }

  return [...errors, ...validateCtaUrl(cta.href as string)];
}

/**
 * Validate the CTA as it stands in the current build. The booking URL is
 * injected at build time via `PUBLIC_CALENDLY_URL`; a production deploy always
 * sets it (Phase 9.3), but a local or preview `astro build` runs in the same
 * `production` mode with the variable unset. Failing the build on an *absent*
 * URL would therefore break every env-less build, so presence is left to the
 * deploy environment. What we can — and must — catch here is a URL that is
 * present but wrong: an insecure (`http:`) or off-domain booking link that would
 * ship a broken or hijacked conversion action. So this validates the URL only
 * once it is configured, while always guarding the constant label and event.
 */
export function validateConfiguredCta(cta: CtaConfig = primaryCta): string[] {
  const errors = validateCtaMeta(cta);

  if (isCtaConfigured(cta)) {
    errors.push(...validateCtaUrl(cta.href as string));
  }

  return errors;
}

/**
 * Assert the primary CTA configuration is valid, throwing on failure. Intended
 * for use at build time so a broken CTA configuration fails the production build.
 */
export function assertPrimaryCtaValid(cta: CtaConfig = primaryCta): void {
  const errors = validatePrimaryCta(cta);
  if (errors.length > 0) {
    throw new Error(`Invalid primary CTA configuration:\n- ${errors.join("\n- ")}`);
  }
}

/**
 * Assert the CTA is safe to render in the current build, throwing on failure.
 * This is the guard the production build actually runs (from the page that
 * mounts the CTA): it fails the build on an inconsistent label/event or a
 * configured-but-insecure/off-domain booking URL, but tolerates an absent URL
 * so env-less local and preview builds still succeed (see
 * {@link validateConfiguredCta}). Deploy environments set `PUBLIC_CALENDLY_URL`,
 * so the absent-URL case does not arise in production.
 */
export function assertConfiguredCtaValid(cta: CtaConfig = primaryCta): void {
  const errors = validateConfiguredCta(cta);
  if (errors.length > 0) {
    throw new Error(`Invalid primary CTA configuration:\n- ${errors.join("\n- ")}`);
  }
}

/**
 * Assert that every rendered CTA uses the one approved label. The plan requires
 * a single site-wide action; if any component ships a different label this
 * surfaces the divergence rather than letting two "primary" CTAs coexist.
 * Returns the list of offending labels (empty when all are consistent).
 */
export function findInconsistentCtaLabels(labels: readonly string[]): string[] {
  return [...new Set(labels.filter((label) => label !== PRIMARY_CTA_LABEL))];
}
