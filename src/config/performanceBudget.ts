/**
 * Performance-budget model and assembled-page performance gate (implementation
 * plan P7-006 "Performance budget", and the §18.2/§18.5 hydration strategy the
 * budget depends on).
 *
 * P7-006 sets release budgets, not vanity screenshots: Lighthouse category
 * minimums, the Core Web Vitals ceilings (LCP/CLS/INP), an initial-JavaScript
 * ceiling, "no third-party iframe on initial load", and "no unoptimised hero
 * image". Two kinds of thing live here, mirroring how the rest of the repo
 * treats a plan requirement — record it *and*, wherever the output can be
 * inspected without a browser, gate it:
 *
 *   1. The documented budget itself, as structured, self-validated data. The
 *      Lighthouse scores and Web Vitals can only be measured by a real Lighthouse
 *      run (Phase 8/9 CI), so this module cannot prove them from a string; what it
 *      *can* do is keep the numbers a first-class, auditable artefact that a run
 *      is checked against, and fail the build if the budget itself is incoherent
 *      (a score outside 0–100, a non-positive ceiling, a missing target).
 *
 *   2. The invariants the *rendered* page already determines, which are exactly
 *      the ones that make the measured budget achievable and that can silently
 *      regress in a single edit:
 *
 *        - No third-party embed on initial load — no `<iframe>`, `<embed>`, or
 *          `<object>`. P7-006 bars a third-party iframe on initial load and §5
 *          fixes that the booking action is an external Calendly *link*, never an
 *          embedded iframe. A reintroduced embed is the single biggest threat to
 *          LCP/INP and to the frame-ancestors posture, so it fails the build.
 *
 *        - Hydrate only the fit qualifier (§18.2 "send no JavaScript for static
 *          sections", §18.5 "use a React island only for the qualifier"). The
 *          initial-JS ceiling is kept by shipping exactly one hydrated island —
 *          the qualifier — and nothing else. So the gate asserts at most one
 *          `<astro-island>` per route, that it is the `FitQualifier`, and that it
 *          hydrates with a *deferred* directive (`client:visible`/`idle`/`media`),
 *          never eager `client:load`/`client:only`, which would pull the island's
 *          JavaScript into the critical path and blow the budget it is meant to
 *          protect.
 *
 * Like `documentStructure.ts` and `forbiddenCopy.ts`, the rendered-page half is a
 * pure scanner over the *same HTML a visitor receives* (rendered through Astro's
 * Container API in `renderedPerformance.test.ts`, including the server-rendered
 * React island): `auditRenderedPerformance` returns every problem it finds and
 * `assertRenderedWithinBudget` turns a set of named pages into one readable
 * failure. This module is pure configuration plus validation and string
 * scanning: no UI, no runtime I/O.
 */

/** A Lighthouse category and the minimum score the release budget requires. */
export interface LighthouseThreshold {
  id:
    | "performance-mobile"
    | "performance-desktop"
    | "accessibility"
    | "best-practices"
    | "seo";
  /** Human title, e.g. "Performance (mobile)". */
  label: string;
  /** Minimum acceptable Lighthouse score, 0–100. */
  minScore: number;
  /** Plan reference. */
  ref: string;
}

/** A Core Web Vital and the maximum value the release budget allows. */
export interface WebVitalThreshold {
  id: "lcp" | "cls" | "inp";
  /** Human title, e.g. "Largest Contentful Paint". */
  label: string;
  /** Maximum acceptable value, in {@link unit}. */
  max: number;
  /** Unit the maximum is expressed in. */
  unit: "ms" | "score";
  /** Plan reference. */
  ref: string;
}

/**
 * The P7-006 Lighthouse minimums. Mobile Performance is the hardest target at
 * 90; the other categories share the 95 floor. Order is preserved wherever the
 * budget is rendered or reported.
 */
export const LIGHTHOUSE_THRESHOLDS: readonly LighthouseThreshold[] = [
  {
    id: "performance-mobile",
    label: "Performance (mobile)",
    minScore: 90,
    ref: "P7-006",
  },
  {
    id: "performance-desktop",
    label: "Performance (desktop)",
    minScore: 95,
    ref: "P7-006",
  },
  {
    id: "accessibility",
    label: "Accessibility",
    minScore: 95,
    ref: "P7-006 (see also P7-005)",
  },
  {
    id: "best-practices",
    label: "Best Practices",
    minScore: 95,
    ref: "P7-006",
  },
  { id: "seo", label: "SEO", minScore: 95, ref: "P7-006" },
];

/** The P7-006 Core Web Vitals ceilings, on a representative mobile profile. */
export const WEB_VITAL_THRESHOLDS: readonly WebVitalThreshold[] = [
  {
    id: "lcp",
    label: "Largest Contentful Paint",
    max: 2500,
    unit: "ms",
    ref: "P7-006",
  },
  { id: "cls", label: "Cumulative Layout Shift", max: 0.1, unit: "score", ref: "P7-006" },
  {
    id: "inp",
    label: "Interaction to Next Paint",
    max: 200,
    unit: "ms",
    ref: "P7-006",
  },
];

