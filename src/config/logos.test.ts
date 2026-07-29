import { describe, expect, it } from "vitest";
import {
  assertLogosValid,
  logos,
  marqueeLogos,
  REMOVED_BRANDS,
  validateLogos,
  type LogoEntry,
} from "./logos";

/** Shallow-clone the canonical register so a test can mutate it safely. */
function cloneLogos(): LogoEntry[] {
  return logos.map((entry) => ({ ...entry }));
}

describe("logo register", () => {
  it("passes its own validation as authored", () => {
    expect(validateLogos()).toEqual([]);
    expect(() => assertLogosValid()).not.toThrow();
  });

  it("keeps the removed brands as auditable, non-visible records", () => {
    for (const brand of REMOVED_BRANDS) {
      const entry = logos.find(
        (l) => l.name.toLowerCase() === brand.toLowerCase(),
      );
      expect(entry, `${brand} record`).toBeDefined();
      expect(entry?.status).toBe("remove");
    }
    // ...and none of them appears in the rendered marquee.
    const visibleNames = marqueeLogos().map((l) => l.name.toLowerCase());
    for (const brand of REMOVED_BRANDS) {
      expect(visibleNames).not.toContain(brand.toLowerCase());
    }
  });

  it("retains the Xylo logo even though its case study is removed (D-008)", () => {
    const xylo = logos.find((l) => l.name.toLowerCase() === "xylo");
    expect(xylo).toBeDefined();
    expect(xylo?.status).toBe("retain");
  });

  it("has unique, local, alt-texted assets throughout", () => {
    const names = new Set<string>();
    for (const entry of logos) {
      expect(names.has(entry.name.toLowerCase())).toBe(false);
      names.add(entry.name.toLowerCase());
      expect(entry.asset).toMatch(/^[\w.-]+$/);
      expect(entry.alt.trim().length).toBeGreaterThan(0);
    }
  });

  it("publishes every retained logo now Q-0006 confirmed the rights", () => {
    // The 2026-07-29 Q-0006 approval cleared every retained brand, so the
    // marquee publishes the full register from local assets.
    expect(marqueeLogos()).toHaveLength(18);
    expect(marqueeLogos().every((l) => l.permission === "approved")).toBe(true);
  });

  it("withholds logos whose rights are not confirmed", () => {
    // Winding permissions back to pending gates the marquee shut again.
    const pending = logos.map((e) => ({ ...e, permission: "pending" as const }));
    expect(marqueeLogos(pending)).toEqual([]);
  });

  it("renders only retained, permission-approved entries", () => {
    const fixture: LogoEntry[] = [
      { name: "Kept", asset: "kept.svg", status: "retain", permission: "approved", alt: "Kept" },
      { name: "Unlicensed", asset: "u.svg", status: "retain", permission: "pending", alt: "U" },
      { name: "Dropped", asset: "d.svg", status: "remove", permission: "approved", alt: "D" },
      { name: "Review", asset: "r.svg", status: "pending", permission: "approved", alt: "R" },
    ];
    expect(marqueeLogos(fixture).map((l) => l.name)).toEqual(["Kept"]);
  });
});

describe("validateLogos guardrails", () => {
  it("rejects a removed brand flipped back to visible", () => {
    const entries = cloneLogos();
    const awayco = entries.find((l) => l.name === "Awayco")!;
    awayco.status = "retain";
    awayco.permission = "approved";
    const errors = validateLogos(entries);
    expect(errors.some((e) => e.includes("Awayco"))).toBe(true);
    expect(errors.some((e) => e.includes("must not be visible"))).toBe(true);
  });

  it("rejects a removed brand that has been deleted from the register", () => {
    const entries = cloneLogos().filter((l) => l.name !== "Perion");
    const errors = validateLogos(entries);
    expect(
      errors.some((e) => e.includes("Perion") && e.includes("auditable")),
    ).toBe(true);
  });

  it("rejects a removed brand whose status is no longer 'remove'", () => {
    const entries = cloneLogos();
    entries.find((l) => l.name === "Synaptico")!.status = "pending";
    const errors = validateLogos(entries);
    expect(
      errors.some((e) => e.includes("Synaptico") && e.includes('status "remove"')),
    ).toBe(true);
  });

  it("rejects a hotlinked (non-local) asset", () => {
    const entries = cloneLogos();
    entries[0].asset = "https://cdn.webflow.com/logo.svg";
    const errors = validateLogos(entries);
    expect(errors.some((e) => e.includes("local asset"))).toBe(true);
  });

  it("rejects duplicate entries, a missing asset, and missing alt text", () => {
    const entries = cloneLogos();
    entries.push({ ...entries[0] });
    entries[1].asset = "  ";
    entries[2].alt = "";
    const errors = validateLogos(entries);
    expect(errors.some((e) => e.includes("Duplicate logo entry"))).toBe(true);
    expect(errors.some((e) => e.includes("missing an asset"))).toBe(true);
    expect(errors.some((e) => e.includes("missing alt text"))).toBe(true);
  });

  it("assertLogosValid throws with an aggregated message on a bad register", () => {
    const entries = cloneLogos().filter((l) => l.name !== "Awayco");
    expect(() => assertLogosValid(entries)).toThrow(/Invalid logo register/);
  });
});
