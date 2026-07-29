import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CaseStudy } from "./caseStudies";
import type { LogoEntry } from "./logos";
import {
  CASE_STUDY_IMAGE_DIR,
  LOGO_DIR,
  assertPublicImagesPresent,
  assertSitePublicImagesPresent,
  requiredPublicImagePaths,
} from "./publishedAssets";

/** A marquee logo fixture; `retain` + `approved` means it would be rendered. */
function logo(overrides: Partial<LogoEntry> = {}): LogoEntry {
  return {
    name: "Fixture",
    asset: "fixture.svg",
    status: "retain",
    permission: "approved",
    alt: "Fixture",
    ...overrides,
  };
}

/** A published case study fixture; only the fields the gate reads matter here. */
function study(overrides: Partial<CaseStudy> = {}): CaseStudy {
  return {
    name: "Fixture Co",
    slug: "fixture",
    order: 1,
    publish: true,
    logo: "fixture-logo.svg",
    ...overrides,
  } as CaseStudy;
}

describe("requiredPublicImagePaths", () => {
  it("emits a logos/ path for every approved, retained marquee brand", () => {
    const paths = requiredPublicImagePaths(
      [logo({ asset: "neara.svg" }), logo({ asset: "canva.svg" })],
      [],
    );
    expect(paths).toEqual([`${LOGO_DIR}/canva.svg`, `${LOGO_DIR}/neara.svg`]);
  });

  it("withholds logos that are not yet approved or are removed", () => {
    const paths = requiredPublicImagePaths(
      [
        logo({ asset: "pending.svg", permission: "pending" }),
        logo({ asset: "removed.svg", status: "remove" }),
        logo({ asset: "live.svg" }),
      ],
      [],
    );
    expect(paths).toEqual([`${LOGO_DIR}/live.svg`]);
  });

  it("emits the logo and optional image path for every published study", () => {
    const paths = requiredPublicImagePaths(
      [],
      [study({ logo: "neara.svg", image: "neara-outcome.svg" })],
    );
    expect(paths).toEqual([
      `${CASE_STUDY_IMAGE_DIR}/neara-outcome.svg`,
      `${LOGO_DIR}/neara.svg`,
    ]);
  });

  it("omits the image path when a published study carries no image", () => {
    const paths = requiredPublicImagePaths([], [study({ logo: "veyor.svg" })]);
    expect(paths).toEqual([`${LOGO_DIR}/veyor.svg`]);
  });

  it("withholds unpublished studies entirely", () => {
    const paths = requiredPublicImagePaths(
      [],
      [study({ publish: false, logo: "draft.svg", image: "draft.svg" })],
    );
    expect(paths).toEqual([]);
  });

  it("de-duplicates a logo shared by the marquee and a published study", () => {
    const paths = requiredPublicImagePaths(
      [logo({ asset: "neara.svg" })],
      [study({ logo: "neara.svg" })],
    );
    expect(paths).toEqual([`${LOGO_DIR}/neara.svg`]);
  });
});

describe("assertPublicImagesPresent", () => {
  it("passes when every required file exists", () => {
    expect(() =>
      assertPublicImagesPresent(["logos/a.svg", "logos/b.svg"], () => true),
    ).not.toThrow();
  });

  it("passes vacuously when nothing is published", () => {
    expect(() => assertPublicImagesPresent([], () => false)).not.toThrow();
  });

  it("throws and names every missing file", () => {
    const exists = (path: string) => path === "logos/present.svg";
    expect(() =>
      assertPublicImagesPresent(
        ["logos/present.svg", "logos/missing.svg", "case-studies/gone.svg"],
        exists,
      ),
    ).toThrowError(/public\/logos\/missing\.svg[\s\S]*public\/case-studies\/gone\.svg/);
  });

  it("would catch a logo approved without committing its asset (meta-test)", () => {
    // Simulate the §23 failure mode: an approver flips `permission` to
    // "approved" but never adds public/logos/neara.svg.
    const paths = requiredPublicImagePaths([logo({ asset: "neara.svg" })], []);
    const onDisk = new Set<string>(); // nothing committed yet
    expect(() =>
      assertPublicImagesPresent(paths, (path) => onDisk.has(path)),
    ).toThrowError(/public\/logos\/neara\.svg/);
  });
});

describe("the live site", () => {
  const publicRoot = new URL("../../public/", import.meta.url);

  it("publishes only images that exist in public/", () => {
    expect(() => assertSitePublicImagesPresent(publicRoot)).not.toThrow();
  });

  it("requires every Q-0006-approved logo asset (all committed in public/)", () => {
    // Q-0006 approved the full marquee, so the gate now demands all 18 local
    // logo files — exactly the set committed under public/logos/.
    const required = requiredPublicImagePaths();
    expect(required).toHaveLength(18);
    expect(required).toContain("logos/canva.png");
    expect(required.every((p) => p.startsWith("logos/") && p.endsWith(".png"))).toBe(true);
  });

  it("resolves required paths against the real public/ directory", () => {
    // Guard the resolver itself: a known-committed asset is found, a bogus one
    // is not, so a green vacuous gate can't hide a broken path helper.
    const resolve = (path: string) =>
      existsSync(fileURLToPath(new URL(path, publicRoot)));
    expect(resolve("favicon.svg")).toBe(true);
    expect(resolve(`${LOGO_DIR}/does-not-exist.svg`)).toBe(false);
  });
});
