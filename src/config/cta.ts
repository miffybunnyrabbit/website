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
 * This module is pure configuration plus validation. The production build should
 * call `assertPrimaryCtaValid()` so a missing, insecure, or off-domain booking
 * URL fails the build instead of shipping a dead or wrong conversion action.
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

/** True when `host` is an approved host exactly or a subdomain of one. */
function isApprovedHost(host: string): boolean {
  const lower = host.toLowerCase();
  return APPROVED_CTA_HOSTS.some(
    (approved) => lower === approved || lower.endsWith(`.${approved}`),
  );
}

/**
 * Validate a CTA configuration against the section 20.3 rules. Returns the list
 * of problems; an empty list means the configuration is well-formed. The
 * production build should treat any non-empty result as fatal.
 */
export function validatePrimaryCta(cta: CtaConfig = primaryCta): string[] {
  const errors: string[] = [];

  // The label must match the single approved label. A differing label means a
  // component has introduced its own wording — the "inconsistent primary CTA
  // labels" failure the plan calls out.
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

  // The booking URL must be present, HTTPS, and on an approved host.
  const href = cta.href;
  if (!href || !href.trim()) {
    errors.push(
      "CTA URL is missing. Set PUBLIC_CALENDLY_URL to the approved Calendly booking link.",
    );
    return errors;
  }

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
 * Assert that every rendered CTA uses the one approved label. The plan requires
 * a single site-wide action; if any component ships a different label this
 * surfaces the divergence rather than letting two "primary" CTAs coexist.
 * Returns the list of offending labels (empty when all are consistent).
 */
export function findInconsistentCtaLabels(labels: readonly string[]): string[] {
  return [...new Set(labels.filter((label) => label !== PRIMARY_CTA_LABEL))];
}
