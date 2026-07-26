/**
 * Validated redirect model for the Cloudflare Pages `public/_redirects` file
 * (implementation plan §7 routes, P7-009 redirects, and the "Removing
 * `/contact-us` breaks links" risk in §25).
 *
 * The live Helix site exposes a `/contact-us` page. The rebuild folds contact
 * into the single site-wide Calendly CTA (§4 non-goals bar a custom contact
 * form), so `/contact-us` no longer exists as a route. Dropping it silently
 * would 404 every existing inbound link and lose the accumulated SEO signal, so
 * the plan requires a permanent redirect to the homepage.
 *
 * Cloudflare Pages reads redirect rules from a plain-text `_redirects` file at
 * the site root. This module is the single, testable source of truth for those
 * rules: it defines them as structured data, validates them (root-relative
 * paths, no self-loops, real redirect status codes, no duplicate sources), and
 * renders the exact file text. `public/_redirects` is the rendered output, and
 * `redirects.test.ts` asserts the committed file still matches this model so the
 * two can never drift.
 *
 * This module is pure configuration plus validation: no UI, no I/O.
 */

/** A single Cloudflare Pages redirect rule. */
export interface RedirectRule {
  /** Root-relative source path to match, e.g. "/contact-us". */
  from: string;
  /** Root-relative destination path, e.g. "/". */
  to: string;
  /**
   * HTTP redirect status. 301/308 are permanent (preserve SEO signal); 302/307
   * are temporary. `/contact-us` uses 301 because the page is gone for good.
   */
  status: RedirectStatus;
}

/** HTTP status codes valid for a redirect rule. */
export type RedirectStatus = 301 | 302 | 307 | 308;

/** The redirect status codes this model accepts. */
export const VALID_REDIRECT_STATUSES: readonly RedirectStatus[] = [
  301, 302, 307, 308,
];

/**
 * The site's redirect rules. Order is preserved in the rendered file; Cloudflare
 * applies the first matching rule.
 *
 * `/contact-us → / (301)` is the one rule the plan mandates (P7-009). Additional
 * rules discovered during the SEO/redirect audit (R-011) should be added here
 * with an approval-queue reference, never hand-edited into `public/_redirects`.
 */
export const REDIRECTS: readonly RedirectRule[] = [
  { from: "/contact-us", to: "/", status: 301 },
];

/** Header written at the top of the generated file to discourage hand-edits. */
const GENERATED_HEADER =
  "# Generated from src/config/redirects.ts — do not edit by hand.\n" +
  "# Cloudflare Pages redirect rules: <source> <destination> <status>\n";

/**
 * Validate a single redirect rule. Returns the list of problems; an empty list
 * means the rule is well-formed.
 */
export function validateRedirectRule(rule: RedirectRule): string[] {
  const errors: string[] = [];

  if (!rule.from.startsWith("/")) {
    errors.push(`Redirect source "${rule.from}" must be root-relative (start with "/").`);
  }
  if (/\s/.test(rule.from)) {
    errors.push(`Redirect source "${rule.from}" must not contain whitespace.`);
  }
  if (!rule.to.startsWith("/")) {
    errors.push(`Redirect destination "${rule.to}" must be root-relative (start with "/").`);
  }
  if (/\s/.test(rule.to)) {
    errors.push(`Redirect destination "${rule.to}" must not contain whitespace.`);
  }
  if (rule.from === rule.to) {
    errors.push(`Redirect "${rule.from}" points at itself, which would loop.`);
  }
  if (!VALID_REDIRECT_STATUSES.includes(rule.status)) {
    errors.push(
      `Redirect "${rule.from}" has status ${rule.status}; expected one of ${VALID_REDIRECT_STATUSES.join(", ")}.`,
    );
  }

  return errors;
}

/**
 * Validate the full set of redirect rules, including cross-rule checks. Returns
 * the list of problems; an empty list means every rule is well-formed and there
 * are no duplicate sources.
 */
export function validateRedirects(
  rules: readonly RedirectRule[] = REDIRECTS,
): string[] {
  const errors: string[] = [];

  for (const rule of rules) {
    errors.push(...validateRedirectRule(rule));
  }

  const seen = new Set<string>();
  for (const rule of rules) {
    if (seen.has(rule.from)) {
      errors.push(`Duplicate redirect source "${rule.from}"; each source may appear once.`);
    }
    seen.add(rule.from);
  }

  return errors;
}

/**
 * Assert the redirect rules are valid, throwing on failure. Intended for
 * build-time use so a malformed rule fails the build rather than shipping a
 * broken `_redirects` file.
 */
export function assertRedirectsValid(
  rules: readonly RedirectRule[] = REDIRECTS,
): void {
  const errors = validateRedirects(rules);
  if (errors.length > 0) {
    throw new Error(`Invalid redirects:\n- ${errors.join("\n- ")}`);
  }
}

/**
 * Render the exact text of the Cloudflare Pages `_redirects` file. Throws if the
 * rules are invalid so the rendered file is always well-formed. The output ends
 * with a trailing newline, as POSIX text files should.
 */
export function renderRedirectsFile(
  rules: readonly RedirectRule[] = REDIRECTS,
): string {
  assertRedirectsValid(rules);
  const lines = rules.map((rule) => `${rule.from}  ${rule.to}  ${rule.status}`);
  return `${GENERATED_HEADER}${lines.join("\n")}\n`;
}
