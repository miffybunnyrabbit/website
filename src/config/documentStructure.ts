/**
 * Assembled-page accessibility gate (implementation plan P7-005, §8.2).
 *
 * Every section component already unit-tests its own landmark and heading in
 * isolation (`Hero.test.ts` asserts a single `<h1>`, the section tests assert a
 * labelled landmark, and so on). But nothing validated the *assembled* document:
 * the invariants that only exist once every component is composed onto the page
 * and that no per-component test can see. Two components could each render a
 * lone `<h1>` and pass their own tests while shipping a page with two of them;
 * an out-of-order heading between two otherwise-correct sections would sail
 * through; a future refactor could drop the shared skip link or the `<main>`
 * landmark from `BaseLayout` and every component test would stay green.
 *
 * §8.2 requires integration tests over the rendered page (metadata, landmarks)
 * and P7-005 targets WCAG 2.2 AA — landmarks, heading order, a skip link, and a
 * document language. This module is the reusable checker behind that gate. It
 * takes the *same HTML a visitor receives* (rendered through Astro's Container
 * API in `renderedAccessibility.test.ts`, including the server-rendered React
 * island) and audits the structural invariants below:
 *
 *   1. exactly one `<h1>` — the page has a single, unambiguous main heading;
 *   2. heading order never skips a level (h1 → h2 → h3, never h1 → h3) so the
 *      outline a screen-reader user navigates is coherent (WCAG 1.3.1, 2.4.10);
 *   3. exactly one `<main>` landmark, carrying the id the skip link targets
 *      (WCAG 1.3.1);
 *   4. a skip link that points at that `<main>` and precedes it in source order,
 *      so it is the first thing a keyboard user reaches (WCAG 2.4.1);
 *   5. a non-empty `<html lang>` so assistive tech announces the page in the
 *      right language (WCAG 3.1.1).
 *
 * These hold on both indexable pages and the `noindex` 404, which is why the
 * gate runs over the whole routed tree. Like `forbiddenCopy.ts`, this module is
 * a pure scanner over a string: `auditDocumentStructure` returns every problem
 * it finds and `assertAccessibleDocument` turns a set of named pages into a
 * single readable failure. No UI, no runtime I/O.
 *
 * Scope note: an unnamed `<section>` is deliberately *not* flagged. Without an
 * accessible name a `<section>` is not exposed as a landmark region at all, so
 * it is a plain grouping, not a broken landmark — the homepage names its
 * content regions as good practice, but the 404's lone section is legitimately
 * anonymous. This gate polices the invariants that are unambiguously required,
 * not stylistic preferences.
 */

/** The id the skip link targets and the `<main>` landmark must carry. */
export const MAIN_LANDMARK_ID = "main";

/** A structural problem found in a rendered document. */
export interface StructureViolation {
  /** Short, stable identifier for the failing rule. */
  rule:
    | "h1-count"
    | "heading-order"
    | "main-count"
    | "main-id"
    | "skip-link"
    | "html-lang";
  /** Human-readable explanation of what is wrong. */
  detail: string;
  /** Plan/WCAG reference for the rule. */
  ref: string;
}

/** One heading in document order. */
export interface Heading {
  level: number;
  text: string;
}

