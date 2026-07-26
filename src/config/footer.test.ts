import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_FOOTER_PHRASES,
  FORBIDDEN_FOOTER_TERMS,
  QUEUE_ITEM_PATTERN,
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
        approval: "pending",
        queueItem: "Q-0001",
      },
      {
        id: "registered-office",
        label: "Registered office",
        value: "Level 1, 2–14 Vine Street, Redfern NSW 2016",
        approval: "pending",
        queueItem: "Q-0003",
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

  it("carries the required identity facts with approval-queue items (section 14, 23)", () => {
    const ids = footer.facts.map((f) => f.id);
    expect(ids).toContain("legal-entity");
    expect(ids).toContain("abn");
    expect(ids).toContain("registered-office");
    for (const fact of footer.facts) {
      expect(fact.queueItem).toMatch(QUEUE_ITEM_PATTERN);
    }
  });

  it("has no approved identity facts yet (nothing is signed off)", () => {
    expect(footer.facts.every((f) => f.approval === "pending")).toBe(true);
  });

  it("carries no invented social links (no LinkedIn URL is documented)", () => {
    expect(footer.socialLinks).toEqual([]);
  });

  it("names no person, team, investor, or careers content (section 14)", () => {
    const text = [
      footer.brand.label,
      footer.copyrightHolder,
      ...footer.facts.map((f) => `${f.label} ${f.value}`),
    ]
      .join(" ")
      .toLowerCase();
    for (const term of FORBIDDEN_FOOTER_TERMS) {
      expect(text).not.toContain(term);
    }
    for (const phrase of FORBIDDEN_FOOTER_PHRASES) {
      expect(text).not.toContain(phrase);
    }
  });
});

describe("publishedFooter", () => {
  it("withholds unapproved identity facts from the rendered footer", () => {
    // Current state: nothing approved, so no facts render.
    expect(publishedFooter().facts).toEqual([]);
    expect(publishedFooter().socialLinks).toEqual([]);
  });

  it("always renders the brand mark and copyright holder", () => {
    const published = publishedFooter();
    expect(published.brand).toEqual(footer.brand);
    expect(published.copyrightHolder).toBe("Helix Collective");
  });

  it("renders a fact only once its approval clears", () => {
    const content: FooterContent = {
      ...validFooter(),
      facts: [
        {
          id: "abn",
          label: "ABN",
          value: "12 345 678 901",
          approval: "approved",
          queueItem: "Q-0002",
        },
        {
          id: "legal-entity",
          label: "Legal entity",
          value: "[VERIFY: registered legal entity name]",
          approval: "pending",
          queueItem: "Q-0001",
        },
      ],
    };
    const published = publishedFooter(content);
    expect(published.facts.map((f) => f.id)).toEqual(["abn"]);
  });

  it("drops a pending privacy link and email but keeps approved ones", () => {
    const content: FooterContent = {
      ...validFooter(),
      privacyLink: {
        label: "Privacy",
        href: "https://www.helixcollective.com/privacy",
        approval: "pending",
        queueItem: "Q-0005",
      },
      contactEmail: {
        id: "email",
        label: "Email",
        value: "hello@helixcollective.com",
        approval: "approved",
        queueItem: "Q-0006",
      },
    };
    const published = publishedFooter(content);
    expect(published.privacyLink).toBeUndefined();
    expect(published.contactEmail?.value).toBe("hello@helixcollective.com");
  });
});

describe("validateFooter guardrails", () => {
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

  it("rejects an identity fact with an invalid approval-queue id", () => {
    const content: FooterContent = {
      ...validFooter(),
      facts: [
        {
          id: "abn",
          label: "ABN",
          value: "12 345 678 901",
          approval: "pending",
          queueItem: "7",
        },
      ],
    };
    const errors = validateFooter(content);
    expect(errors.some((e) => e.includes("invalid approval-queue id"))).toBe(true);
  });

  it("rejects an approved fact that still contains a draft marker", () => {
    const content: FooterContent = {
      ...validFooter(),
      facts: [
        {
          id: "abn",
          label: "ABN",
          value: "[VERIFY: Australian Business Number]",
          approval: "approved",
          queueItem: "Q-0002",
        },
      ],
    };
    const errors = validateFooter(content);
    expect(errors.some((e) => e.includes("approved but still contains a draft marker"))).toBe(
      true,
    );
  });

  it("rejects duplicate identity facts", () => {
    const content: FooterContent = {
      ...validFooter(),
      facts: [
        { id: "abn", label: "ABN", value: "1", approval: "pending", queueItem: "Q-0002" },
        { id: "abn", label: "ABN", value: "2", approval: "pending", queueItem: "Q-0002" },
      ],
    };
    const errors = validateFooter(content);
    expect(errors.some((e) => e.includes("duplicate identity fact"))).toBe(true);
  });

  it("rejects a reintroduced team reference (section 14)", () => {
    const content: FooterContent = {
      ...validFooter(),
      facts: [
        {
          id: "team",
          label: "Our team",
          value: "Meet the team",
          approval: "pending",
          queueItem: "Q-0009",
        },
      ],
    };
    const errors = validateFooter(content);
    expect(errors.some((e) => e.includes('forbidden footer term "team"'))).toBe(true);
  });

  it("rejects a reintroduced investment CTA (section 14)", () => {
    const content: FooterContent = {
      ...validFooter(),
      facts: [
        {
          id: "invest",
          label: "Invest with us",
          value: "Back our ventures",
          approval: "pending",
          queueItem: "Q-0009",
        },
      ],
    };
    const errors = validateFooter(content);
    expect(errors.some((e) => e.includes('forbidden footer term "invest"'))).toBe(true);
    expect(errors.some((e) => e.includes('forbidden footer term "ventures"'))).toBe(true);
  });

  it("rejects old venture-volume-machine positioning (section 14)", () => {
    const content: FooterContent = {
      ...validFooter(),
      copyrightHolder: "Helix Collective, a venture studio",
    };
    const errors = validateFooter(content);
    expect(errors.some((e) => e.includes("forbidden positioning"))).toBe(true);
  });

  it("rejects a human or team count (section 5, 14)", () => {
    const content: FooterContent = {
      ...validFooter(),
      facts: [
        {
          id: "staff",
          label: "Our staff",
          value: "40 employees across three offices",
          approval: "pending",
          queueItem: "Q-0009",
        },
      ],
    };
    const errors = validateFooter(content);
    expect(errors.some((e) => e.includes("human or team count"))).toBe(true);
  });

  it("rejects site-wide forbidden copy anywhere in the footer", () => {
    const content: FooterContent = {
      ...validFooter(),
      copyrightHolder: "Helix Collective — world-class outcomes",
    };
    const errors = validateFooter(content);
    expect(errors.some((e) => e.includes("forbidden copy"))).toBe(true);
  });

  it("rejects a social link that is not an absolute HTTPS URL", () => {
    const content: FooterContent = {
      ...validFooter(),
      socialLinks: [
        {
          label: "LinkedIn",
          href: "http://linkedin.com/company/helix",
          approval: "approved",
          queueItem: "Q-0004",
        },
      ],
    };
    const errors = validateFooter(content);
    expect(errors.some((e) => e.includes("must use HTTPS"))).toBe(true);
  });

  it("rejects an approved contact email that does not look like an email", () => {
    const content: FooterContent = {
      ...validFooter(),
      contactEmail: {
        id: "email",
        label: "Email",
        value: "call us",
        approval: "approved",
        queueItem: "Q-0006",
      },
    };
    const errors = validateFooter(content);
    expect(errors.some((e) => e.includes("does not look like an email"))).toBe(true);
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
