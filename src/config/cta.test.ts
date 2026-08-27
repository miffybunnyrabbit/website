import { describe, expect, it } from "vitest";
import {
  APPROVED_CTA_HOSTS,
  CTA_ANALYTICS_EVENT,
  PRIMARY_CTA_LABEL,
  assertConfiguredCtaValid,
  assertPrimaryCtaValid,
  assertFinalCtaCopyValid,
  finalCtaCopy,
  findInconsistentCtaLabels,
  isCtaConfigured,
  primaryCta,
  validateConfiguredCta,
  validateFinalCtaCopy,
  validatePrimaryCta,
  type CtaConfig,
  type FinalCtaCopy,
} from "./cta";

/** A well-formed CTA config for tests to start from and mutate. */
function validConfig(): CtaConfig {
  return {
    label: PRIMARY_CTA_LABEL,
    href: "https://calendly.com/helix-collective/intro",
    target: "_blank",
    rel: "noopener noreferrer",
    analyticsEvent: CTA_ANALYTICS_EVENT,
  };
}

describe("primaryCta configuration", () => {
  it("uses the single approved label, new-tab behavior, and analytics event", () => {
    expect(primaryCta.label).toBe(PRIMARY_CTA_LABEL);
    expect(primaryCta.target).toBe("_blank");
    expect(primaryCta.rel).toBe("noopener noreferrer");
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

  it("rejects CTA new-tab metadata that is not safe", () => {
    const cta = {
      ...validConfig(),
      target: "_self",
      rel: "opener",
    } as unknown as CtaConfig;
    const errors = validatePrimaryCta(cta);
    expect(errors.some((e) => e.includes('target must be "_blank"'))).toBe(true);
    expect(errors.some((e) => e.includes('rel must be "noopener noreferrer"'))).toBe(
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

describe("isCtaConfigured", () => {
  it("is true for a supplied URL and false for an absent or blank one", () => {
    expect(isCtaConfigured(validConfig())).toBe(true);
    expect(isCtaConfigured({ ...validConfig(), href: undefined })).toBe(false);
    expect(isCtaConfigured({ ...validConfig(), href: "   " })).toBe(false);
  });
});

describe("validateConfiguredCta (build-time gate)", () => {
  it("accepts a fully configured, well-formed CTA", () => {
    expect(validateConfiguredCta(validConfig())).toEqual([]);
    expect(() => assertConfiguredCtaValid(validConfig())).not.toThrow();
  });

  it("tolerates an absent URL so env-less builds still pass", () => {
    // A local or preview `astro build` runs in production mode with
    // PUBLIC_CALENDLY_URL unset; the deploy environment supplies it, so an
    // absent URL must not fail the build here.
    const cta = { ...validConfig(), href: undefined };
    expect(validateConfiguredCta(cta)).toEqual([]);
    expect(() => assertConfiguredCtaValid(cta)).not.toThrow();
  });

  it("fails a configured but insecure booking URL", () => {
    const cta = { ...validConfig(), href: "http://calendly.com/helix/intro" };
    expect(validateConfiguredCta(cta).some((e) => e.includes("must use HTTPS"))).toBe(
      true,
    );
    expect(() => assertConfiguredCtaValid(cta)).toThrow(
      /Invalid primary CTA configuration/,
    );
  });

  it("fails a configured but off-domain booking URL", () => {
    const cta = { ...validConfig(), href: "https://evil.example.com/book" };
    expect(() => assertConfiguredCtaValid(cta)).toThrow(
      /not an approved Calendly host/,
    );
  });

  it("still guards a drifted label even when no URL is configured", () => {
    const cta = { ...validConfig(), href: undefined, label: "BOOK A CALL" };
    expect(validateConfiguredCta(cta).some((e) => e.includes("does not match"))).toBe(
      true,
    );
    expect(() => assertConfiguredCtaValid(cta)).toThrow(/does not match/);
  });

  it("matches the live primaryCta against the same gate the build runs", () => {
    // Whatever PUBLIC_CALENDLY_URL is (set or unset) in this environment, the
    // shipped config must pass the exact gate the homepage build applies.
    expect(() => assertConfiguredCtaValid()).not.toThrow();
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

describe("finalCtaCopy", () => {
  it("ships a non-empty headline and supporting line", () => {
    expect(finalCtaCopy.headline.trim().length).toBeGreaterThan(0);
    expect(finalCtaCopy.supportingLine.trim().length).toBeGreaterThan(0);
    expect(validateFinalCtaCopy()).toEqual([]);
    expect(() => assertFinalCtaCopyValid()).not.toThrow();
  });

  it("rejects a missing headline or supporting line", () => {
    const copy: FinalCtaCopy = { headline: "  ", supportingLine: "" };
    const errors = validateFinalCtaCopy(copy);
    expect(errors.some((e) => e.includes("headline is missing"))).toBe(true);
    expect(errors.some((e) => e.includes("supporting line is missing"))).toBe(
      true,
    );
  });

  it("rejects placeholder/draft copy", () => {
    const copy: FinalCtaCopy = {
      headline: "TODO: write this",
      supportingLine: "lorem ipsum dolor",
    };
    const errors = validateFinalCtaCopy(copy);
    expect(errors.some((e) => e.includes("draft marker"))).toBe(true);
  });

  it("assertFinalCtaCopyValid throws on invalid copy", () => {
    expect(() =>
      assertFinalCtaCopyValid({ headline: "", supportingLine: "" }),
    ).toThrow(/Invalid final CTA copy/);
  });
});
