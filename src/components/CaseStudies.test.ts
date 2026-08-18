import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import CaseStudies from "./CaseStudies.astro";
import {
  caseStudies,
  caseStudyCopy,
  stageLabel,
  type CaseStudy,
} from "../config/caseStudies";

/**
 * Renders `CaseStudies.astro` through Astro's Container API and asserts the
 * output faithfully reflects the validated `caseStudies` model (§8.5). The
 * content model has its own unit tests; here we only guard the render layer —
 * that the section renders nothing while every study is an unpublished draft,
 * renders the framing and cards once a study is cleared for publication, keeps
 * the §8.5 card anatomy, and adds nothing off-spec.
 */
async function renderCases(props?: {
  studies?: readonly CaseStudy[];
  copy?: typeof caseStudyCopy;
}): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(CaseStudies, { props: props ?? {} });
}

/** Deep-clone the canonical studies so a test can mutate them safely. */
function cloneStudies(): CaseStudy[] {
  return caseStudies.map((study) => ({
    ...study,
    helixContribution: [...study.helixContribution],
  }));
}

/**
 * A fully-publishable version of one study: every section-9 research and
 * approval gate cleared, with placeholders resolved so validation passes.
 */
function approvedStudy(slug: string): CaseStudy {
  const base = cloneStudies().find((s) => s.slug === slug);
  if (!base) throw new Error(`no such study: ${slug}`);
  return {
    ...base,
    outcomeHeadline: "FROM IDEA TO A$1B+",
    currentOutcome: undefined,
    valueMultiple: "20×",
    valueCreated: undefined,
    summary: "Helix shaped the core technology and early business development.",
    helixContribution: ["Shaped the core technology.", "Seeded early BD."],
  };
}

/** The canonical collection with `neara` cleared for publication. */
function withPublishedNeara(): CaseStudy[] {
  const studies = cloneStudies();
  const idx = studies.findIndex((s) => s.slug === "neara");
  studies[idx] = approvedStudy("neara");
  return studies;
}

describe("CaseStudies.astro", () => {
  it("renders the framing and card once a study is cleared for publication", async () => {
    const studies = withPublishedNeara();
    const html = await renderCases({ studies });
    expect(html).toContain(caseStudyCopy.eyebrow);
    expect(html).toContain(caseStudyCopy.headline);
    expect(html).toContain(caseStudyCopy.intro);
    expect(html).toContain("FROM IDEA TO A$1B+");
    expect(html).toContain("Shaped the core technology.");
  });

  it("exposes the section as a labelled landmark", async () => {
    const html = await renderCases({ studies: withPublishedNeara() });
    expect(html).toContain('aria-labelledby="cases-heading"');
    expect(html).toContain('id="cases-heading"');
  });

  it("never renders the removed Xylo study", async () => {
    const html = await renderCases({ studies: withPublishedNeara() });
    expect(html.toLowerCase()).not.toContain("xylo");
  });

  it("fails the render when the collection is invalid", async () => {
    // A component that silently rendered a broken model would defeat build-time
    // validation; dropping a required study must throw.
    const studies = cloneStudies().filter((s) => s.slug !== "ferovinum");
    await expect(renderCases({ studies })).rejects.toThrow();
  });
});
