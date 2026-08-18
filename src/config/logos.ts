/**
 * Typed data model for the client/partner logo marquee (§8.4).
 *
 * The marquee is institutional proof: the brands Helix has built with, scrolling
 * as a single accessible strip. This module is the one list of what appears
 * there, and the component renders it verbatim — the rights register and
 * removal-audit machinery that used to sit between the two was removed on
 * 2026-08-18, once every brand here had cleared it and the brands that were
 * struck had been struck. The record of both is frozen under `docs/`.
 *
 * Adding a brand here publishes it, so the file it names must exist under
 * `public/logos/` (gated by `publishedAssets.ts`) and Helix must actually have
 * the right to show it. This module is pure content plus validation and renders
 * as a static list; it requires no client-side state.
 */

export interface LogoEntry {
  name: string;
  /** Local optimised asset filename; never a Webflow CDN URL (§8.4). */
  asset: string;
  website?: string;
  /** Accessible alt text for the logo image. */
  alt: string;
}

/**
 * The brands the marquee shows, in scroll order.
 */
export const logos: readonly LogoEntry[] = [
  { name: "Canva", asset: "canva.png", alt: "Canva" },
  { name: "Google", asset: "google.png", alt: "Google" },
  { name: "13SICK", asset: "13sick.png", alt: "13SICK" },
  { name: "CommBank", asset: "commbank.png", alt: "CommBank" },
  { name: "Australia Post", asset: "australia-post.png", alt: "Australia Post" },
  { name: "eftpos", asset: "eftpos.png", alt: "eftpos" },
  { name: "Sydney Airport", asset: "sydney-airport.png", alt: "Sydney Airport" },
  { name: "Macquarie", asset: "macquarie.png", alt: "Macquarie" },
  { name: "Neara", asset: "neara.png", alt: "Neara" },
  { name: "Filecoin", asset: "filecoin.png", alt: "Filecoin" },
  { name: "Veyor", asset: "veyor.png", alt: "Veyor" },
  { name: "Ferovinum", asset: "ferovinum.png", alt: "Ferovinum" },
  { name: "Origami", asset: "origami.png", alt: "Origami" },
  {
    name: "OccuMed",
    asset: "occumed.png",
    website: "https://occumed.com.au",
    alt: "OccuMed",
  },
];

/**
 * Validate the logo register (§8.4). Returns the list of problems; an empty list
 * means the register is well-formed. The production build treats any non-empty
 * result as fatal.
 */
export function validateLogos(entries: readonly LogoEntry[] = logos): string[] {
  const errors: string[] = [];

  // Names must be unique so the register and the rendered marquee are unambiguous.
  const seen = new Set<string>();
  for (const entry of entries) {
    const key = entry.name.trim().toLowerCase();
    if (seen.has(key)) {
      errors.push(`Duplicate logo entry "${entry.name}".`);
    }
    seen.add(key);

    if (!entry.name.trim()) {
      errors.push("A logo entry is missing its name.");
    }
    if (!entry.asset.trim()) {
      errors.push(`Logo "${entry.name}" is missing an asset filename.`);
    } else if (/^https?:\/\//i.test(entry.asset)) {
      // Assets must be local and optimised, never hotlinked (§8.4).
      errors.push(
        `Logo "${entry.name}" must use a local asset, not a URL ("${entry.asset}").`,
      );
    }
    if (!entry.alt.trim()) {
      errors.push(`Logo "${entry.name}" is missing alt text.`);
    }
  }

  return errors;
}

/**
 * Assert the logo register is valid, throwing on failure. Intended for use at
 * build time so a broken register fails the production build.
 */
export function assertLogosValid(entries: readonly LogoEntry[] = logos): void {
  const errors = validateLogos(entries);
  if (errors.length > 0) {
    throw new Error(`Invalid logo register:\n- ${errors.join("\n- ")}`);
  }
}

/** The logos the marquee renders, in register order. */
export function marqueeLogos(entries: readonly LogoEntry[] = logos): LogoEntry[] {
  return [...entries];
}
