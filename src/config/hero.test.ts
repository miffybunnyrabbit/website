import { describe, expect, it } from "vitest";
import { PRIMARY_CTA_LABEL } from "./cta";
import {
  assertHeroValid,
  hero,
  heroSupportingCopy,
  HERO_EYEBROW,
  HERO_HEADLINE,
  HERO_SUPPORTING_COPY,
  validateHero,
  type HeroCopy,
} from "./hero";

/** Clone the canonical hero so a test can mutate it safely. */
function cloneHero(overrides: Partial<HeroCopy> = {}): HeroCopy {
  return { ...hero, ...overrides };
}

describe("hero configuration", () => {
  it("carries the approved eyebrow, headline, and CTA label", () => {
    expect(hero.eyebrow).toBe(HERO_EYEBROW);
    expect(hero.headline).toBe(HERO_HEADLINE);
    expect(hero.ctaLabel).toBe(PRIMARY_CTA_LABEL);
  });

  it("states the enterprise-value promise in the headline", () => {
    expect(hero.headline).toMatch(/enterprise value/i);
  });

  it("ships the safe aligned supporting copy by default", () => {
    expect(hero.supportingVariant).toBe("aligned");
    expect(heroSupportingCopy()).toBe(HERO_SUPPORTING_COPY.aligned);
    // The literal payment claim is not the default copy.
    expect(heroSupportingCopy()).not.toMatch(/get paid when you get paid/i);
  });

  it("leaves the performance-linked claim unapproved until D-009 is recorded", () => {
    expect(hero.performanceLinkedApproval).toBe("pending");
  });

  it("passes its own validation as authored", () => {
    expect(validateHero()).toEqual([]);
    expect(() => assertHeroValid()).not.toThrow();
  });
});

describe("validateHero guardrails", () => {
  it("rejects a changed eyebrow", () => {
    const errors = validateHero(cloneHero({ eyebrow: "THE HELIX TEAM" }));
    expect(errors.some((e) => e.includes("eyebrow"))).toBe(true);
  });

  it("rejects a softened headline (§8.2)", () => {
    const errors = validateHero(
      cloneHero({ headline: "WE HELP BUSINESSES UNLOCK THEIR DIGITAL POTENTIAL." }),
    );
    expect(errors.some((e) => e.includes("softened"))).toBe(true);
  });

  it("rejects a headline that drops the enterprise-value promise", () => {
    const errors = validateHero(
      cloneHero({ headline: "WE BUILD GREAT PRODUCTS FOR AMBITIOUS TEAMS." }),
    );
    expect(errors.some((e) => e.includes("enterprise value"))).toBe(true);
  });

  it("rejects a bespoke CTA label (§13)", () => {
    const errors = validateHero(cloneHero({ ctaLabel: "BOOK A CALL" }));
    expect(errors.some((e) => e.includes("approved label"))).toBe(true);
  });

  it("rejects the performance-linked variant while D-009 is pending", () => {
    const errors = validateHero(
      cloneHero({
        supportingVariant: "performance-linked",
        performanceLinkedApproval: "pending",
      }),
    );
    expect(errors.some((e) => e.includes("D-009"))).toBe(true);
  });

  it("allows the performance-linked variant once D-009 is approved", () => {
    const config = cloneHero({
      supportingVariant: "performance-linked",
      performanceLinkedApproval: "approved",
    });
    expect(validateHero(config)).toEqual([]);
    expect(heroSupportingCopy(config)).toMatch(/get paid when you get paid/i);
  });

  it("rejects forbidden copy in the supporting line", () => {
    const errors = validateHero(
      cloneHero({ supportingLine: "A world-class digital transformation partner." }),
    );
    expect(errors.some((e) => e.includes("forbidden copy"))).toBe(true);
  });

  it("rejects draft markers left in the copy", () => {
    const errors = validateHero(
      cloneHero({ supportingLine: "Aligned economics. (TODO: confirm wording)" }),
    );
    expect(errors.some((e) => e.includes("draft marker"))).toBe(true);
  });

  it("assertHeroValid throws with an aggregated message on bad config", () => {
    expect(() => assertHeroValid(cloneHero({ eyebrow: "" }))).toThrow(/Invalid hero/);
  });
});
