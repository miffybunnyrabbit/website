import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { APPROVED_CTA_HOSTS, CTA_URL_ENV_VAR } from "./cta";
import {
  ENV_VARS,
  assertEnvModelValid,
  renderEnvExample,
  validateEnvModel,
} from "./devEnv";

/** Read a committed file at a path relative to the repository root. */
function readRepo(relative: string): string {
  const path = fileURLToPath(new URL(`../../${relative}`, import.meta.url));
  return readFileSync(path, "utf8");
}

describe("dev-environment model", () => {
  it("is internally valid", () => {
    expect(validateEnvModel()).toEqual([]);
    expect(() => assertEnvModelValid()).not.toThrow();
  });

  it("documents the Calendly booking URL sourced from the conversion facts", () => {
    const names = ENV_VARS.map((v) => v.name);
    expect(names).toContain(CTA_URL_ENV_VAR);
  });

  it("keeps the booking URL optional so an env-less local build still runs", () => {
    const calendly = ENV_VARS.find((v) => v.name === CTA_URL_ENV_VAR);
    expect(calendly?.required).toBe(false);
  });
});

describe("validateEnvModel", () => {
  it("passes for the shipped model", () => {
    expect(validateEnvModel()).toEqual([]);
  });
});

describe("renderEnvExample", () => {
  it("carries a do-not-edit header", () => {
    expect(renderEnvExample()).toContain("do not edit by hand");
  });

  it("documents every variable with its name and example", () => {
    const text = renderEnvExample();
    for (const v of ENV_VARS) {
      expect(text).toContain(`${v.name}=${v.example}`);
    }
  });

  it("only ever shows an approved, https booking-URL example", () => {
    const calendly = ENV_VARS.find((v) => v.name === CTA_URL_ENV_VAR);
    expect(calendly).toBeDefined();
    const url = new URL(calendly?.example ?? "");
    expect(renderEnvExample()).toContain(`${CTA_URL_ENV_VAR}=${url.href}`);
    expect(url.protocol).toBe("https:");
    expect(APPROVED_CTA_HOSTS).toContain(url.hostname);
  });

  it("ends with a trailing newline", () => {
    expect(renderEnvExample()).toMatch(/\n$/);
  });

  it("matches the committed .env.example so they never drift", () => {
    expect(readRepo(".env.example")).toBe(renderEnvExample());
  });
});

describe("README quick-start", () => {
  const readme = readRepo("README.md");

  it("documents the nvm use / npm ci / npm run dev quick start", () => {
    expect(readme).toContain("nvm use");
    expect(readme).toContain("npm ci");
    expect(readme).toContain("npm run dev");
  });

  it("tells the reader to copy .env.example before running", () => {
    expect(readme).toContain(".env.example");
  });

  it("explains the approval-queue report every build prints", () => {
    expect(readme.toLowerCase()).toContain("approval queue");
  });
});
