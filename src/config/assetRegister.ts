/**
 * Typed, self-validating asset register (implementation plan §17.9 R-008, and the
 * §8.4 / §16.5 rules on logo and imagery rights).
 *
 * Every image the site can ship — each marquee logo and each case-study visual —
 * is a rights and accuracy question: the plan warns that "the presence of an old
 * file" does not mean Helix still has permission to publish it, and it requires
 * that permission, usage, and removal status be recorded in
 * `docs/research/asset-register.csv`. `logos.ts` already points here as the
 * research gate behind its `permission: "pending"` defaults, but until now that
 * file did not exist, so the rights record the marquee and case studies lean on
 * was a dangling reference.
 *
 * Following the same convention as `claimsLedger.ts`, this module is the single
 * validated source of truth and derives its per-asset facts (filename, alt text,
 * permission, removal status) from the live `logos` and `caseStudies` models
 * rather than duplicating them, so the register can never drift from the content
 * it governs. What it *adds* is the R-008 rights spine: origin, owner, usage,
 * whether the asset contains people or confidential UI, and whether it must stay
 * off the site. Assets the plan requires be *removed* but that no longer live in
 * any content model — the Xylo case-study panel and the old "humans of Helix"
 * team imagery — are kept here as explicit legacy records so the removal stays
 * auditable rather than silently forgotten (the same principle `logos.ts` uses
 * for the removed brands).
 *
 * `docs/research/asset-register.csv` is generated from this model
 * (`renderAssetRegisterCsv`) with the exact R-008 column set, and
 * `assetRegister.test.ts` asserts the committed file still matches, so the
 * printable register can never drift from the code.
 *
 * This module is pure content plus validation: no UI, no client-side state. It
 * invents no permissions — it derives each asset's status from the model that
 * owns it. Q-0006 cleared all 18 marquee-logo assets for publication on
 * 2026-07-29 (sourced from the live site's own published files), so those rows
 * now carry `approved`; the case-study imagery and the legacy Xylo/"humans of
 * Helix" records are still `pending` until their rights are confirmed. The gate
 * still stands for any future entry — an unconfirmed asset stays `pending` and
 * is withheld — the same honest default the logo and claims models use.
 */

import { caseStudies, type CaseStudy } from "./caseStudies";
import { logos, REMOVED_BRANDS, type LogoEntry } from "./logos";

/** Where an asset is used, or why it is retained as a removed record. */
export type AssetType = "logo" | "case-study-image" | "legacy";

/** Whether Helix's right to publish the asset has been confirmed (R-008). */
export type AssetPermission = "approved" | "pending";

/**
 * One asset-register row. The visitor-facing facts (filename, alt text,
 * permission, removal status) are *derived* from the live content models for
 * logo and case-study rows; only `legacy` rows author them, because the assets
 * they track no longer live in any model.
 */
export interface AssetRecord {
  /** Stable identifier, `A-<filename-without-extension>`. */
  id: string;
  /** Brand or entity the asset depicts. */
  company: string;
  type: AssetType;
  /** Local optimised filename; never a Webflow CDN URL (§8.4). */
  filename: string;
  /** Where the file originated (e.g. the live site, internal capture). */
  source: string;
  /** Who owns the rights to the asset. */
  owner: string;
  /** Whether the right to publish has been confirmed (R-008). */
  permissionStatus: AssetPermission;
  /** How the asset is (or was) used on the site. */
  usage: string;
  /** Accessible alt text, where the asset is rendered. */
  altText: string;
  /** True if the asset depicts identifiable people (§16.4 forbids portraits). */
  containsPeople: boolean;
  /** True if the asset shows confidential product UI or customer data (§16.5). */
  containsConfidentialUi: boolean;
  /** True if the plan requires this asset be kept off the published site. */
  removeFromSite: boolean;
  /** Optional free-text note. */
  notes?: string;
}

/** Format of an asset id, e.g. `A-neara` or `A-xylo-case-study`. */
export const ASSET_ID_PATTERN = /^A-[a-z0-9-]+$/;

