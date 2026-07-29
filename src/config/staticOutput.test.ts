import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Static-output drift guard (implementation plan §24 "Technical", §18.1–18.3).
 *
 * §24 requires "Production output is static in `dist`", and the architecture
 * chapters make that a deliberate decision, not an accident: §18.1 picks Astro
 * "for static HTML generation", §18.2 wants it to "deploy to Cloudflare Pages as
 * ordinary static assets", and §18.3 rejects Next.js precisely because "the
 * first release needs no server rendering at request time, API route,
 * authentication, or database" and would drag in "Cloudflare-adapter
 * complexity". The whole hydration budget (§18.5, gated by
 * `renderedPerformance.test.ts`) assumes one interactive island on an otherwise
 * static page.
 *
 * Astro emits a fully static site only while `output` is unset (its default) or
 * `"static"` and no SSR `adapter` is configured. The moment someone adds
 * `output: "server"`/`"hybrid"` or an adapter — the natural way to reach for a
 * single "quick" server-rendered feature — `astro build` starts emitting a
 * server entry instead of static HTML, the Cloudflare Pages deploy model
 * changes, and §24 is silently violated while every other test stays green
 * (they render through the container, which never sees the build output mode).
 *
 * This guards the committed `astro.config.mjs` the same way the canonical-origin
 * (`siteMeta.test.ts`), CI (`ci.test.ts`), headers (`securityHeaders.test.ts`),
 * and sitemap drift tests guard their artifacts: by reading the real file and
 * asserting the invariant, so the config cannot drift away from the plan without
 * failing the pre-commit suite.
 */

/** Read a committed file at a path relative to the repository root. */
function readRepo(relative: string): string {
  const path = fileURLToPath(new URL(`../../${relative}`, import.meta.url));
  return readFileSync(path, "utf8");
}

/**
 * Strip `//` line and `/* *\/` block comments so a documentary mention of
 * `adapter` or `output` in a comment cannot masquerade as configuration.
 */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * Astro output modes that ship a request-time server runtime instead of a fully
 * static `dist/`. `output` unset (the default) or `"static"` are the only modes
 * §24 permits.
 */
const SERVER_OUTPUT_MODES = ["server", "hybrid"];

/**
 * Reasons the given `astro.config` source would produce a non-static build
 * (§24). Empty means the build stays static.
 */
function scanNonStaticBuild(configSource: string): string[] {
  const source = withoutComments(configSource);
  const problems: string[] = [];

  const output = source.match(/\boutput\s*:\s*["']([^"']+)["']/);
  if (output && SERVER_OUTPUT_MODES.includes(output[1])) {
    problems.push(`output: "${output[1]}" enables request-time rendering`);
  }

  // Any configured adapter turns on on-demand rendering; a static Cloudflare
  // Pages deploy (§18.2/§18.3) needs none.
  if (/\badapter\s*:/.test(source)) {
    problems.push("an SSR adapter is configured");
  }

  return problems;
}

describe("astro.config.mjs keeps the build static (§24 Technical)", () => {
  const config = readRepo("astro.config.mjs");

  // Positive control: we are reading the real, substantive config — the one that
  // still declares the site and mounts the single React island — so a clean scan
  // cannot be an empty or wrong file.
  it("reads the committed defineConfig with the one React integration (§18.5)", () => {
    expect(config).toContain("defineConfig");
    expect(config).toContain("react()");
  });

  it("ships no server output mode or SSR adapter, so `dist` stays static (§24, §18.3)", () => {
    expect(scanNonStaticBuild(config)).toEqual([]);
  });

  // Meta-guard: prove the scan actually fires. A config that opted into
  // server rendering — by output mode or by adapter — must be reported, or the
  // clean result above would be meaningless.
  it("catches a config that opts into server rendering (meta-test)", () => {
    expect(
      scanNonStaticBuild('export default defineConfig({ output: "server" });'),
    ).toContain('output: "server" enables request-time rendering');
    expect(
      scanNonStaticBuild(
        'export default defineConfig({ adapter: cloudflare() });',
      ),
    ).toContain("an SSR adapter is configured");
  });

  // A documentary mention in a comment is not configuration, and `output:
  // "static"` is explicitly allowed — neither may trip the guard.
  it("does not flag a comment or an explicit static output (no false positive)", () => {
    expect(
      scanNonStaticBuild(
        '// no adapter: needed here\nexport default defineConfig({ output: "static" });',
      ),
    ).toEqual([]);
  });
});
