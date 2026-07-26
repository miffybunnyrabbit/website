import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import HowWeWork from "./HowWeWork.astro";
import {
  howWeWorkSteps,
  howWeWorkCopy,
  type HowWeWorkStep,
} from "../config/howWeWork";

/**
 * Renders `HowWeWork.astro` through Astro's Container API and asserts the output
 * faithfully reflects the validated `howWeWork` model and honours the §11.6
 * treatment. The content model has its own unit tests; here we only guard the
 * render layer — that it renders the framing, all four stages with visible
 * `01`–`04` numbers as a real ordered list, exposes the section as a labelled
 * landmark, keeps connectors decorative and hidden from assistive tech, shows a
 * single closing line, and adds no off-spec copy.
 */
async function renderHow(props?: {
  steps?: readonly HowWeWorkStep[];
  copy?: typeof howWeWorkCopy;
}): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(HowWeWork, { props: props ?? {} });
}

describe("HowWeWork.astro", () => {
  it("renders the section framing from the model", async () => {
    const html = await renderHow();
    expect(html).toContain(howWeWorkCopy.eyebrow);
    expect(html).toContain(howWeWorkCopy.headline);
    expect(html).toContain(howWeWorkCopy.intro);
  });

  it("renders all four stages with their titles, bodies, and numbers", async () => {
    const html = await renderHow();
    for (const step of howWeWorkSteps) {
      expect(html).toContain(step.title);
      expect(html).toContain(step.body);
      expect(html).toContain(step.number);
    }
  });

  it("renders exactly the four model stages — no more", async () => {
    const html = await renderHow();
    const titleCount = (html.match(/how__step-title/g) ?? []).length;
    expect(titleCount).toBe(howWeWorkSteps.length);
    expect(titleCount).toBe(4);
  });

  it("uses a real ordered list so the progression is semantic (§11.6)", async () => {
    const html = await renderHow();
    expect(html).toContain("<ol");
    expect(html).toContain("</ol>");
  });

  it("exposes the section as a labelled landmark", async () => {
    const html = await renderHow();
    expect(html).toContain('aria-labelledby="how-heading"');
    expect(html).toContain('id="how-heading"');
  });

  it("keeps connector lines decorative and hidden from assistive tech (§11.6)", async () => {
    const html = await renderHow();
    expect(html).toContain("how__connector");
    expect(html).toContain('aria-hidden="true"');
  });

  it("shows the chosen closing line exactly once, not both alternatives (§11.5)", async () => {
    const html = await renderHow();
    expect(html).toContain(howWeWorkCopy.closing);
    // The section headline reuses the "simplest version" wording, so §11.5's
    // "don't repeat both at equal weight" is enforced by checking the chosen
    // closing line is rendered once — not duplicated as a second sign-off.
    const closingCount = html.split(howWeWorkCopy.closing).length - 1;
    expect(closingCount).toBe(1);
  });

  it("fails the render when the operating model is invalid", async () => {
    // A component that silently rendered a broken model would defeat build-time
    // validation; fewer than four stages must throw.
    await expect(
      renderHow({ steps: howWeWorkSteps.slice(0, 2) }),
    ).rejects.toThrow();
  });
});
