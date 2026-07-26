import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CI_NODE_VERSION,
  VERIFY_SCRIPT,
  VERIFY_STEP_SCRIPTS,
  assertCiModelValid,
  renderCiWorkflow,
  validateCiModel,
} from "./ci";

/** Read a committed file at a path relative to the repository root. */
function readRepo(relative: string): string {
  const path = fileURLToPath(new URL(`../../${relative}`, import.meta.url));
  return readFileSync(path, "utf8");
}

describe("CI model", () => {
  it("is internally valid", () => {
    expect(validateCiModel()).toEqual([]);
    expect(() => assertCiModelValid()).not.toThrow();
  });

  it("runs on the plan's Node 24 CI target, ahead of the local .nvmrc", () => {
    expect(CI_NODE_VERSION).toBe("24");
    // .nvmrc pins local development to Node 20; CI is deliberately ahead of it.
    expect(readRepo(".nvmrc").trim()).toBe("20");
  });

  it("chains typecheck, tests, and build in that order", () => {
    expect(VERIFY_STEP_SCRIPTS).toEqual(["typecheck", "test", "build"]);
  });
});

describe("validateCiModel", () => {
  it("passes for the shipped model", () => {
    expect(validateCiModel()).toEqual([]);
  });
});

describe("renderCiWorkflow", () => {
  it("triggers on pushes to main and on every pull request", () => {
    const yaml = renderCiWorkflow();
    expect(yaml).toContain("push:\n    branches: [main]");
    expect(yaml).toContain("pull_request:");
  });

  it("sets up the CI Node version with npm caching", () => {
    const yaml = renderCiWorkflow();
    expect(yaml).toContain("uses: actions/setup-node@v4");
    expect(yaml).toContain(`node-version: "${CI_NODE_VERSION}"`);
    expect(yaml).toContain("cache: npm");
  });

  it("installs cleanly and runs the single verify gate", () => {
    const yaml = renderCiWorkflow();
    expect(yaml).toContain("- run: npm ci");
    expect(yaml).toContain(`- run: npm run ${VERIFY_SCRIPT}`);
  });

  it("holds no deploy credentials (Cloudflare uses native Git integration, §9.1)", () => {
    const yaml = renderCiWorkflow().toLowerCase();
    expect(yaml).not.toContain("secrets.");
    expect(yaml).not.toContain("cloudflare");
    expect(yaml).not.toContain("api-token");
  });

  it("carries a do-not-edit header", () => {
    expect(renderCiWorkflow()).toContain("do not edit by hand");
  });

  it("ends with a trailing newline", () => {
    expect(renderCiWorkflow()).toMatch(/\n$/);
  });

  it("matches the committed .github/workflows/ci.yml so they never drift", () => {
    expect(readRepo(".github/workflows/ci.yml")).toBe(renderCiWorkflow());
  });
});

describe("package.json wiring", () => {
  const pkg = JSON.parse(readRepo("package.json")) as {
    scripts: Record<string, string>;
  };

  it("defines the verify script CI invokes", () => {
    expect(pkg.scripts[VERIFY_SCRIPT]).toBeTypeOf("string");
  });

  it("composes verify from typecheck, tests, and build, in order", () => {
    const verify = pkg.scripts[VERIFY_SCRIPT];
    let cursor = -1;
    for (const step of VERIFY_STEP_SCRIPTS) {
      const at = verify.indexOf(`npm run ${step}`);
      expect(at, `verify must run "npm run ${step}"`).toBeGreaterThan(cursor);
      cursor = at;
    }
  });

  it("chains verify steps with && so any failure fails the whole gate", () => {
    expect(pkg.scripts[VERIFY_SCRIPT]).toContain("&&");
  });
});