/** The P7-006 initial-JavaScript ceiling, gzip-compressed. */
export const INITIAL_JS_BUDGET_KB = 120;

/**
 * The Lighthouse categories that must each be present exactly once, so the
 * budget can never quietly drop a target.
 */
const REQUIRED_LIGHTHOUSE_IDS: readonly LighthouseThreshold["id"][] = [
  "performance-mobile",
  "performance-desktop",
  "accessibility",
  "best-practices",
  "seo",
];

/** The Core Web Vitals that must each be present exactly once. */
const REQUIRED_VITAL_IDS: readonly WebVitalThreshold["id"][] = [
  "lcp",
  "cls",
  "inp",
];

/**
 * Validate the documented budget's internal coherence. This does not (and
 * cannot) measure the running site; it guarantees the numbers a Lighthouse run
 * is checked against are themselves well-formed. Returns every problem; an empty
 * list means the budget is coherent.
 */
export function validatePerformanceBudget(
  lighthouse: readonly LighthouseThreshold[] = LIGHTHOUSE_THRESHOLDS,
  vitals: readonly WebVitalThreshold[] = WEB_VITAL_THRESHOLDS,
  initialJsBudgetKb: number = INITIAL_JS_BUDGET_KB,
): string[] {
  const errors: string[] = [];

  // --- Lighthouse thresholds: exactly the required set, scores in 0–100. ---
  const lhIds = lighthouse.map((t) => t.id);
  const lhSet = new Set(lhIds);
  if (lhSet.size !== lhIds.length) {
    errors.push("Lighthouse thresholds list a duplicate category.");
  }
  for (const required of REQUIRED_LIGHTHOUSE_IDS) {
    if (!lhSet.has(required)) {
      errors.push(`Lighthouse budget is missing the "${required}" category.`);
    }
  }
  for (const t of lighthouse) {
    if (!t.label.trim()) {
      errors.push(`Lighthouse threshold "${t.id}" is missing a label.`);
    }
    if (!Number.isInteger(t.minScore) || t.minScore < 0 || t.minScore > 100) {
      errors.push(
        `Lighthouse threshold "${t.id}" minScore ${t.minScore} must be an integer in 0–100.`,
      );
    }
    if (!t.ref.trim()) {
      errors.push(`Lighthouse threshold "${t.id}" is missing a plan reference.`);
    }
  }

  // --- Core Web Vitals: exactly the required set, ceilings positive. ---
  const vIds = vitals.map((v) => v.id);
  const vSet = new Set(vIds);
  if (vSet.size !== vIds.length) {
    errors.push("Web Vitals thresholds list a duplicate metric.");
  }
  for (const required of REQUIRED_VITAL_IDS) {
    if (!vSet.has(required)) {
      errors.push(`Web Vitals budget is missing the "${required}" metric.`);
    }
  }
  for (const v of vitals) {
    if (!v.label.trim()) {
      errors.push(`Web Vital "${v.id}" is missing a label.`);
    }
    if (!(v.max > 0)) {
      errors.push(`Web Vital "${v.id}" max ${v.max} must be greater than zero.`);
    }
    if (v.unit === "score" && v.max > 1) {
      errors.push(
        `Web Vital "${v.id}" is a unitless score but its max ${v.max} exceeds 1.`,
      );
    }
    if (!v.ref.trim()) {
      errors.push(`Web Vital "${v.id}" is missing a plan reference.`);
    }
  }

  // --- Initial-JS ceiling must be a positive number of kilobytes. ---
  if (!(initialJsBudgetKb > 0)) {
    errors.push(
      `Initial-JS budget ${initialJsBudgetKb}KB must be greater than zero.`,
    );
  }

  return errors;
}

/**
 * Assert the documented budget is coherent, throwing on failure. Intended for
 * the build so an incoherent budget (a score outside 0–100, a non-positive
 * ceiling, a dropped target) fails the build rather than silently misdirecting a
 * Lighthouse run.
 */
export function assertPerformanceBudgetValid(
  lighthouse: readonly LighthouseThreshold[] = LIGHTHOUSE_THRESHOLDS,
  vitals: readonly WebVitalThreshold[] = WEB_VITAL_THRESHOLDS,
  initialJsBudgetKb: number = INITIAL_JS_BUDGET_KB,
): void {
  const errors = validatePerformanceBudget(lighthouse, vitals, initialJsBudgetKb);
  if (errors.length > 0) {
    throw new Error(`Invalid performance budget:\n- ${errors.join("\n- ")}`);
  }
}

// --- Rendered-page invariants -------------------------------------------------

/**
 * Embed tags barred from the initial load. P7-006 forbids a third-party iframe
 * on initial load; §5 fixes the booking action as an external Calendly link, not
 * an embedded iframe; `<embed>`/`<object>` are the same hazard by another name.
 */
