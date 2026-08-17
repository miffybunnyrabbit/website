/**
 * Typed data model for the client/partner logo marquee (implementation plan
 * sections 8.4 and 20.2).
 *
 * The marquee is institutional proof, but every logo is also a rights and
 * accuracy question: the plan warns that "the presence of an old file" does not
 * mean Helix still has permission to publish it, and it requires three brands —
 * Awayco, Perion, and Synaptico — to be removed. Rather than silently dropping
 * those files (and later forgetting why), the plan asks for an *auditable*
 * record: the removed brands stay in this register with `status: "remove"` so
 * the requirement is visible and enforced, while the marquee component renders
 * only entries that are both kept and cleared for use (P4-002).
 *
 * Permission is a research gate (R-008, `docs/research/asset-register.csv`).
 * Until an entry's rights are confirmed it stays `permission: "pending"`, and
 * `marqueeLogos()` will not return it — the same honest default the case-study
 * model uses for unapproved claims. This module is pure content plus validation
 * and renders as a static, accessible list; it requires no client-side state.
 */

/** Whether a brand is kept, removed, or still under review (section 20.2). */
export type LogoStatus = "retain" | "remove" | "pending";

/** Whether Helix's right to publish the asset has been confirmed (R-008). */
export type LogoPermission = "approved" | "pending";

export interface LogoEntry {
  name: string;
  /** Local optimised asset filename; never a Webflow CDN URL (section 8.4). */
  asset: string;
  /**
   * Where the asset came from, for the R-008 rights spine. Defaults to
   * `live-site` — the live Webflow site's own published files — which is where
   * every brand carried over from the rebuild originates.
   */
  source?: string;
  website?: string;
  status: LogoStatus;
  permission: LogoPermission;
  /** Accessible alt text for the logo image. */
  alt: string;
}

/**
 * Brands that must not appear in the marquee, from two provenances:
 *
 *  - the three the plan itself requires be removed (sections 5 and 8.4) —
 *    Awayco, Perion, Synaptico;
 *  - the five the owner struck on 2026-08-17 — BCG, Agonics, Spec, Jubi, and
 *    Xylo, the last of which records the D-0008 decision ("retain its logo until
 *    the owner says otherwise").
 *
 * Both kinds are kept as explicit `remove` records so the removal is auditable
 * (P4-002); the validator forbids ever flipping one back to visible.
 */
export const REMOVED_BRANDS: readonly string[] = [
  "Awayco",
  "Perion",
  "Synaptico",
  "BCG",
  "Agonics",
  "Spec",
  "Jubi",
  "Xylo",
];

/**
 * The reconciled logo register. Brands are the set observed on the live site
 * (section 8.4) plus OccuMed, added by the owner on 2026-08-17 from the client's
 * own site; removed brands carry `status: "remove"`, and every retained brand
 * carries `permission: "approved"` — Q-0006 cleared the live-site set for
 * publication on 2026-07-29, the assets sourced from the live site's own
 * published files (asset register, R-008). The gate still stands for any future
 * entry: an unconfirmed brand would stay `permission: "pending"` and be withheld
 * by `marqueeLogos()`; none currently are.
 *
 * Five brands the live site carried are struck on the owner's 2026-08-17
 * instruction — BCG, Agonics, Spec, Jubi, and Xylo — and keep auditable `remove`
 * records below. Xylo's removal is the recorded D-0008 decision: previously only
 * its *case study* was removed and its logo retained.
 */
