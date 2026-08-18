import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_FOOTER_PHRASES,
  FORBIDDEN_FOOTER_TERMS,
  assertFooterValid,
  copyrightLine,
  footer,
  publishedFooter,
  validateFooter,
  type FooterContent,
} from "./footer";

/** A well-formed footer for tests to start from and mutate. */
function validFooter(): FooterContent {
  return {
    brand: { label: "Helix Collective", href: "/" },
    facts: [
      {
        id: "legal-entity",
        label: "Legal entity",
        value: "[VERIFY: registered legal entity name]",
      },
      {
        id: "registered-office",
        label: "Registered office",
        value: "Level 1, 2–14 Vine Street, Redfern NSW 2016",
      },
    ],
    socialLinks: [],
    copyrightHolder: "Helix Collective",
  };
}

describe("footer configuration", () => {
  it("is valid as shipped", () => {
    expect(validateFooter()).toEqual([]);
    expect(() => assertFooterValid()).not.toThrow();
  });

  it("returns to the site root from the brand mark", () => {
    expect(footer.brand.href).toBe("/");
    expect(footer.brand.label).toBe("Helix Collective");
  });

  it("carries no invented social links (no LinkedIn URL is documented)", () => {
    expect(footer.socialLinks).toEqual([]);
  });

  it("rejects a missing brand label or href", () => {
    const content: FooterContent = {
      ...validFooter(),
      brand: { label: " ", href: "" },
    };
    const errors = validateFooter(content);
    expect(errors.some((e) => e.includes("brand mark is missing a label"))).toBe(true);
    expect(errors.some((e) => e.includes("brand mark is missing an href"))).toBe(true);
  });

  it("rejects a missing or draft copyright holder", () => {
    expect(
      validateFooter({ ...validFooter(), copyrightHolder: "  " }).some((e) =>
        e.includes("copyright holder is missing"),
      ),
    ).toBe(true);
    expect(
      validateFooter({ ...validFooter(), copyrightHolder: "TBD entity" }).some((e) =>
        e.includes("copyright holder is still a draft"),
      ),
    ).toBe(true);
  });

  it("rejects old venture-volume-machine positioning (section 14)", () => {
    const content: FooterContent = {
      ...validFooter(),
      copyrightHolder: "Helix Collective, a venture studio",
    };
    const errors = validateFooter(content);
    expect(errors.some((e) => e.includes("forbidden positioning"))).toBe(true);
  });

  it("rejects site-wide forbidden copy anywhere in the footer", () => {
    const content: FooterContent = {
      ...validFooter(),
      copyrightHolder: "Helix Collective — world-class outcomes",
    };
    const errors = validateFooter(content);
    expect(errors.some((e) => e.includes("forbidden copy"))).toBe(true);
  });

  it("assertFooterValid throws an aggregated message on bad config", () => {
    const content: FooterContent = { ...validFooter(), copyrightHolder: "" };
    expect(() => assertFooterValid(content)).toThrow(/Invalid footer/);
  });
});

describe("copyrightLine", () => {
  it("renders the institutional copyright line for a given year", () => {
    expect(copyrightLine(2026)).toBe("© 2026 Helix Collective. All rights reserved.");
  });

  it("uses the footer's copyright holder", () => {
    const content: FooterContent = { ...validFooter(), copyrightHolder: "Helix Collective Pty Ltd" };
    expect(copyrightLine(2026, content)).toBe(
      "© 2026 Helix Collective Pty Ltd. All rights reserved.",
    );
  });

  it("rejects an implausible year", () => {
    expect(() => copyrightLine(1999)).toThrow(/Invalid copyright year/);
    expect(() => copyrightLine(2026.5)).toThrow(/Invalid copyright year/);
  });
});