export const FORBIDDEN_EMBED_TAGS: readonly string[] = [
  "iframe",
  "embed",
  "object",
];

/** The one component allowed to hydrate (§18.5 "a React island only for the qualifier"). */
export const HYDRATED_ISLAND_COMPONENT = "FitQualifier";

/** At most one hydrated island per route — only the fit qualifier ships JS. */
export const MAX_HYDRATED_ISLANDS = 1;

/**
 * Client directives that defer hydration off the critical path. §18.5 uses
 * `client:visible` (or `client:idle` if interaction is delayed); `client:media`
 * is likewise deferred. Eager `client:load`/`client:only` are barred: they pull
 * the island's JavaScript into the initial load and blow the P7-006 JS budget.
 */
export const DEFERRED_HYDRATION_DIRECTIVES: readonly string[] = [
  "visible",
  "idle",
  "media",
];

/** A performance problem found in a rendered document. */
export interface PerformanceViolation {
  /** Short, stable identifier for the failing rule. */
  rule: "third-party-embed" | "island-count" | "island-component" | "eager-hydration";
  /** Human-readable explanation of what is wrong. */
  detail: string;
  /** Plan reference for the rule. */
  ref: string;
}

/** Every opening `<astro-island ...>` tag in the document. */
function islandTags(html: string): string[] {
  return html.match(/<astro-island\b[^>]*>/g) ?? [];
}

/** The value of an attribute on a single opening tag, or null if absent. */
function attr(tag: string, name: string): string | null {
  return tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`))?.[1] ?? null;
}

/**
 * Audit one rendered document for the performance invariants described in the
 * module header. Returns every violation found; an empty array means the
 * document is within the rendered-page budget.
 */
export function auditRenderedPerformance(html: string): PerformanceViolation[] {
  const violations: PerformanceViolation[] = [];

  // 1. No third-party embed on initial load.
  for (const tag of FORBIDDEN_EMBED_TAGS) {
    const count = (html.match(new RegExp(`<${tag}\\b`, "gi")) ?? []).length;
    if (count > 0) {
      violations.push({
        rule: "third-party-embed",
        detail: `found ${count} <${tag}> element(s); no third-party embed may load initially (booking is an external link, not an iframe)`,
        ref: "P7-006, §5",
      });
    }
  }

  // 2–4. Hydration is island-only, deferred, and limited to the fit qualifier.
  const islands = islandTags(html);
  if (islands.length > MAX_HYDRATED_ISLANDS) {
    violations.push({
      rule: "island-count",
      detail: `found ${islands.length} hydrated islands, expected at most ${MAX_HYDRATED_ISLANDS} (only the fit qualifier may ship JavaScript)`,
      ref: "P7-006, §18.2, §18.5",
    });
  }
  for (const tag of islands) {
    const componentUrl = attr(tag, "component-url") ?? "";
    const opts = attr(tag, "opts") ?? "";
    if (
      !componentUrl.includes(HYDRATED_ISLAND_COMPONENT) &&
      !opts.includes(HYDRATED_ISLAND_COMPONENT)
    ) {
      violations.push({
        rule: "island-component",
        detail: `a hydrated island is not the ${HYDRATED_ISLAND_COMPONENT} (component-url "${componentUrl}"); only the fit qualifier may hydrate`,
        ref: "P7-006, §18.5",
      });
    }
    const directive = attr(tag, "client");
    if (directive !== null && !DEFERRED_HYDRATION_DIRECTIVES.includes(directive)) {
      violations.push({
        rule: "eager-hydration",
        detail: `island hydrates with client:${directive}; use a deferred directive (${DEFERRED_HYDRATION_DIRECTIVES.map((d) => `client:${d}`).join(", ")}) so its JavaScript stays off the critical path`,
        ref: "P7-006, §18.5",
      });
    }
  }

  return violations;
}

/** A named rendered page to audit — its route, and the HTML it produces. */
export interface RenderedPage {
  /** Human-readable label, such as a route. */
  label: string;
  html: string;
}

/**
 * Assert that every supplied page stays within the rendered-page performance
 * budget, throwing a single readable report listing every violation across every
 * page. Intended for the assembled-page build gate so a reintroduced embed, a
 * second hydrated island, or an eagerly-hydrated qualifier fails the build before
 * it can ship (P7-006, §18.5).
 */
export function assertRenderedWithinBudget(
  sources: readonly RenderedPage[],
): void {
  const lines: string[] = [];
  for (const source of sources) {
    for (const v of auditRenderedPerformance(source.html)) {
      lines.push(`${source.label}: [${v.rule}] ${v.detail} (${v.ref})`);
    }
  }
  if (lines.length > 0) {
    throw new Error(
      `Performance-budget violations:\n- ${lines.join("\n- ")}`,
    );
  }
}