export const logos: readonly LogoEntry[] = [
  { name: "Canva", asset: "canva.png", status: "retain", permission: "approved", alt: "Canva" },
  { name: "Google", asset: "google.png", status: "retain", permission: "approved", alt: "Google" },
  { name: "13SICK", asset: "13sick.png", status: "retain", permission: "approved", alt: "13SICK" },
  { name: "CommBank", asset: "commbank.png", status: "retain", permission: "approved", alt: "CommBank" },
  { name: "Australia Post", asset: "australia-post.png", status: "retain", permission: "approved", alt: "Australia Post" },
  { name: "eftpos", asset: "eftpos.png", status: "retain", permission: "approved", alt: "eftpos" },
  { name: "Sydney Airport", asset: "sydney-airport.png", status: "retain", permission: "approved", alt: "Sydney Airport" },
  { name: "Macquarie", asset: "macquarie.png", status: "retain", permission: "approved", alt: "Macquarie" },
  { name: "Neara", asset: "neara.png", status: "retain", permission: "approved", alt: "Neara" },
  { name: "Filecoin", asset: "filecoin.png", status: "retain", permission: "approved", alt: "Filecoin" },
  { name: "Veyor", asset: "veyor.png", status: "retain", permission: "approved", alt: "Veyor" },
  { name: "Ferovinum", asset: "ferovinum.png", status: "retain", permission: "approved", alt: "Ferovinum" },
  { name: "Origami", asset: "origami.png", status: "retain", permission: "approved", alt: "Origami" },
  {
    name: "OccuMed",
    asset: "occumed.png",
    source: "occumed.com.au",
    website: "https://occumed.com.au",
    status: "retain",
    permission: "approved",
    alt: "OccuMed",
  },
  // Removed brands, kept as auditable records (P4-002). Never renderable.
  { name: "Awayco", asset: "awayco.svg", status: "remove", permission: "pending", alt: "Awayco" },
  { name: "Perion", asset: "perion.svg", status: "remove", permission: "pending", alt: "Perion" },
  { name: "Synaptico", asset: "synaptico.svg", status: "remove", permission: "pending", alt: "Synaptico" },
  // Struck by the owner on 2026-08-17; rights were confirmed (Q-0006), so the
  // permission stays `approved` and only the marquee status changes.
  { name: "BCG", asset: "bcg.png", status: "remove", permission: "approved", alt: "BCG" },
  { name: "Agonics", asset: "agonics.png", status: "remove", permission: "approved", alt: "Agonics" },
  { name: "Spec", asset: "spec.png", status: "remove", permission: "approved", alt: "Spec" },
  { name: "Jubi", asset: "jubi.png", status: "remove", permission: "approved", alt: "Jubi" },
  { name: "Xylo", asset: "xylo.png", status: "remove", permission: "approved", alt: "Xylo" },
];

/** True when `name` matches a brand the plan requires be removed. */
function isRemovedBrand(name: string): boolean {
  const lower = name.trim().toLowerCase();
  return REMOVED_BRANDS.some((brand) => brand.toLowerCase() === lower);
}

/**
 * Validate the logo register against the section 8.4 / 20.2 rules. Returns the
 * list of problems; an empty list means the register is well-formed. The
 * production build should treat any non-empty result as fatal.
 */
export function validateLogos(entries: readonly LogoEntry[] = logos): string[] {
  const errors: string[] = [];

  // Every removed brand must be present as an explicit, non-visible record so
  // the removal is auditable rather than a silently dropped file (P4-002).
  const byName = new Map(entries.map((e) => [e.name.trim().toLowerCase(), e]));
  for (const brand of REMOVED_BRANDS) {
    const entry = byName.get(brand.toLowerCase());
    if (!entry) {
      errors.push(
        `Removed brand "${brand}" must remain in the register as an auditable "remove" record.`,
      );
    } else if (entry.status !== "remove") {
      errors.push(
        `Removed brand "${brand}" must have status "remove" but has "${entry.status}".`,
      );
    }
  }

  // Names must be unique so the register and the rendered marquee are unambiguous.
  const seen = new Set<string>();
  for (const entry of entries) {
    const key = entry.name.trim().toLowerCase();
    if (seen.has(key)) {
      errors.push(`Duplicate logo entry "${entry.name}".`);
    }
    seen.add(key);
  }

  // Per-entry structural checks and the removed-brand safety net.
  for (const entry of entries) {
    if (!entry.name.trim()) {
      errors.push("A logo entry is missing its name.");
    }
    if (!entry.asset.trim()) {
      errors.push(`Logo "${entry.name}" is missing an asset filename.`);
    } else if (/^https?:\/\//i.test(entry.asset)) {
      // Assets must be local and optimised, never hotlinked (section 8.4).
      errors.push(
        `Logo "${entry.name}" must use a local asset, not a URL ("${entry.asset}").`,
      );
    }
    if (!entry.alt.trim()) {
      errors.push(`Logo "${entry.name}" is missing alt text.`);
    }

    // A removed brand must never be renderable, whatever its other fields say.
    if (isRemovedBrand(entry.name) && isVisible(entry)) {
      errors.push(
        `Removed brand "${entry.name}" must not be visible in the marquee.`,
      );
    }
  }

  return errors;
}

/**
 * Assert the logo register is valid, throwing on failure. Intended for use at
 * build time so a broken register — or a removed brand slipping back in — fails
 * the production build.
 */
export function assertLogosValid(entries: readonly LogoEntry[] = logos): void {
  const errors = validateLogos(entries);
  if (errors.length > 0) {
    throw new Error(`Invalid logo register:\n- ${errors.join("\n- ")}`);
  }
}

/** True when an entry is both kept and cleared for use (section 20.2). */
function isVisible(entry: LogoEntry): boolean {
  return entry.status === "retain" && entry.permission === "approved";
}

/**
 * The logos a production build should render in the marquee: only entries that
 * are both `status: "retain"` and `permission: "approved"`, in register order.
 * Until an asset's rights are confirmed (R-008) it is withheld, so unapproved or
 * removed logos never leak into `dist` (section 20.2).
 */
export function marqueeLogos(entries: readonly LogoEntry[] = logos): LogoEntry[] {
  return entries.filter(isVisible);
}