/** Derive a stable asset id from its filename (drops the extension). */
export function assetIdFor(filename: string): string {
  return `A-${filename.replace(/\.[^.]+$/, "")}`;
}

/**
 * Assets the plan requires be *removed* but that no longer exist in any live
 * content model, kept here as explicit auditable records so the removal is
 * visible and enforced (R-008 asks these be marked explicitly). The removed
 * brands Awayco, Perion, and Synaptico are covered by the derived logo rows,
 * since they still live in the `logos` register as `status: "remove"`.
 */
export const LEGACY_REMOVED_ASSETS: readonly AssetRecord[] = [
  {
    id: "A-xylo-case-study",
    company: "Xylo",
    type: "legacy",
    filename: "xylo-case-study.png",
    source: "live-site",
    owner: "Xylo",
    permissionStatus: "pending",
    usage: "removed-case-study-panel",
    altText: "",
    containsPeople: false,
    containsConfidentialUi: false,
    removeFromSite: true,
    notes:
      "Xylo case-study panel removed (§9.6); its marquee logo is retained separately (D-008).",
  },
  {
    id: "A-humans-of-helix",
    company: "Helix Collective",
    type: "legacy",
    filename: "humans-of-helix.jpg",
    source: "live-site",
    owner: "Helix Collective",
    permissionStatus: "pending",
    usage: "removed-team-section",
    altText: "",
    containsPeople: true,
    containsConfidentialUi: false,
    removeFromSite: true,
    notes:
      "People/team imagery removed with the institutional repositioning (§5, §14).",
  },
];

/** Derive the register row for a marquee logo from the live `logos` model. */
function logoAssetRecord(logo: LogoEntry): AssetRecord {
  const removed = logo.status === "remove";
  return {
    id: assetIdFor(logo.asset),
    company: logo.name,
    type: "logo",
    filename: logo.asset,
    source: "live-site",
    owner: "external-brand",
    permissionStatus: logo.permission,
    usage: "logo-marquee",
    altText: logo.alt,
    containsPeople: false,
    containsConfidentialUi: false,
    removeFromSite: removed,
    notes: removed
      ? "Removed brand (§5, §8.4); retained as an auditable record (P4-002)."
      : "",
  };
}

/** Derive the register row for a case study's product image, if it has one. */
function caseStudyImageRecord(study: CaseStudy): AssetRecord | undefined {
  const image = study.image?.trim();
  if (!image) return undefined;
  return {
    id: assetIdFor(image),
    company: study.name,
    type: "case-study-image",
    filename: image,
    source: "internal",
    owner: study.name,
    permissionStatus: study.assetApproval,
    usage: "case-study-card",
    altText: study.imageAlt ?? "",
    containsPeople: false,
    containsConfidentialUi: false,
    removeFromSite: false,
    notes: "",
  };
}

/**
 * Build the register from the live models plus the legacy removed records. Every
 * marquee logo becomes a row; every case study with a product image becomes a
 * row; the removed Xylo panel and team imagery are appended as legacy rows. Order
 * is stable and matches the models so the generated CSV is deterministic.
 */
export function buildAssetRegister(
  logoList: readonly LogoEntry[] = logos,
  studies: readonly CaseStudy[] = caseStudies,
): AssetRecord[] {
  const logoRows = logoList.map(logoAssetRecord);
  const imageRows = studies
    .map(caseStudyImageRecord)
    .filter((r): r is AssetRecord => r !== undefined);
  return [...logoRows, ...imageRows, ...LEGACY_REMOVED_ASSETS];
}

/** The live asset register, derived from the current content models. */
export const assetRegister: readonly AssetRecord[] = buildAssetRegister();

/** Look up a register row by id. */
export function assetById(
  id: string,
  register: readonly AssetRecord[] = assetRegister,
): AssetRecord | undefined {
  return register.find((a) => a.id === id);
}

/**
 * The assets a production build may reference: those cleared for use and not
 * flagged for removal. Mirrors `marqueeLogos()` — an asset whose rights are still
 * `pending`, or that the plan requires be removed, is withheld (R-008).
 */
