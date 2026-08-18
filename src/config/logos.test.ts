import { describe, expect, it } from "vitest";
import {
  assertLogosValid,
  logos,
  marqueeLogos,
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

  it("has unique, local, alt-texted assets throughout", () => {
    const names = new Set<string>();
    for (const entry of logos) {
      expect(names.has(entry.name.toLowerCase())).toBe(false);
      names.add(entry.name.toLowerCase());
      expect(entry.asset).toMatch(/^[\w.-]+$/);
      expect(entry.alt.trim().length).toBeGreaterThan(0);
    }
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

  it("renders the whole register, in order", () => {
    expect(marqueeLogos().map((l) => l.name)).toEqual(logos.map((l) => l.name));
  });

  it("assertLogosValid throws with an aggregated message on a bad register", () => {
    const entries = cloneLogos();
    entries[0] = { ...entries[0], alt: "  " };
    expect(() => assertLogosValid(entries)).toThrow(/Invalid logo register/);
  });

  it("rejects a hotlinked asset", () => {
    const entries = cloneLogos();
    entries[0] = { ...entries[0], asset: "https://cdn.example.com/canva.png" };
    expect(validateLogos(entries).join("\n")).toMatch(/must use a local asset/);
  });
});
