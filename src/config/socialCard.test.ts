import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  OG_IMAGE_PATH,
  OG_IMAGE_WIDTH,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_TYPE,
  OG_IMAGE_ALT,
  wrapHeadline,
  renderSocialCardSvg,
  validateSocialCard,
  assertSocialCardValid,
} from "./socialCard";
import { HERO_EYEBROW, HERO_HEADLINE } from "./hero";
import { scanForbiddenCopy } from "./forbiddenCopy";

/** Read the committed social card relative to this module. */
function readCommittedCard(): string {
  const path = fileURLToPath(new URL("../../public/social/og-card.svg", import.meta.url));
  return readFileSync(path, "utf8");
}

describe("socialCard model", () => {
  it("is valid as authored", () => {
    expect(validateSocialCard()).toEqual([]);
    expect(() => assertSocialCardValid()).not.toThrow();
  });

  it("is the canonical 1200×630 SVG under /social/ (§7.3)", () => {
    expect(OG_IMAGE_WIDTH).toBe(1200);
    expect(OG_IMAGE_HEIGHT).toBe(630);
    expect(OG_IMAGE_TYPE).toBe("image/svg+xml");
    expect(OG_IMAGE_PATH).toMatch(/^\/social\/[a-z0-9-]+\.svg$/);
  });

  it("carries the approved hero eyebrow and enterprise-value headline (§7.3)", () => {
    const svg = renderSocialCardSvg();
    expect(svg).toContain(HERO_EYEBROW);
    expect(svg).toContain(HERO_HEADLINE.split(" ")[0]); // first wrapped word
    expect(svg).toContain("ENTERPRISE VALUE.");
  });
});

describe("wrapHeadline", () => {
  it("greedily wraps within the character budget", () => {
    expect(wrapHeadline(HERO_HEADLINE, 22)).toEqual([
      "WE WORK WITH",
      "BUSINESSES TO CREATE",
      "MEANINGFUL GROWTH IN",
      "ENTERPRISE VALUE.",
    ]);
    for (const line of wrapHeadline(HERO_HEADLINE, 22)) {
      expect(line.length).toBeLessThanOrEqual(22);
    }
  });

  it("keeps every word and never drops or splits one", () => {
    const words = HERO_HEADLINE.split(/\s+/);
    expect(wrapHeadline(HERO_HEADLINE, 22).join(" ").split(/\s+/)).toEqual(words);
  });
});

describe("social card safety guards (§7.3)", () => {
  it("ships no figure — the visible text is digit-free", () => {
    const visible = `${HERO_EYEBROW} ${HERO_HEADLINE} ${OG_IMAGE_ALT}`;
    expect(visible).not.toMatch(/\d/);
  });

  it("embeds no raster or external image, so no person can appear", () => {
    const svg = renderSocialCardSvg();
    expect(svg).not.toMatch(/<image\b/i);
    expect(svg).not.toMatch(/href/i);
  });

  it("uses only the brand mint/ink/white palette (§16.1)", () => {
    const svg = renderSocialCardSvg();
    const colors = [...svg.matchAll(/#[0-9a-f]{6}/gi)].map((m) => m[0].toLowerCase());
    for (const color of colors) {
      expect(["#000000", "#5affba", "#ffffff"]).toContain(color);
    }
  });

  it("keeps the copy and alt text clear of forbidden copy", () => {
    expect(scanForbiddenCopy(`${HERO_EYEBROW} ${HERO_HEADLINE} ${OG_IMAGE_ALT}`)).toEqual([]);
  });

  it("has a non-empty, digit-free og:image:alt", () => {
    expect(OG_IMAGE_ALT.trim()).toBeTruthy();
    expect(OG_IMAGE_ALT).not.toMatch(/\d/);
  });
});

describe("committed public/social/og-card.svg", () => {
  it("matches the model output, so the shipped artwork cannot drift", () => {
    expect(readCommittedCard()).toBe(renderSocialCardSvg());
  });
});