export function publishableAssets(
  register: readonly AssetRecord[] = assetRegister,
): AssetRecord[] {
  return register.filter(
    (a) => !a.removeFromSite && a.permissionStatus === "approved",
  );
}

/**
 * Validate the asset register against the R-008 / §8.4 / §16.5 rules and
 * cross-check it against the live `logos` and `caseStudies` models. Returns the
 * list of problems; an empty list means the register is well-formed and complete.
 * The production build treats any non-empty result as fatal.
 */
export function validateAssetRegister(
  register: readonly AssetRecord[] = assetRegister,
  logoList: readonly LogoEntry[] = logos,
  studies: readonly CaseStudy[] = caseStudies,
): string[] {
  const errors: string[] = [];

  // --- Per-row structural checks. ---
  const seenIds = new Set<string>();
  const seenFiles = new Set<string>();
  for (const asset of register) {
    if (!ASSET_ID_PATTERN.test(asset.id)) {
      errors.push(`Asset id "${asset.id}" is not of the form A-short-title.`);
    }
    if (seenIds.has(asset.id)) {
      errors.push(`Duplicate asset id "${asset.id}".`);
    }
    seenIds.add(asset.id);

    const file = asset.filename.trim();
    if (!file) {
      errors.push(`Asset "${asset.id}" is missing a filename.`);
    } else {
      if (/^https?:\/\//i.test(file)) {
        // Assets must be local and optimised, never hotlinked (§8.4).
        errors.push(
          `Asset "${asset.id}" must use a local file, not a URL ("${file}").`,
        );
      }
      const key = file.toLowerCase();
      if (seenFiles.has(key)) {
        errors.push(`Duplicate asset filename "${file}" ("${asset.id}").`);
      }
      seenFiles.add(key);
    }
    if (!asset.company.trim()) {
      errors.push(`Asset "${asset.id}" is missing a company/owner subject.`);
    }

    // §16.4/§16.5: a visible asset must not contain portraits or confidential UI.
    const visible = !asset.removeFromSite;
    if (visible && asset.containsPeople) {
      errors.push(
        `Asset "${asset.id}" depicts people but is not marked for removal (§16.4 forbids portraits).`,
      );
    }
    if (visible && asset.containsConfidentialUi) {
      errors.push(
        `Asset "${asset.id}" contains confidential UI but is not marked for removal (§16.5).`,
      );
    }
  }

  // --- Cross-check: every marquee logo has a matching register row, derived
  //     consistently, so a hand-edited register cannot drift from `logos`. ---
  for (const logo of logoList) {
    const row = register.find(
      (a) => a.filename.toLowerCase() === logo.asset.toLowerCase(),
    );
    if (!row) {
      errors.push(`Logo "${logo.name}" has no asset-register row.`);
      continue;
    }
    if (row.company !== logo.name) {
      errors.push(
        `Asset "${row.id}" company "${row.company}" does not match logo "${logo.name}".`,
      );
    }
    if (row.permissionStatus !== logo.permission) {
      errors.push(
        `Asset "${row.id}" permission "${row.permissionStatus}" contradicts logo "${logo.name}" permission "${logo.permission}".`,
      );
    }
    const shouldRemove = logo.status === "remove";
    if (row.removeFromSite !== shouldRemove) {
      errors.push(
        `Asset "${row.id}" removeFromSite=${row.removeFromSite} contradicts logo "${logo.name}" status "${logo.status}".`,
      );
    }
  }

  // --- R-008 explicit-marking requirement: the removed brands must each appear
  //     as a removed record. Awayco/Perion/Synaptico live on in `logos`. ---
  for (const brand of REMOVED_BRANDS) {
    const row = register.find(
      (a) => a.company.trim().toLowerCase() === brand.toLowerCase(),
    );
    if (!row) {
      errors.push(`Removed brand "${brand}" has no asset-register row.`);
    } else if (!row.removeFromSite) {
      errors.push(`Removed brand "${brand}" is not marked remove-from-site.`);
    }
  }

  // The Xylo *case-study* asset must be marked removed (§9.6), while its marquee
  // logo is retained (D-008) — the register must distinguish the two.
  const xyloPanel = assetById("A-xylo-case-study", register);
  if (!xyloPanel || !xyloPanel.removeFromSite) {
    errors.push(
      "The removed Xylo case-study asset (A-xylo-case-study) must be present and marked remove-from-site (§9.6).",
    );
  }
  const xyloLogo = register.find(
    (a) => a.type === "logo" && a.company.toLowerCase() === "xylo",
  );
  if (xyloLogo && xyloLogo.removeFromSite) {
    errors.push(
      "The Xylo marquee logo must be retained, not removed (D-008).",
    );
  }

  // The old people/team imagery must be marked removed (§5, §14).
  const humans = assetById("A-humans-of-helix", register);
  if (!humans || !humans.removeFromSite) {
    errors.push(
      "The removed team imagery (A-humans-of-helix) must be present and marked remove-from-site (§5, §14).",
    );
  }

  // --- Cross-check: every case study with a product image has a matching row
  //     whose permission tracks the study's asset approval. ---
  for (const study of studies) {
    const image = study.image?.trim();
    if (!image) continue;
    const row = register.find(
      (a) => a.filename.toLowerCase() === image.toLowerCase(),
    );
    if (!row) {
      errors.push(
        `Case study "${study.slug}" image "${image}" has no asset-register row.`,
      );
    } else if (row.permissionStatus !== study.assetApproval) {
      errors.push(
        `Asset "${row.id}" permission "${row.permissionStatus}" contradicts case study "${study.slug}" asset approval "${study.assetApproval}".`,
      );
    }
  }

  return errors;
}

