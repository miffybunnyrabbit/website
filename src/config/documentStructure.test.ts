import { describe, it, expect } from "vitest";
import {
  MAIN_LANDMARK_ID,
  auditDocumentStructure,
  assertAccessibleDocument,
  headingOutline,
} from "./documentStructure";

/**
 * Unit tests for the assembled-page accessibility checker (P7-005, §8.2). These
 * exercise the scanner against hand-built fixtures — good and broken — so the
 * rules are pinned independently of any real page. `renderedAccessibility.test.ts`
 * then runs the same checker over the actual rendered routes.
 */

/** A minimal document that satisfies every invariant. */
function soundDocument(): string {
  return `<!doctype html>
<html lang="en-AU">
  <head><title>Ok</title></head>
  <body>
    <a class="skip-link" href="#${MAIN_LANDMARK_ID}">Skip to content</a>
    <header>nav</header>
    <main id="${MAIN_LANDMARK_ID}">
      <section aria-labelledby="hero-heading">
        <h1 id="hero-heading">Enterprise value</h1>
      </section>
      <section aria-labelledby="proof-heading">
        <h2 id="proof-heading">Proof</h2>
        <h3>Detail</h3>
      </section>
    </main>
    <footer><h2>Footer</h2></footer>
  </body>
</html>`;
}

describe("headingOutline", () => {
  it("extracts headings in document order with their levels and text", () => {
    const outline = headingOutline(
      "<h1>One <span>x</span></h1><h3>Three</h3><h2>Two</h2>",
    );
    expect(outline).toEqual([
      { level: 1, text: "One x" },
      { level: 3, text: "Three" },
      { level: 2, text: "Two" },
    ]);
  });

  it("ignores non-heading tags and collapses whitespace", () => {
    expect(headingOutline("<p>not a heading</p><h2>  spaced\n  out </h2>")).toEqual(
      [{ level: 2, text: "spaced out" }],
    );
  });
});

describe("auditDocumentStructure", () => {
  it("passes a structurally sound document", () => {
    expect(auditDocumentStructure(soundDocument())).toEqual([]);
  });

  it("flags a page with no <h1>", () => {
    const html = soundDocument().replace(
      '<h1 id="hero-heading">Enterprise value</h1>',
      '<h2 id="hero-heading">Enterprise value</h2>',
    );
    const rules = auditDocumentStructure(html).map((v) => v.rule);
    expect(rules).toContain("h1-count");
  });

  it("flags a page with two <h1> elements", () => {
    const html = soundDocument().replace(
      '<h2 id="proof-heading">Proof</h2>',
      '<h1 id="proof-heading">Proof</h1>',
    );
    const violation = auditDocumentStructure(html).find(
      (v) => v.rule === "h1-count",
    );
    expect(violation?.detail).toContain("found 2");
  });

  it("flags an outline that does not start at h1", () => {
    const html = `<html lang="en"><body>
      <a href="#${MAIN_LANDMARK_ID}">skip</a>
      <main id="${MAIN_LANDMARK_ID}"><h2>Deep first</h2></main>
    </body></html>`;
    const violations = auditDocumentStructure(html);
    // No h1 at all trips both the count and the order rule.
    expect(violations.map((v) => v.rule)).toEqual(
      expect.arrayContaining(["h1-count", "heading-order"]),
    );
  });

  it("flags a skipped heading level (h1 → h3)", () => {
    const html = soundDocument().replace(
      '<h2 id="proof-heading">Proof</h2>',
      '<h3 id="proof-heading">Proof</h3>',
    );
    const violation = auditDocumentStructure(html).find(
      (v) => v.rule === "heading-order",
    );
    expect(violation?.detail).toContain("skipping h2");
  });

  it("allows the outline to climb back up any number of levels", () => {
    // h1 → h2 → h3 → h2 is fine: only *deepening* by more than one is a skip.
    const html = `<html lang="en"><body>
      <a href="#${MAIN_LANDMARK_ID}">skip</a>
      <main id="${MAIN_LANDMARK_ID}">
        <h1>One</h1><h2>Two</h2><h3>Three</h3><h2>Back to two</h2>
      </main>
    </body></html>`;
    expect(
      auditDocumentStructure(html).filter((v) => v.rule === "heading-order"),
    ).toEqual([]);
  });

  it("flags a missing <main> landmark", () => {
    const html = soundDocument()
      .replace(`<main id="${MAIN_LANDMARK_ID}">`, "<div>")
      .replace("</main>", "</div>");
    const rules = auditDocumentStructure(html).map((v) => v.rule);
    expect(rules).toContain("main-count");
  });

  it("flags two <main> landmarks", () => {
    const html = soundDocument().replace(
      "<footer>",
      `<main id="${MAIN_LANDMARK_ID}"><h2>Second main</h2></main><footer>`,
    );
    const violation = auditDocumentStructure(html).find(
      (v) => v.rule === "main-count",
    );
    expect(violation?.detail).toContain("found 2");
  });

  it("flags a <main> that lacks the skip-target id", () => {
    const html = soundDocument().replace(
      `<main id="${MAIN_LANDMARK_ID}">`,
      "<main>",
    );
    const rules = auditDocumentStructure(html).map((v) => v.rule);
    expect(rules).toContain("main-id");
  });

  it("flags a missing skip link", () => {
    const html = soundDocument().replace(
      `<a class="skip-link" href="#${MAIN_LANDMARK_ID}">Skip to content</a>`,
      "",
    );
    const rules = auditDocumentStructure(html).map((v) => v.rule);
    expect(rules).toContain("skip-link");
  });

  it("flags a skip link that appears after <main>", () => {
    // Move the skip link to the end of the body, past <main>.
    const skip = `<a class="skip-link" href="#${MAIN_LANDMARK_ID}">Skip to content</a>`;
    const html = soundDocument()
      .replace(skip, "")
      .replace("</body>", `${skip}</body>`);
    const violation = auditDocumentStructure(html).find(
      (v) => v.rule === "skip-link",
    );
    expect(violation?.detail).toContain("after <main>");
  });

  it("flags a missing or empty html lang", () => {
    expect(
      auditDocumentStructure(soundDocument().replace('lang="en-AU"', "")).map(
        (v) => v.rule,
      ),
    ).toContain("html-lang");
    expect(
      auditDocumentStructure(soundDocument().replace("en-AU", "  ")).map(
        (v) => v.rule,
      ),
    ).toContain("html-lang");
  });
});

describe("assertAccessibleDocument", () => {
  it("does not throw when every page is sound", () => {
    expect(() =>
      assertAccessibleDocument([
        { label: "/", html: soundDocument() },
        { label: "/404", html: soundDocument() },
      ]),
    ).not.toThrow();
  });

  it("throws a report naming the offending page and rule", () => {
    const broken = soundDocument().replace(
      '<h1 id="hero-heading">Enterprise value</h1>',
      "",
    );
    let error: Error | undefined;
    try {
      assertAccessibleDocument([
        { label: "/", html: soundDocument() },
        { label: "/404", html: broken },
      ]);
    } catch (e) {
      error = e as Error;
    }
    expect(error).toBeDefined();
    expect(error?.message).toContain("/404");
    expect(error?.message).toContain("h1-count");
    // The sound page contributes no lines.
    expect(error?.message).not.toContain("/:");
  });
});
