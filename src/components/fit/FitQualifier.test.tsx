import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import FitQualifier from "./FitQualifier";
import {
  FIT_NODES,
  resolve,
  type Answer,
  type ResultNode,
} from "./fitFlow";
import { primaryCta } from "../../config/cta";

/**
 * Renders the qualifier island to static markup for a given answer path. The
 * island's whole state is the answer list, so `initialAnswers` lets us assert
 * what every branch renders without simulating clicks (no DOM is available in
 * this environment). Interaction logic itself is covered by `fitFlow.test.ts`;
 * here we guard the render layer — framing-free markup, accessible controls, and
 * the correct CTA-vs-address treatment per outcome.
 */
function render(initialAnswers: Answer[] = []): string {
  return renderToStaticMarkup(
    <FitQualifier initialAnswers={initialAnswers} />,
  );
}

describe("FitQualifier island", () => {
  it("renders the first question as a fieldset/legend with yes/no buttons", () => {
    const html = render([]);
    const start = FIT_NODES["existing-business"];
    expect(start.type).toBe("question");
    expect(html).toContain("<fieldset");
    expect(html).toContain("<legend");
    if (start.type === "question") {
      expect(html).toContain(start.prompt);
    }
    expect(html).toContain(">Yes</button>");
    expect(html).toContain(">No</button>");
  });

  it("uses an aria-live region so outcome changes are announced", () => {
    expect(render([])).toContain('aria-live="polite"');
  });

  it("disables Back and Start again at the start, and offers them mid-flow", () => {
    const atStart = render([]);
    // Both controls are disabled with no answers yet.
    expect((atStart.match(/disabled/g) ?? []).length).toBeGreaterThanOrEqual(2);

    const midFlow = render(["yes"]);
    expect(midFlow).toContain(">Back</button>");
    expect(midFlow).toContain(">Start again</button>");
    // Controls are enabled once there is at least one answer to undo.
    expect(midFlow).toContain(">Back</button>");
  });

  it("shows a step counter while on a question", () => {
    expect(render([])).toContain("Question 1");
    expect(render(["yes"])).toContain("Question 2");
  });

  const qualifyingPaths: Array<{ answers: Answer[]; id: string }> = [
    { answers: ["yes", "yes"], id: "growth-fit" },
    { answers: ["no", "yes"], id: "idea-fit" },
    { answers: ["no", "no", "yes"], id: "community-fit" },
  ];

  it.each(qualifyingPaths)(
    "renders the primary CTA (no address) for the qualifying outcome $id",
    ({ answers, id }) => {
      const node = resolve(answers) as ResultNode;
      expect(node.id).toBe(id);
      const html = render(answers);
      expect(html).toContain(node.headline);
      expect(html).toContain(node.body);
      expect(html).toContain(primaryCta.label);
      expect(html).toContain(`data-analytics-event="${primaryCta.analyticsEvent}"`);
      expect(html).not.toContain("<address");
    },
  );

  const nonQualifyingPaths: Array<{ answers: Answer[]; id: string }> = [
    { answers: ["yes", "no"], id: "not-current-fit" },
    { answers: ["no", "no", "no"], id: "no-fit" },
  ];

  it.each(nonQualifyingPaths)(
    "renders the Redfern address (no CTA) for the non-qualifying outcome $id",
    ({ answers, id }) => {
      const node = resolve(answers) as ResultNode;
      expect(node.id).toBe(id);
      const html = render(answers);
      expect(html).toContain(node.headline);
      expect(html).toContain("<address");
      expect(html).toContain(node.address!);
      expect(html).not.toContain(primaryCta.label);
    },
  );
});
