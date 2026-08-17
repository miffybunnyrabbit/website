import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ASSET_ID_PATTERN,
  ASSET_REGISTER_COLUMNS,
  ASSET_REGISTER_CSV_PATH,
  LEGACY_REMOVED_ASSETS,
  assetById,
  assetIdFor,
  assetRegister,
  assertAssetRegisterValid,
  buildAssetRegister,
  publishableAssets,
  renderAssetRegisterCsv,
  validateAssetRegister,
  type AssetRecord,
} from "./assetRegister";
import { logos, REMOVED_BRANDS } from "./logos";
import { caseStudies, type CaseStudy } from "./caseStudies";

/** Read the committed generated CSV relative to this module. */
function readCommittedCsv(): string {
  const path = fileURLToPath(
    new URL(`../../${ASSET_REGISTER_CSV_PATH}`, import.meta.url),
  );
  return readFileSync(path, "utf8");
}

/** Deep-clone the register so a test can mutate it safely. */
function cloneRegister(): AssetRecord[] {
  return assetRegister.map((a) => ({ ...a }));
}

describe("assetRegister content", () => {
  it("is valid and complete as shipped", () => {
    expect(() => assertAssetRegisterValid()).not.toThrow();
    expect(validateAssetRegister()).toEqual([]);
  });

  it("gives every asset a well-formed, unique id", () => {
    const ids = assetRegister.map((a) => a.id);
    for (const id of ids) {
      expect(ASSET_ID_PATTERN.test(id)).toBe(true);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("derives ids from the filename without extension", () => {
    expect(assetIdFor("neara.svg")).toBe("A-neara");
    expect(assetIdFor("australia-post.svg")).toBe("A-australia-post");
    expect(assetIdFor("xylo-case-study.png")).toBe("A-xylo-case-study");
  });

  it("has a row for every marquee logo, with matching facts", () => {
    for (const logo of logos) {
      const row = assetRegister.find((a) => a.filename === logo.asset);
      expect(row).toBeDefined();
      expect(row!.company).toBe(logo.name);
      expect(row!.permissionStatus).toBe(logo.permission);
      expect(row!.removeFromSite).toBe(logo.status === "remove");
    }
  });

  it("marks every removed brand for removal", () => {
    for (const brand of REMOVED_BRANDS) {
      const row = assetRegister.find(
        (a) => a.company.toLowerCase() === brand.toLowerCase(),
      );
      expect(row).toBeDefined();
      expect(row!.removeFromSite).toBe(true);
    }
  });

  it("removes the Xylo case-study asset and now the Xylo logo too (D-0008)", () => {
    const panel = assetById("A-xylo-case-study");
    expect(panel).toBeDefined();
    expect(panel!.removeFromSite).toBe(true);

    // D-0008 was decided on 2026-08-17: the logo goes as well, but its rights
    // record stands, so the row survives as an auditable removal.
    const logo = assetRegister.find(
      (a) => a.type === "logo" && a.company.toLowerCase() === "xylo",
    );
    expect(logo).toBeDefined();
    expect(logo!.removeFromSite).toBe(true);
    expect(logo!.permissionStatus).toBe("approved");
  });

  it("records OccuMed as sourced from the client's own site", () => {
    const logo = assetRegister.find(
      (a) => a.type === "logo" && a.company === "OccuMed",
    );
    expect(logo).toBeDefined();
    expect(logo!.source).toBe("occumed.com.au");
    expect(logo!.removeFromSite).toBe(false);
  });

  it("keeps the removed team imagery as an auditable, off-site record", () => {
    const humans = assetById("A-humans-of-helix");
    expect(humans).toBeDefined();
    expect(humans!.removeFromSite).toBe(true);
    expect(humans!.containsPeople).toBe(true);
  });

  it("publishes the Q-0006-approved logos and withholds the still-pending assets", () => {
    // Q-0006 (2026-07-29) cleared every retained logo; the case-study image and
    // the legacy humans photo stay pending/removed and must be withheld.
    const publishable = publishableAssets();
    expect(publishable).toHaveLength(14);
    const filenames = new Set(publishable.map((a) => a.filename));
    expect(filenames.has("canva.png")).toBe(true);
    expect(filenames.has("xylo-case-study.png")).toBe(false);
    expect(filenames.has("humans-of-helix.jpg")).toBe(false);
  });

  it("looks up assets by id and returns undefined for unknown ids", () => {
    expect(assetById("A-neara")?.company).toBe("Neara");
    expect(assetById("A-nope")).toBeUndefined();
  });

  it("appends the authored legacy removed assets last", () => {
    const tail = assetRegister.slice(-LEGACY_REMOVED_ASSETS.length);
    expect(tail.map((a) => a.id)).toEqual(LEGACY_REMOVED_ASSETS.map((a) => a.id));
  });
});

describe("validateAssetRegister", () => {
  it("flags a duplicate filename", () => {
    const register = cloneRegister();
    register.push({ ...register[0], id: "A-dupe" });
    const errors = validateAssetRegister(register);
    expect(errors.some((e) => e.includes("Duplicate asset filename"))).toBe(true);
  });

  it("flags a malformed id", () => {
    const register = cloneRegister();
    register[0] = { ...register[0], id: "canva" };
    const errors = validateAssetRegister(register);
    expect(errors.some((e) => e.includes("not of the form"))).toBe(true);
  });

  it("rejects a hotlinked (URL) asset", () => {
    const register = cloneRegister();
    register[0] = { ...register[0], filename: "https://cdn.example.com/a.svg" };
    const errors = validateAssetRegister(register);
    expect(errors.some((e) => e.includes("not a URL"))).toBe(true);
  });

  it("rejects a visible asset that depicts people", () => {
    const register = cloneRegister();
    register[0] = { ...register[0], containsPeople: true, removeFromSite: false };
    const errors = validateAssetRegister(register);
    expect(errors.some((e) => e.includes("depicts people"))).toBe(true);
  });

  it("rejects a visible asset that shows confidential UI", () => {
    const register = cloneRegister();
    register[0] = {
      ...register[0],
      containsConfidentialUi: true,
      removeFromSite: false,
    };
    const errors = validateAssetRegister(register);
    expect(errors.some((e) => e.includes("confidential UI"))).toBe(true);
  });

  it("flags a logo whose register row contradicts the logos model", () => {
    const register = cloneRegister();
    const idx = register.findIndex((a) => a.filename === "awayco.svg");
    register[idx] = { ...register[idx], removeFromSite: false };
    const errors = validateAssetRegister(register);
    expect(errors.some((e) => e.includes("contradicts logo"))).toBe(true);
  });

  it("flags a missing register row for a logo", () => {
    const register = cloneRegister().filter((a) => a.filename !== "neara.png");
    const errors = validateAssetRegister(register);
    expect(errors.some((e) => e.includes("has no asset-register row"))).toBe(true);
  });

  it("flags a removed brand that is not marked for removal", () => {
    const register = cloneRegister();
    const idx = register.findIndex((a) => a.company === "Perion");
    register[idx] = { ...register[idx], removeFromSite: false };
    const errors = validateAssetRegister(register);
    expect(
      errors.some((e) => e.includes("not marked remove-from-site")),
    ).toBe(true);
  });

  it("flags a missing Xylo case-study removal record", () => {
    const register = cloneRegister().filter(
      (a) => a.id !== "A-xylo-case-study",
    );
    const errors = validateAssetRegister(register);
    expect(errors.some((e) => e.includes("A-xylo-case-study"))).toBe(true);
  });

  it("flags a missing team-imagery removal record", () => {
    const register = cloneRegister().filter(
      (a) => a.id !== "A-humans-of-helix",
    );
    const errors = validateAssetRegister(register);
    expect(errors.some((e) => e.includes("A-humans-of-helix"))).toBe(true);
  });

  it("cross-checks a case-study image against the study's asset approval", () => {
    const studies: CaseStudy[] = caseStudies.map((s) =>
      s.slug === "neara"
        ? { ...s, image: "neara-shot.png", imageAlt: "Neara UI", assetApproval: "approved" }
        : { ...s },
    );
    const register = buildAssetRegister(logos, studies);
    // Derived register agrees with the study, so no contradiction.
    expect(validateAssetRegister(register, logos, studies)).toEqual([]);

    // Flip the row's permission so it disagrees with the study.
    const idx = register.findIndex((a) => a.filename === "neara-shot.png");
    register[idx] = { ...register[idx], permissionStatus: "pending" };
    const errors = validateAssetRegister(register, logos, studies);
    expect(errors.some((e) => e.includes("contradicts case study"))).toBe(true);
  });
});

describe("buildAssetRegister", () => {
  it("includes a row for a case study that has a product image", () => {
    const studies: CaseStudy[] = caseStudies.map((s) =>
      s.slug === "veyor"
        ? { ...s, image: "veyor-shot.png", imageAlt: "Veyor UI" }
        : { ...s },
    );
    const register = buildAssetRegister(logos, studies);
    const row = register.find((a) => a.filename === "veyor-shot.png");
    expect(row).toBeDefined();
    expect(row!.type).toBe("case-study-image");
    expect(row!.company).toBe("Veyor Digital");
  });
});

describe("renderAssetRegisterCsv", () => {
  it("starts with the exact R-008 column header", () => {
    const header = renderAssetRegisterCsv().split("\n")[0];
    expect(header).toBe(ASSET_REGISTER_COLUMNS.join(","));
    expect(ASSET_REGISTER_COLUMNS).toContain("asset_id");
    expect(ASSET_REGISTER_COLUMNS).toContain("permission_status");
    expect(ASSET_REGISTER_COLUMNS).toContain("remove_from_site");
  });

  it("ends with a trailing newline", () => {
    expect(renderAssetRegisterCsv().endsWith("\n")).toBe(true);
  });

  it("renders booleans as yes/no", () => {
    const csv = renderAssetRegisterCsv();
    const awayco = csv
      .split("\n")
      .find((line) => line.startsWith("A-awayco,"));
    expect(awayco).toBeDefined();
    // The note carries no comma, so it needs no quoting; the removal flag is the
    // `yes` immediately before it.
    expect(
      awayco!.endsWith(
        "yes,Removed from the marquee; retained as an auditable record (P4-002).",
      ),
    ).toBe(true);
  });

  it("keeps every quoted field balanced so the CSV stays parseable", () => {
    const csv = renderAssetRegisterCsv();
    for (const line of csv.trim().split("\n")) {
      const quotes = (line.match(/"/g) ?? []).length;
      expect(quotes % 2).toBe(0);
    }
  });

  it("matches the committed docs/research/asset-register.csv (no drift)", () => {
    expect(renderAssetRegisterCsv()).toBe(readCommittedCsv());
  });
});