/** Collapse whitespace and strip nested tags from a heading's inner HTML. */
function normaliseText(inner: string): string {
  return inner
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract the `<h1>`–`<h6>` outline in document order. Self-closing or empty
 * headings are included (level only); their text is the empty string.
 */
export function headingOutline(html: string): Heading[] {
  const headings: Heading[] = [];
  const re = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g;
  for (let m = re.exec(html); m !== null; m = re.exec(html)) {
    headings.push({ level: Number(m[1]), text: normaliseText(m[2]) });
  }
  return headings;
}

/** Count non-self-closing occurrences of an opening tag (e.g. `main`, `h1`). */
function countTag(html: string, tag: string): number {
  const re = new RegExp(`<${tag}\\b`, "g");
  return (html.match(re) ?? []).length;
}

/** The opening `<main ...>` tag, or null if there is none. */
function mainOpenTag(html: string): string | null {
  return html.match(/<main\b[^>]*>/)?.[0] ?? null;
}

/**
 * Audit one rendered document for the structural accessibility invariants
 * described in the module header. Returns every violation found; an empty array
 * means the document is structurally sound.
 */
export function auditDocumentStructure(html: string): StructureViolation[] {
  const violations: StructureViolation[] = [];

  // 1. Exactly one <h1>.
  const h1Count = countTag(html, "h1");
  if (h1Count !== 1) {
    violations.push({
      rule: "h1-count",
      detail: `expected exactly one <h1>, found ${h1Count}`,
      ref: "P7-005 (WCAG 1.3.1)",
    });
  }

  // 2. Heading order: start at h1, never deepen by more than one level.
  const outline = headingOutline(html);
  if (outline.length > 0 && outline[0].level !== 1) {
    violations.push({
      rule: "heading-order",
      detail: `first heading is an h${outline[0].level} ("${outline[0].text}"), expected an h1`,
      ref: "P7-005 (WCAG 2.4.10)",
    });
  }
  for (let i = 1; i < outline.length; i++) {
    const prev = outline[i - 1];
    const cur = outline[i];
    if (cur.level - prev.level > 1) {
      violations.push({
        rule: "heading-order",
        detail: `heading level jumps from h${prev.level} ("${prev.text}") to h${cur.level} ("${cur.text}"), skipping h${prev.level + 1}`,
        ref: "P7-005 (WCAG 1.3.1)",
      });
    }
  }

  // 3. Exactly one <main> landmark, 4. carrying the skip-target id.
  const mainCount = countTag(html, "main");
  if (mainCount !== 1) {
    violations.push({
      rule: "main-count",
      detail: `expected exactly one <main> landmark, found ${mainCount}`,
      ref: "P7-005 (WCAG 1.3.1)",
    });
  }
  const main = mainOpenTag(html);
  if (main && !new RegExp(`\\bid=["']${MAIN_LANDMARK_ID}["']`).test(main)) {
    violations.push({
      rule: "main-id",
      detail: `<main> is missing id="${MAIN_LANDMARK_ID}" (the skip-link target)`,
      ref: "P7-005 (WCAG 1.3.1)",
    });
  }

  // 5. A skip link that targets <main> and precedes it in source order.
  const skipHref = `href="#${MAIN_LANDMARK_ID}"`;
  const skipIndex = html.indexOf(skipHref);
  const mainIndex = main ? html.indexOf(main) : -1;
  if (skipIndex === -1) {
    violations.push({
      rule: "skip-link",
      detail: `no skip link pointing at #${MAIN_LANDMARK_ID}`,
      ref: "P7-005 (WCAG 2.4.1)",
    });
  } else if (mainIndex !== -1 && skipIndex > mainIndex) {
    violations.push({
      rule: "skip-link",
      detail: `skip link appears after <main>; it must come first so a keyboard user reaches it before the content`,
      ref: "P7-005 (WCAG 2.4.1)",
    });
  }

  // 6. A non-empty <html lang>.
  const lang = html.match(/<html\b[^>]*\blang=["']([^"']*)["']/)?.[1];
  if (!lang || lang.trim() === "") {
    violations.push({
      rule: "html-lang",
      detail: "<html> is missing a non-empty lang attribute",
      ref: "P7-005 (WCAG 3.1.1)",
    });
  }

  return violations;
}

/** A named rendered page to audit — its route, and the HTML it produces. */
export interface DocumentSource {
  /** Human-readable label, such as a route. */
  label: string;
  html: string;
}

/**
 * Assert that every supplied page satisfies the structural accessibility
 * invariants, throwing a single readable report listing every violation across
 * every page. Intended for the assembled-page build gate so a broken document
 * structure fails the build before it can ship (P7-005, §8.2).
 */
export function assertAccessibleDocument(
  sources: readonly DocumentSource[],
): void {
  const lines: string[] = [];
  for (const source of sources) {
    for (const v of auditDocumentStructure(source.html)) {
      lines.push(`${source.label}: [${v.rule}] ${v.detail} (${v.ref})`);
    }
  }
  if (lines.length > 0) {
    throw new Error(
      `Document structure accessibility violations:\n- ${lines.join("\n- ")}`,
    );
  }
}
