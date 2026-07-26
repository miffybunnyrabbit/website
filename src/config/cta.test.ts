import { describe, expect, it } from "vitest";
import {
  APPROVED_CTA_HOSTS,
  CTA_ANALYTICS_EVENT,
  PRIMARY_CTA_LABEL,
  assertPrimaryCtaValid,
  findInconsistentCtaLabels,
  primaryCta,
  validatePrimaryCta,
  type CtaConfig,
} from "./cta";

/** A well-formed CTA config for tests to start from and mutate. */
function validConfig(): CtaConfig {
  return {
    label: PRIMARY_CTA_LABEL,
    href: "https://calendly.com/helix-collective/intro",
    analyticsEvent: CTA_ANALYTICS_EVENT,
  };
}

describe("primaryCta configuration", () => {
  it("uses the single approved label and analytics event", () => {
    expect(primaryCta.label).toBe(PRIMARY_CTA_LABEL);
    expect(primaryCta.analyticsEvent).toBe("cta_click");
  });

  it("accepts a well-formed HTTPS Calendly URL", () => {
    expect(validatePrimaryCta(validConfig())).toEqual([]);
    expect(() => assertPrimaryCtaValid(validConfig())).not.toThrow();
  });

  it("accepts a Calendly subdomain", () => {
    const cta = { ...validConfig(), href: "https://helix.calendly.com/intro" };
    expect(validatePrimaryCta(cta)).toEqual([]);
  });
});

describe("validatePrimaryCta guardrails", () => {
  it("rejects a missing URL", () => {
    const cta = { ...validConfig(), href: undefined };
    const errors = validatePrimaryCta(cta);
    expect(errors.some((e) => e.includes("CTA URL is missing"))).toBe(true);
  });

  it("rejects an empty URL", () => {
    const cta = { ...validConfig(), href: "   " };
    const errors = validatePrimaryCta(cta);
    expect(errors.some((e) => e.includes("CTA URL is missing"))).toBe(true);
  });

  it("rejects a non-HTTPS URL", () => {
    const cta = { ...validConfig(), href: "http://calendly.com/helix/intro" };
    const errors = validatePrimaryCta(cta);
    expect(errors.some((e) => e.includes("must use HTTPS"))).toBe(true);
  });

  it("rejects a URL not on an approved Calendly host", () => {
    const cta = { ...validConfig(), href: "https://evil.example.com/book" };
    const errors = validatePrimaryCta(cta);
    expect(errors.some((e) => e.includes("not an approved Calendly host"))).toBe(
      true,
    );
  });

  it("does not treat a lookalike host as approved", () => {
    // `calendly.com.evil.example` must not pass the subdomain check.
    const cta = {
      ...validConfig(),
      href: "https://calendly.com.evil.example/book",
    };
    const errors = validatePrimaryCta(cta);
    expect(errors.some((e) => e.includes("not an approved Calendly host"))).toBe(
      true,
    );
  });

  it("rejects a malformed URL", () => {
    const cta = { ...validConfig(), href: "not a url" };
    const errors = validatePrimaryCta(cta);
    expect(errors.some((e) => e.includes("not a valid absolute URL"))).toBe(true);
  });

  it("rejects a CTA whose label diverges from the approved label", () => {
    const cta = { ...validConfig(), label: "BOOK A CALL" };
    const errors = validatePrimaryCta(cta);
    expect(errors.some((e) => e.includes("does not match"))).toBe(true);
  });

  it("rejects a missing label or analytics event", () => {
    const cta = { ...validConfig(), label: "  ", analyticsEvent: "" };
    const errors = validatePrimaryCta(cta);
    expect(errors.some((e) => e.includes("CTA label is missing"))).toBe(true);
    expect(errors.some((e) => e.includes("analytics event is missing"))).toBe(
      true,
    );
  });

  it("assertPrimaryCtaValid throws an aggregated message on bad config", () => {
    const cta = { ...validConfig(), href: "http://evil.example.com" };
    expect(() => assertPrimaryCtaValid(cta)).toThrow(
      /Invalid primary CTA configuration/,
    );
  });
});

describe("findInconsistentCtaLabels", () => {
  it("returns nothing when every CTA uses the approved label", () => {
    expect(
      findInconsistentCtaLabels([PRIMARY_CTA_LABEL, PRIMARY_CTA_LABEL]),
    ).toEqual([]);
  });

  it("surfaces distinct divergent labels once each", () => {
    const result = findInconsistentCtaLabels([
      PRIMARY_CTA_LABEL,
      "BOOK A CALL",
      "BOOK A CALL",
      "GET IN TOUCH",
    ]);
    expect(result).toEqual(["BOOK A CALL", "GET IN TOUCH"]);
  });
});

describe("approved hosts", () => {
  it("includes calendly.com", () => {
    expect(APPROVED_CTA_HOSTS).toContain("calendly.com");
  });
});
