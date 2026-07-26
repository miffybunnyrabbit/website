import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  REDIRECTS,
  VALID_REDIRECT_STATUSES,
  assertRedirectsValid,
  renderRedirectsFile,
  validateRedirectRule,
  validateRedirects,
  type RedirectRule,
} from "./redirects";

/** A well-formed redirect rule for tests to start from and mutate. */
function validRule(): RedirectRule {
  return { from: "/contact-us", to: "/", status: 301 };
}

/** Read the committed `public/_redirects` file relative to this module. */
function readCommittedRedirectsFile(): string {
  const path = fileURLToPath(new URL("../../public/_redirects", import.meta.url));
  return readFileSync(path, "utf8");
}

describe("REDIRECTS model", () => {
  it("includes the mandated /contact-us permanent redirect to the homepage (P7-009)", () => {
    const contact = REDIRECTS.find((rule) => rule.from === "/contact-us");
    expect(contact).toBeDefined();
    expect(contact?.to).toBe("/");
    // A permanent redirect preserves the SEO signal of the retired page.
    expect([301, 308]).toContain(contact?.status);
  });

  it("is internally valid", () => {
    expect(validateRedirects()).toEqual([]);
    expect(() => assertRedirectsValid()).not.toThrow();
  });

  it("has no duplicate sources", () => {
    const sources = REDIRECTS.map((rule) => rule.from);
    expect(new Set(sources).size).toBe(sources.length);
  });
});

describe("validateRedirectRule", () => {
  it("accepts a well-formed rule", () => {
    expect(validateRedirectRule(validRule())).toEqual([]);
  });

  it("rejects a source that is not root-relative", () => {
    const rule = { ...validRule(), from: "contact-us" };
    expect(validateRedirectRule(rule)).toContainEqual(
      expect.stringContaining("must be root-relative"),
    );
  });

  it("rejects a destination that is not root-relative", () => {
    const rule = { ...validRule(), to: "https://example.com/" };
    expect(validateRedirectRule(rule)).toContainEqual(
      expect.stringContaining('destination "https://example.com/" must be root-relative'),
    );
  });

  it("rejects whitespace in a source", () => {
    const rule = { ...validRule(), from: "/contact us" };
    expect(validateRedirectRule(rule)).toContainEqual(
      expect.stringContaining("must not contain whitespace"),
    );
  });

  it("rejects a self-referential redirect that would loop", () => {
    const rule = { ...validRule(), from: "/", to: "/" };
    expect(validateRedirectRule(rule)).toContainEqual(
      expect.stringContaining("points at itself"),
    );
  });

  it("rejects a status that is not a redirect code", () => {
    const rule = { ...validRule(), status: 200 as unknown as RedirectRule["status"] };
    expect(validateRedirectRule(rule)).toContainEqual(
      expect.stringContaining("expected one of"),
    );
  });

  it("accepts every documented redirect status", () => {
    for (const status of VALID_REDIRECT_STATUSES) {
      expect(validateRedirectRule({ ...validRule(), status })).toEqual([]);
    }
  });
});

describe("validateRedirects cross-rule checks", () => {
  it("flags a duplicate source", () => {
    const rules: RedirectRule[] = [validRule(), { ...validRule(), to: "/privacy" }];
    expect(validateRedirects(rules)).toContainEqual(
      expect.stringContaining("Duplicate redirect source"),
    );
  });
});

describe("renderRedirectsFile", () => {
  it("throws on invalid rules rather than emitting a broken file", () => {
    const rules: RedirectRule[] = [{ from: "bad", to: "/", status: 301 }];
    expect(() => renderRedirectsFile(rules)).toThrow(/Invalid redirects/);
  });

  it("renders each rule as `source  destination  status`", () => {
    const text = renderRedirectsFile([validRule()]);
    expect(text).toContain("/contact-us  /  301");
  });

  it("ends with a trailing newline", () => {
    expect(renderRedirectsFile()).toMatch(/\n$/);
  });

  it("carries a do-not-edit header", () => {
    expect(renderRedirectsFile()).toContain("do not edit by hand");
  });

  it("matches the committed public/_redirects file so they never drift", () => {
    expect(readCommittedRedirectsFile()).toBe(renderRedirectsFile());
  });
});
