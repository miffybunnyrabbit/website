import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DEFERRED_HEADER_NAMES,
  HEADER_RULES,
  assertSecurityHeadersValid,
  renderHeadersFile,
  validateHeaderRule,
  validateSecurityHeader,
  validateSecurityHeaders,
  type HeaderRule,
  type SecurityHeader,
} from "./securityHeaders";

/** A well-formed header field for tests to start from and mutate. */
function validHeader(): SecurityHeader {
  return { name: "X-Frame-Options", value: "DENY" };
}

/** A well-formed header rule for tests to start from and mutate. */
function validRule(): HeaderRule {
  return { path: "/*", headers: [validHeader()] };
}

/** Read the committed `public/_headers` file relative to this module. */
function readCommittedHeadersFile(): string {
  const path = fileURLToPath(new URL("../../public/_headers", import.meta.url));
  return readFileSync(path, "utf8");
}

describe("HEADER_RULES model", () => {
  it("applies a policy to every route via a `/*` block (P7-008)", () => {
    const catchAll = HEADER_RULES.find((rule) => rule.path === "/*");
    expect(catchAll).toBeDefined();
  });

  it("sets each header from the plan's candidate policy", () => {
    const byName = new Map(
      HEADER_RULES.flatMap((rule) => rule.headers).map((h) => [h.name, h.value]),
    );
    expect(byName.get("X-Content-Type-Options")).toBe("nosniff");
    expect(byName.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(byName.get("Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=()",
    );
    expect(byName.get("X-Frame-Options")).toBe("DENY");
  });

  it("does not set headers the plan manages elsewhere (CSP, HSTS)", () => {
    const names = HEADER_RULES.flatMap((rule) => rule.headers).map((h) =>
      h.name.toLowerCase(),
    );
    for (const deferred of DEFERRED_HEADER_NAMES) {
      expect(names).not.toContain(deferred.toLowerCase());
    }
  });

  it("is internally valid", () => {
    expect(validateSecurityHeaders()).toEqual([]);
    expect(() => assertSecurityHeadersValid()).not.toThrow();
  });

  it("has no duplicate path blocks", () => {
    const paths = HEADER_RULES.map((rule) => rule.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe("validateSecurityHeader", () => {
  it("accepts a well-formed header", () => {
    expect(validateSecurityHeader(validHeader())).toEqual([]);
  });

  it("rejects an empty name", () => {
    expect(validateSecurityHeader({ ...validHeader(), name: "  " })).toContainEqual(
      expect.stringContaining("Header name must not be empty"),
    );
  });

  it("rejects whitespace in a name", () => {
    expect(
      validateSecurityHeader({ ...validHeader(), name: "X Frame Options" }),
    ).toContainEqual(expect.stringContaining("must not contain whitespace"));
  });

  it("rejects a colon in a name", () => {
    expect(
      validateSecurityHeader({ ...validHeader(), name: "X-Frame:Options" }),
    ).toContainEqual(expect.stringContaining("must not contain a colon"));
  });

  it("rejects an empty value", () => {
    expect(validateSecurityHeader({ ...validHeader(), value: "" })).toContainEqual(
      expect.stringContaining("must have a non-empty value"),
    );
  });

  it("rejects a line break in a value (header injection)", () => {
    expect(
      validateSecurityHeader({ ...validHeader(), value: "DENY\r\nSet-Cookie: x" }),
    ).toContainEqual(expect.stringContaining("must not contain a line break"));
  });

  it("rejects a deferred header regardless of case", () => {
    expect(
      validateSecurityHeader({ name: "content-security-policy", value: "default-src 'self'" }),
    ).toContainEqual(expect.stringContaining("managed elsewhere"));
    expect(
      validateSecurityHeader({ name: "Strict-Transport-Security", value: "max-age=63072000" }),
    ).toContainEqual(expect.stringContaining("managed elsewhere"));
  });
});

describe("validateHeaderRule", () => {
  it("accepts a well-formed rule", () => {
    expect(validateHeaderRule(validRule())).toEqual([]);
  });

  it("rejects a path that is not root-relative", () => {
    expect(validateHeaderRule({ ...validRule(), path: "assets/*" })).toContainEqual(
      expect.stringContaining("must be root-relative"),
    );
  });

  it("rejects whitespace in a path", () => {
    expect(validateHeaderRule({ ...validRule(), path: "/a b" })).toContainEqual(
      expect.stringContaining("must not contain whitespace"),
    );
  });

  it("rejects a block with no headers", () => {
    expect(validateHeaderRule({ path: "/*", headers: [] })).toContainEqual(
      expect.stringContaining("has no headers"),
    );
  });

  it("flags a duplicate header within a block, case-insensitively", () => {
    const rule: HeaderRule = {
      path: "/*",
      headers: [
        { name: "X-Frame-Options", value: "DENY" },
        { name: "x-frame-options", value: "SAMEORIGIN" },
      ],
    };
    expect(validateHeaderRule(rule)).toContainEqual(
      expect.stringContaining("Duplicate header"),
    );
  });
});

describe("validateSecurityHeaders cross-rule checks", () => {
  it("flags a duplicate path block", () => {
    const rules: HeaderRule[] = [validRule(), validRule()];
    expect(validateSecurityHeaders(rules)).toContainEqual(
      expect.stringContaining("Duplicate header path"),
    );
  });
});

describe("renderHeadersFile", () => {
  it("throws on invalid rules rather than emitting a broken file", () => {
    const rules: HeaderRule[] = [{ path: "bad", headers: [validHeader()] }];
    expect(() => renderHeadersFile(rules)).toThrow(/Invalid security headers/);
  });

  it("renders a path line followed by indented `Name: value` lines", () => {
    const text = renderHeadersFile([validRule()]);
    expect(text).toContain("/*\n  X-Frame-Options: DENY");
  });

  it("ends with a trailing newline", () => {
    expect(renderHeadersFile()).toMatch(/\n$/);
  });

  it("carries a do-not-edit header", () => {
    expect(renderHeadersFile()).toContain("do not edit by hand");
  });

  it("matches the committed public/_headers file so they never drift", () => {
    expect(readCommittedHeadersFile()).toBe(renderHeadersFile());
  });
});
