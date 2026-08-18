/**
 * Validated dev-environment model: the environment variables a local
 * `npm run dev` / `npm run build` reads, and the generated `.env.example` that
 * documents them (implementation plan FX-203 "Dev environment ergonomics").
 *
 * Following the same convention as `ci.ts`, `sitemap.ts`, and `approvalQueue.ts`,
 * this module is the single, testable source of truth for `.env.example`: it
 * declares each variable as structured data, validates it, and renders the exact
 * file text. `.env.example` is the rendered output, and `devEnv.test.ts` asserts
 * the committed file still matches this model so the two can never drift.
 *
 * The one variable the site reads today is the Calendly booking URL behind the
 * single site-wide CTA. Its name and approved host are taken from
 * `cta.ts`, not re-typed here, so the documented example
 * cannot drift from the real CTA gate in `cta.ts`. Real `.env` files are
 * gitignored; this example carries only a safe placeholder value.
 *
 * This module is pure configuration plus validation: no UI, no I/O.
 */

import { APPROVED_CTA_HOSTS, CTA_URL_ENV_VAR } from "./cta";

/** A single documented environment variable. */
export interface EnvVar {
  /** The variable name, e.g. `PUBLIC_CALENDLY_URL`. */
  name: string;
  /**
   * Whether the build needs it. The one current variable is optional: without
   * it the build only warns and the CTA renders without a booking link.
   */
  required: boolean;
  /** Human-readable explanation, rendered as `#` comment lines above the entry. */
  description: readonly string[];
  /** A safe placeholder value rendered after `NAME=`; never a real secret. */
  example: string;
}

/**
 * The environment variables local development and the static build read. Sourced
 * from the content models where one already owns the fact (the Calendly URL name
 * and approved host come from `cta.ts`) so this list cannot drift.
 */
export const ENV_VARS: readonly EnvVar[] = [
  {
    name: CTA_URL_ENV_VAR,
    required: false,
    description: [
      "The booking link behind the single site-wide CTA, injected at build time.",
      "Optional locally: without it the build only warns and the CTA renders",
      "without a link (see the `isCtaConfigured` warning in src/pages/index.astro).",
      `Must be an https URL on an approved host (${APPROVED_CTA_HOSTS.join(
        ", ",
      )}); a set-but-insecure or off-host`,
      "value fails the build (`assertConfiguredCtaValid`). The exact production",
      "path and event type are the open D-006 decision.",
    ],
    example: `https://${APPROVED_CTA_HOSTS[0]}/helix-collective/intro`,
  },
];

/** Header written at the top of the generated file to discourage hand-edits. */
const ENV_HEADER =
  "# Generated from src/config/devEnv.ts — do not edit by hand.\n" +
  "#\n" +
  "# Local environment variables for the Helix Collective website. Copy this file\n" +
  "# to `.env` and adjust the values; `.env` is gitignored and must never hold a\n" +
  "# real production secret committed to the repo.\n";

/** A name Vite/Astro will expose is upper snake case; the CTA one is `PUBLIC_`-prefixed. */
const NAME_PATTERN = /^[A-Z][A-Z0-9_]*$/;

/**
 * Validate the environment model. Returns the list of problems; an empty list
 * means the model is well-formed and `.env.example` can be rendered safely.
 */
export function validateEnvModel(): string[] {
  const errors: string[] = [];

  if (ENV_VARS.length === 0) {
    errors.push("ENV_VARS must document at least one variable.");
  }

  const seen = new Set<string>();
  for (const v of ENV_VARS) {
    if (!NAME_PATTERN.test(v.name)) {
      errors.push(`Variable name "${v.name}" must be upper snake case.`);
    }
    if (seen.has(v.name)) {
      errors.push(`Variable "${v.name}" is documented more than once.`);
    }
    seen.add(v.name);

    if (v.description.length === 0 || v.description.some((line) => line.trim() === "")) {
      errors.push(`Variable "${v.name}" must have a non-empty, blank-line-free description.`);
    }
    if (v.example.trim() === "") {
      errors.push(`Variable "${v.name}" must carry a non-empty example value.`);
    }
  }

  // The documented Calendly example must satisfy the same rules the CTA gate
  // enforces, so the doc can never show a value the build would reject.
  const calendly = ENV_VARS.find((v) => v.name === CTA_URL_ENV_VAR);
  if (calendly) {
    let url: URL | undefined;
    try {
      url = new URL(calendly.example);
    } catch {
      errors.push(`Example for "${calendly.name}" must be a valid absolute URL.`);
    }
    if (url && url.protocol !== "https:") {
      errors.push(`Example for "${calendly.name}" must be https.`);
    }
    if (url && !APPROVED_CTA_HOSTS.includes(url.hostname)) {
      errors.push(
        `Example for "${calendly.name}" must be on an approved host [${APPROVED_CTA_HOSTS.join(
          ", ",
        )}].`,
      );
    }
  }

  return errors;
}

/**
 * Assert the environment model is valid, throwing on failure. Intended for
 * build/test-time use so a malformed model fails fast rather than rendering a
 * misleading `.env.example`.
 */
export function assertEnvModelValid(): void {
  const errors = validateEnvModel();
  if (errors.length > 0) {
    throw new Error(`Invalid dev-environment model:\n- ${errors.join("\n- ")}`);
  }
}

/**
 * Render the exact text of `.env.example`: the do-not-edit header, then one
 * commented block per variable. Ends with a trailing newline.
 *
 * Throws if the model is invalid so the rendered file is always well-formed.
 */
export function renderEnvExample(): string {
  assertEnvModelValid();

  const blocks = ENV_VARS.map((v) => {
    const required = v.required ? "required" : "optional";
    const comments = [`# ${v.name} (${required})`, ...v.description.map((line) => `# ${line}`)];
    return `${comments.join("\n")}\n${v.name}=${v.example}\n`;
  });

  return `${ENV_HEADER}\n${blocks.join("\n")}`;
}
