/**
 * Validated security-header model for the Cloudflare Pages `public/_headers`
 * file (implementation plan P7-008 security headers, and the "security headers"
 * acceptance items in §24).
 *
 * Cloudflare Pages attaches response headers to matching routes from a plain-text
 * `_headers` file at the site root: a path-pattern line at column zero, followed
 * by indented `Name: value` lines that apply to every response under that path.
 *
 * This module is the single, testable source of truth for those rules. It
 * defines them as structured data, validates them (root-relative path patterns,
 * well-formed header names and values, no duplicate headers within a rule, no
 * duplicate path blocks), and renders the exact file text. `public/_headers` is
 * the rendered output, and `securityHeaders.test.ts` asserts the committed file
 * still matches this model so the two can never drift.
 *
 * Scope follows the plan's P7-008 "candidate policy" exactly:
 *
 *   - `X-Content-Type-Options: nosniff` — stop MIME-type sniffing.
 *   - `Referrer-Policy: strict-origin-when-cross-origin` — trim referrer detail
 *     sent to third parties (e.g. the Calendly booking navigation).
 *   - `Permissions-Policy: camera=(), microphone=(), geolocation=()` — deny
 *     powerful features the marketing site never uses.
 *   - `X-Frame-Options: DENY` — refuse framing, defending against clickjacking.
 *
 * Deliberately NOT set here, per the plan:
 *
 *   - `Content-Security-Policy` — added only after fonts, analytics, and the
 *     Calendly navigation are tested, to avoid a broad wildcard policy.
 *   - `Strict-Transport-Security` (HSTS) — managed at the Cloudflare zone level
 *     once the domain is stable, not from this file.
 *
 * This module is pure configuration plus validation: no UI, no I/O.
 */

/** A single response header attached to matching routes. */
export interface SecurityHeader {
  /** Header field name, e.g. "X-Frame-Options". */
  name: string;
  /** Header field value, e.g. "DENY". */
  value: string;
}

/** A block of headers applied to every response under one path pattern. */
export interface HeaderRule {
  /** Root-relative path pattern to match, e.g. "/*". */
  path: string;
  /** Headers to attach to matching responses; at least one. */
  headers: readonly SecurityHeader[];
}

/**
 * Header names this model refuses to render here because the plan places them
 * elsewhere: CSP waits until external dependencies are known, and HSTS is
 * managed at the Cloudflare zone level. Compared case-insensitively, as HTTP
 * field names are.
 */
export const DEFERRED_HEADER_NAMES: readonly string[] = [
  "Content-Security-Policy",
  "Strict-Transport-Security",
];

/**
 * The site's response-header rules. Order is preserved in the rendered file.
 *
 * The single `/*` block carries the plan's P7-008 candidate policy. Additional
 * rules discovered during the security review should be added here with an
 * approval-queue reference, never hand-edited into `public/_headers`.
 */
export const HEADER_RULES: readonly HeaderRule[] = [
  {
    path: "/*",
    headers: [
      { name: "X-Content-Type-Options", value: "nosniff" },
      { name: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        name: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      { name: "X-Frame-Options", value: "DENY" },
    ],
  },
];

/** Header written at the top of the generated file to discourage hand-edits. */
const GENERATED_HEADER =
  "# Generated from src/config/securityHeaders.ts — do not edit by hand.\n" +
  "# Cloudflare Pages response headers: <path> then indented <Name: value> lines.\n";

/**
 * Validate a single header field. Returns the list of problems; an empty list
 * means the field is well-formed.
 */
export function validateSecurityHeader(header: SecurityHeader): string[] {
  const errors: string[] = [];

  if (header.name.trim() === "") {
    errors.push("Header name must not be empty.");
  }
  if (/\s/.test(header.name)) {
    errors.push(`Header name "${header.name}" must not contain whitespace.`);
  }
  if (header.name.includes(":")) {
    errors.push(`Header name "${header.name}" must not contain a colon.`);
  }
  if (header.value.trim() === "") {
    errors.push(`Header "${header.name}" must have a non-empty value.`);
  }
  if (/[\r\n]/.test(header.value)) {
    errors.push(`Header "${header.name}" value must not contain a line break.`);
  }
  if (
    DEFERRED_HEADER_NAMES.some(
      (deferred) => deferred.toLowerCase() === header.name.trim().toLowerCase(),
    )
  ) {
    errors.push(
      `Header "${header.name}" is managed elsewhere (CSP after dependency testing; HSTS at the zone level) and must not be set in public/_headers.`,
    );
  }

  return errors;
}

/**
 * Validate a single header rule, including its path pattern and per-rule checks.
 * Returns the list of problems; an empty list means the rule is well-formed.
 */
export function validateHeaderRule(rule: HeaderRule): string[] {
  const errors: string[] = [];

  if (!rule.path.startsWith("/")) {
    errors.push(`Header path "${rule.path}" must be root-relative (start with "/").`);
  }
  if (/\s/.test(rule.path)) {
    errors.push(`Header path "${rule.path}" must not contain whitespace.`);
  }
  if (rule.headers.length === 0) {
    errors.push(`Header path "${rule.path}" has no headers; each block needs at least one.`);
  }

  for (const header of rule.headers) {
    errors.push(...validateSecurityHeader(header));
  }

  const seen = new Set<string>();
  for (const header of rule.headers) {
    const key = header.name.trim().toLowerCase();
    if (seen.has(key)) {
      errors.push(
        `Duplicate header "${header.name}" under "${rule.path}"; each header may appear once per block.`,
      );
    }
    seen.add(key);
  }

  return errors;
}

/**
 * Validate the full set of header rules, including cross-rule checks. Returns the
 * list of problems; an empty list means every rule is well-formed and there are
 * no duplicate path blocks.
 */
export function validateSecurityHeaders(
  rules: readonly HeaderRule[] = HEADER_RULES,
): string[] {
  const errors: string[] = [];

  for (const rule of rules) {
    errors.push(...validateHeaderRule(rule));
  }

  const seen = new Set<string>();
  for (const rule of rules) {
    if (seen.has(rule.path)) {
      errors.push(`Duplicate header path "${rule.path}"; each path may appear once.`);
    }
    seen.add(rule.path);
  }

  return errors;
}

/**
 * Assert the header rules are valid, throwing on failure. Intended for build-time
 * use so a malformed rule fails the build rather than shipping a broken
 * `_headers` file.
 */
export function assertSecurityHeadersValid(
  rules: readonly HeaderRule[] = HEADER_RULES,
): void {
  const errors = validateSecurityHeaders(rules);
  if (errors.length > 0) {
    throw new Error(`Invalid security headers:\n- ${errors.join("\n- ")}`);
  }
}

/**
 * Render the exact text of the Cloudflare Pages `_headers` file. Throws if the
 * rules are invalid so the rendered file is always well-formed. Each block is a
 * path line followed by two-space-indented `Name: value` lines. The output ends
 * with a trailing newline, as POSIX text files should.
 */
export function renderHeadersFile(
  rules: readonly HeaderRule[] = HEADER_RULES,
): string {
  assertSecurityHeadersValid(rules);
  const blocks = rules.map((rule) => {
    const lines = rule.headers.map(
      (header) => `  ${header.name}: ${header.value}`,
    );
    return `${rule.path}\n${lines.join("\n")}`;
  });
  return `${GENERATED_HEADER}${blocks.join("\n")}\n`;
}
