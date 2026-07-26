/**
 * Validated continuous-integration model for the GitHub Actions workflow at
 * `.github/workflows/ci.yml` (implementation plan Phase 9.1 "GitHub Actions CI",
 * and the §24 acceptance items "`npm run verify` pass" and "CI is required
 * before merge").
 *
 * Every build-time gate the site already relies on — the forbidden-copy scan,
 * the safe-CTA-URL check, the approval-queue render, the sitemap/headers/redirect
 * drift tests, and `astro check` — only protects `main` if something runs it on
 * every pull request and push. That something is this workflow. It does one
 * thing: check out the code on the CI Node version, install with `npm ci`, and
 * run the single umbrella gate `npm run verify` (typecheck + unit tests + build).
 *
 * Following the same convention as `sitemap.ts`, `securityHeaders.ts`, and
 * `redirects.ts`, this module is the single, testable source of truth for that
 * workflow: it defines the CI parameters as structured data, validates them, and
 * renders the exact YAML text. `.github/workflows/ci.yml` is the rendered output,
 * and `ci.test.ts` asserts the committed file still matches this model so the two
 * can never drift.
 *
 * Deliberately NOT here, per the plan:
 *
 *   - Cloudflare credentials or deploy steps — Phase 9.2 uses Cloudflare Pages'
 *     native Git integration, so §9.1 requires the workflow hold no deploy
 *     secrets. This workflow only validates; it never publishes.
 *   - Playwright / `npm run test:e2e` steps (§9.1 steps 7–9) — added once the
 *     end-to-end suite exists (Phase 8.3). Listing a step that runs a
 *     non-existent script would only fail CI, so it waits for the script.
 *
 * This module is pure configuration plus validation: no UI, no I/O.
 */

/**
 * Node major version CI runs on. The plan (§9.1) and Cloudflare target Node 24
 * LTS; local development pins to the installed Node 20 (see `.nvmrc` and the
 * `>=20.3` engines range), so this is intentionally ahead of `.nvmrc`.
 */
export const CI_NODE_VERSION = "24";

/**
 * The single umbrella script CI runs after install. It must exist in
 * `package.json` and compose the whole local gate; `ci.test.ts` asserts that.
 */
export const VERIFY_SCRIPT = "verify";

/**
 * The scripts `npm run verify` must chain, in order: static typecheck, unit
 * tests, then the static build (which itself runs the forbidden-copy, CTA-URL,
 * and approval-queue gates). `ci.test.ts` asserts `package.json`'s `verify`
 * script invokes each of these.
 */
export const VERIFY_STEP_SCRIPTS: readonly string[] = [
  "typecheck",
  "test",
  "build",
];

/** Header written at the top of the generated workflow to discourage hand-edits. */
const WORKFLOW_HEADER =
  "# Generated from src/config/ci.ts — do not edit by hand.\n";

/**
 * Validate the CI parameters. Returns the list of problems; an empty list means
 * the model is well-formed.
 */
export function validateCiModel(): string[] {
  const errors: string[] = [];

  if (!/^\d+$/.test(CI_NODE_VERSION)) {
    errors.push(
      `CI_NODE_VERSION "${CI_NODE_VERSION}" must be a bare major version (digits only).`,
    );
  }

  if (VERIFY_SCRIPT.trim() === "" || /\s/.test(VERIFY_SCRIPT)) {
    errors.push(`VERIFY_SCRIPT "${VERIFY_SCRIPT}" must be a single non-empty script name.`);
  }

  if (VERIFY_STEP_SCRIPTS.length === 0) {
    errors.push("VERIFY_STEP_SCRIPTS must list at least one script.");
  }

  return errors;
}

/**
 * Assert the CI parameters are valid, throwing on failure. Intended for
 * build/test-time use so a malformed model fails fast rather than rendering a
 * broken workflow.
 */
export function assertCiModelValid(): void {
  const errors = validateCiModel();
  if (errors.length > 0) {
    throw new Error(`Invalid CI model:\n- ${errors.join("\n- ")}`);
  }
}

/**
 * Render the exact text of `.github/workflows/ci.yml`. Runs on every push to
 * `main` and on every pull request, then check out → set up the CI Node version
 * with npm caching → `npm ci` → `npm run verify`. Ends with a trailing newline.
 *
 * Throws if the model is invalid so the rendered file is always well-formed.
 */
export function renderCiWorkflow(): string {
  assertCiModelValid();
  return (
    WORKFLOW_HEADER +
    "name: CI\n" +
    "\n" +
    "on:\n" +
    "  push:\n" +
    "    branches: [main]\n" +
    "  pull_request:\n" +
    "\n" +
    "jobs:\n" +
    "  verify:\n" +
    "    runs-on: ubuntu-latest\n" +
    "    steps:\n" +
    "      - uses: actions/checkout@v4\n" +
    "      - uses: actions/setup-node@v4\n" +
    "        with:\n" +
    `          node-version: "${CI_NODE_VERSION}"\n` +
    "          cache: npm\n" +
    "      - run: npm ci\n" +
    `      - run: npm run ${VERIFY_SCRIPT}\n`
  );
}
