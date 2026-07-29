/**
 * Build-time integrity gate for the image files the site actually publishes
 * (implementation plan P7-007 "route images through the pipeline, set
 * dimensions" and the §23 approval-queue lifecycle).
 *
 * Two components emit `<img>` elements whose `src` is derived from a content
 * model rather than hard-coded:
 *
 *  - `LogoMarquee.astro` renders `/logos/<asset>` for every `marqueeLogos()`
 *    entry (a brand that is `status: "retain"` and `permission: "approved"`);
 *  - `CaseStudies.astro` renders `/logos/<logo>` and, when present,
 *    `/case-studies/<image>` for every `publishedCaseStudies()` entry.
 *
 * Today both lists are empty — every logo stays `permission: "pending"` and
 * every study stays `publish: false` — so no image is emitted and no file is
 * needed. But the §23 lifecycle is explicit that approval flips those flags and
 * redeploys: "When an item is approved, the content model is marked approved and
 * the site is redeployed with the approved wording." Nothing today guarantees
 * the *asset file* was committed alongside that flag. An approver (or a script)
 * marking a logo `approved` without adding `public/logos/<asset>` ships a broken
 * `<img>` to production, and every existing test stays green because they all
 * assert against the pre-approval (empty) state.
 *
 * This module closes that hole the same way the register, header, and static-
 * output guards close theirs: it derives the exact set of public paths the live
 * models would emit and asserts each resolves to a committed file. The check is
 * deliberately *not* folded into the pure `assertLogosValid` / `assetsValid`
 * validators — those run in unit tests against invented fixtures whose files
 * legitimately do not exist — so it lives here as a separate, filesystem-aware
 * gate exercised by `publishedAssets.test.ts` (part of `npm run verify`).
 */

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { caseStudies, publishedCaseStudies, type CaseStudy } from "./caseStudies";
import { logos, marqueeLogos, type LogoEntry } from "./logos";

/** Public-root subdirectory the marquee and case-study logos are served from. */
export const LOGO_DIR = "logos";
/** Public-root subdirectory the optional case-study imagery is served from. */
export const CASE_STUDY_IMAGE_DIR = "case-studies";

/** Location of the committed `public/` directory relative to this module. */
const PUBLIC_ROOT = new URL("../../public/", import.meta.url);

/**
 * Every image path the current build would emit, as `public/`-root-relative
 * strings with no leading slash (e.g. `logos/neara.svg`), sorted and de-duped.
 * Derived from the same model functions the components call, so it can never
 * drift from what actually reaches the markup.
 */
export function requiredPublicImagePaths(
  logoEntries: readonly LogoEntry[] = logos,
  studies: readonly CaseStudy[] = caseStudies,
): string[] {
  const paths = new Set<string>();

  for (const logo of marqueeLogos(logoEntries)) {
    paths.add(`${LOGO_DIR}/${logo.asset}`);
  }

  for (const study of publishedCaseStudies(studies)) {
    paths.add(`${LOGO_DIR}/${study.logo}`);
    if (study.image) {
      paths.add(`${CASE_STUDY_IMAGE_DIR}/${study.image}`);
    }
  }

  return [...paths].sort();
}

/**
 * Throw if any of `paths` is absent according to `exists`. Pure and injectable
 * so the rule can be unit-tested without touching the filesystem.
 */
export function assertPublicImagesPresent(
  paths: readonly string[],
  exists: (path: string) => boolean,
): void {
  const missing = paths.filter((path) => !exists(path));
  if (missing.length > 0) {
    throw new Error(
      `The site would publish ${missing.length} image(s) with no committed file in public/:\n` +
        missing.map((path) => `- public/${path}`).join("\n") +
        `\nCommit the optimised asset before approving or publishing it (P7-007, §23).`,
    );
  }
}

/**
 * Real-models gate: assert every image the current build emits resolves to a
 * committed file under `public/`. Passes vacuously while every logo is pending
 * and every study unpublished, and starts biting the moment an approval flips a
 * flag without its asset file.
 */
export function assertSitePublicImagesPresent(publicRoot: URL = PUBLIC_ROOT): void {
  assertPublicImagesPresent(requiredPublicImagePaths(), (path) =>
    existsSync(fileURLToPath(new URL(path, publicRoot))),
  );
}