/**
 * Assert the asset register is valid and complete, throwing on failure. Intended
 * for build time so a dangling, mismatched, or unsafely-published asset fails the
 * production build.
 */
export function assertAssetRegisterValid(
  register: readonly AssetRecord[] = assetRegister,
  logoList: readonly LogoEntry[] = logos,
  studies: readonly CaseStudy[] = caseStudies,
): void {
  const errors = validateAssetRegister(register, logoList, studies);
  if (errors.length > 0) {
    throw new Error(`Invalid asset register:\n- ${errors.join("\n- ")}`);
  }
}

/** Path, relative to the repository root, of the generated CSV. */
export const ASSET_REGISTER_CSV_PATH = "docs/research/asset-register.csv";

/** The exact R-008 column order for `asset-register.csv`. */
export const ASSET_REGISTER_COLUMNS: readonly string[] = [
  "asset_id",
  "company",
  "type",
  "filename",
  "source",
  "owner",
  "permission_status",
  "usage",
  "alt_text",
  "contains_people",
  "contains_confidential_ui",
  "remove_from_site",
  "notes",
];

/** Escape one CSV field: quote it when it contains a comma, quote, or newline. */
function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** CSV representation of a boolean flag. */
function csvBool(value: boolean): string {
  return value ? "yes" : "no";
}

/**
 * Render the exact CSV text of the asset register with the R-008 columns, derived
 * from the live models. `docs/research/asset-register.csv` is the committed output
 * and `assetRegister.test.ts` asserts it still matches, so the printable register
 * cannot drift from the code. Ends with a trailing newline.
 */
export function renderAssetRegisterCsv(
  register: readonly AssetRecord[] = assetRegister,
): string {
  const rows: string[] = [ASSET_REGISTER_COLUMNS.join(",")];

  for (const asset of register) {
    const cells: Record<string, string> = {
      asset_id: asset.id,
      company: asset.company,
      type: asset.type,
      filename: asset.filename,
      source: asset.source,
      owner: asset.owner,
      permission_status: asset.permissionStatus,
      usage: asset.usage,
      alt_text: asset.altText,
      contains_people: csvBool(asset.containsPeople),
      contains_confidential_ui: csvBool(asset.containsConfidentialUi),
      remove_from_site: csvBool(asset.removeFromSite),
      notes: asset.notes ?? "",
    };
    rows.push(
      ASSET_REGISTER_COLUMNS.map((col) => csvField(cells[col])).join(","),
    );
  }

  return rows.join("\n") + "\n";
}
