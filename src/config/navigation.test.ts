import { describe, expect, it } from "vitest";
import { PRIMARY_CTA_LABEL } from "./cta";
import {
  FORBIDDEN_NAV_LABEL_TERMS,
  HOMEPAGE_SECTION_IDS,
  anchorHref,
  assertNavValid,
  headerNav,
  validateNav,
  type HeaderNav,
} from "./navigation";

/** A well-formed header nav for tests to start from and mutate. */
function validNav(): HeaderNav {
  return {
    brand: { label: "Helix Collective", href: "/" },
    items: [
      { label: "Work", target: "work" },
      { label: "How we work", target: "how-we-work" },
      { label: "Fit", target: "fit" },
    ],
    ctaLabel: PRIMARY_CTA_LABEL,
  };
}

describe("headerNav configuration", () => {
  it("is valid as shipped", () => {
    expect(validateNav()).toEqual([]);
    expect(() => assertNavValid()).not.toThrow();
  });

  it("uses the single approved CTA label (§13)", () => {
    expect(headerNav.ctaLabel).toBe(PRIMARY_CTA_LABEL);
  });

  it("exposes the three approved anchors in reading order (§8.1)", () => {
    expect(headerNav.items.map((i) => i.target)).toEqual([
      "how-we-work",
      "work",
      "fit",
    ]);
  });

  // The anchors are a reading path, so they must follow the page's own section
  // order rather than a fixed list that can drift when a section moves — the
  // case-studies band moving after "How we work" is exactly that case.
  it("keeps the anchors in HOMEPAGE_SECTION_IDS order (§7)", () => {
    const targets = headerNav.items.map((i) => i.target);
    const inPageOrder = HOMEPAGE_SECTION_IDS.filter((id) =>
      targets.includes(id),
    );
    expect(targets).toEqual([...inPageOrder]);
  });

  it("brand link returns to the site root", () => {
    expect(headerNav.brand.href).toBe("/");
    expect(headerNav.brand.label).toBe("Helix Collective");
  });

  it("only targets known homepage sections (§7)", () => {
    const known = new Set<string>(HOMEPAGE_SECTION_IDS);
    for (const item of headerNav.items) {
      expect(known.has(item.target)).toBe(true);
    }
  });

  it("has no team, people, or investor links (§8.1)", () => {
    const labels = headerNav.items.map((i) => i.label.toLowerCase()).join(" ");
    for (const term of FORBIDDEN_NAV_LABEL_TERMS) {
      expect(labels).not.toContain(term);
    }
  });
});

describe("validateNav guardrails", () => {
  it("rejects a header CTA whose label diverges from the approved label", () => {
    const nav = { ...validNav(), ctaLabel: "BOOK A CALL" };
    const errors = validateNav(nav);
    expect(errors.some((e) => e.includes("does not match"))).toBe(true);
  });

  it("rejects a missing CTA label", () => {
    const nav = { ...validNav(), ctaLabel: "  " };
    const errors = validateNav(nav);
    expect(errors.some((e) => e.includes("Header CTA label is missing"))).toBe(
      true,
    );
  });

  it("rejects a missing brand label or href", () => {
    const nav: HeaderNav = { ...validNav(), brand: { label: " ", href: "" } };
    const errors = validateNav(nav);
    expect(errors.some((e) => e.includes("brand link is missing a label"))).toBe(
      true,
    );
    expect(errors.some((e) => e.includes("brand link is missing an href"))).toBe(
      true,
    );
  });

  it("rejects an anchor targeting an unknown section", () => {
    const nav: HeaderNav = {
      ...validNav(),
      // `pricing` is not a homepage section.
      items: [{ label: "Pricing", target: "pricing" as never }],
    };
    const errors = validateNav(nav);
    expect(errors.some((e) => e.includes("unknown section"))).toBe(true);
  });

  it("rejects duplicate anchor targets", () => {
    const nav: HeaderNav = {
      ...validNav(),
      items: [
        { label: "Work", target: "work" },
        { label: "Our work", target: "work" },
      ],
    };
    const errors = validateNav(nav);
    expect(errors.some((e) => e.includes("duplicate anchor target"))).toBe(true);
  });

  it("rejects an anchor with an empty label", () => {
    const nav: HeaderNav = {
      ...validNav(),
      items: [{ label: "  ", target: "work" }],
    };
    const errors = validateNav(nav);
    expect(errors.some((e) => e.includes("empty label"))).toBe(true);
  });

  it("rejects a reintroduced team link (§8.1)", () => {
    const nav: HeaderNav = {
      ...validNav(),
      items: [
        ...validNav().items,
        { label: "Team", target: "top" },
      ],
    };
    const errors = validateNav(nav);
    expect(errors.some((e) => e.includes('forbidden term "team"'))).toBe(true);
  });

  it("rejects a reintroduced invest-in-ventures link (§8.1, P4-005)", () => {
    const nav: HeaderNav = {
      ...validNav(),
      items: [
        ...validNav().items,
        { label: "Invest in our ventures", target: "top" },
      ],
    };
    const errors = validateNav(nav);
    expect(errors.some((e) => e.includes('forbidden term "invest"'))).toBe(true);
    expect(errors.some((e) => e.includes('forbidden term "ventures"'))).toBe(
      true,
    );
  });

  it("rejects a label containing site-wide forbidden copy", () => {
    const nav: HeaderNav = {
      ...validNav(),
      items: [{ label: "World-class work", target: "work" }],
    };
    const errors = validateNav(nav);
    expect(errors.some((e) => e.includes("forbidden copy"))).toBe(true);
  });

  it("rejects a header with more anchors than homepage sections", () => {
    const nav: HeaderNav = {
      ...validNav(),
      items: HOMEPAGE_SECTION_IDS.map((id, i) => ({
        label: `Link ${i}`,
        target: id,
      })).concat({ label: "Extra", target: "work" }),
    };
    const errors = validateNav(nav);
    expect(errors.some((e) => e.includes("minimal header links to at most"))).toBe(
      true,
    );
  });

  it("assertNavValid throws an aggregated message on bad config", () => {
    const nav = { ...validNav(), ctaLabel: "GET IN TOUCH" };
    expect(() => assertNavValid(nav)).toThrow(/Invalid header navigation/);
  });
});

describe("anchorHref", () => {
  it("prefixes the target with #", () => {
    expect(anchorHref({ label: "Fit", target: "fit" })).toBe("#fit");
  });
});
