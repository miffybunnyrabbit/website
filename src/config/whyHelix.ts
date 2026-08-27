/**
 * Typed configuration for the "We're different because…" manifesto
 * (implementation plan section 10).
 *
 * This section explains *why* the Helix model is different — a short,
 * high-level, emotionally persuasive statement of philosophy. It is deliberately
 * distinct from the step-by-step "How we work" operating sequence
 * (`howWeWork.ts`, section 11). The plan (section 10, P4-003) is explicit that
 * the two must never be collapsed into one another, share identical copy, or be
 * used as substitutes. The validation below encodes that separation so a
 * well-meaning edit cannot silently merge them.
 *
 * Like the other content models this module is pure content plus validation: it
 * renders as static semantic markup and needs no client-side state. Wording is
 * the plan's working baseline (pending the engagement-model research in
 * `docs/research/engagement-model.md`); the *structure* and required concepts
 * are what these checks guarantee.
 */

import { scanForbiddenCopy } from "./forbiddenCopy";
import { howWeWorkSteps, type HowWeWorkStep } from "./howWeWork";

export type WhyHelixPointId =
  | "take-a-position"
  | "share-risk-and-upside"
  | "operate-from-inside";

export interface WhyHelixPoint {
  id: WhyHelixPointId;
  /** Short heading for the proof point. */
  title: string;
  /** Working body copy shown under the heading. */
  body: string;
  /**
   * Lowercase concept keywords that must appear (case-insensitively) in this
   * point's copy. These encode the "meaning that must survive copy editing"
   * guardrails from section 10 so a rewrite cannot silently drop a required
   * idea.
   */
  requiredConcepts: string[];
}

/** The three proof points, in the fixed order (section 10.1–10.3). */
export const whyHelixPoints: readonly WhyHelixPoint[] = [
  {
    id: "take-a-position",
    title: "We take a position, not a brief.",
    body: "We form our own view of the opportunity, the constraint, and what must become true for material value to be created. We do not simply accept a scope and start billing.",
    // 10.1 must state Helix forms its own view rather than accepting a scope.
    requiredConcepts: ["own view", "scope"],
  },
  {
    id: "share-risk-and-upside",
    title: "We share the risk and the upside.",
    body: "We are paid as we deliver, with additional upside tied to the value thesis playing out. The exact structure varies, but the incentives should point in the same direction.",
    // 10.2 must state shared risk/upside and aligned incentives.
    requiredConcepts: ["upside", "incentives"],
  },
  {
    id: "operate-from-inside",
    title: "We operate from inside the team.",
    body: "We work alongside founders, executives, boards, and delivery teams against shared objectives—not as an adviser who hands over a deck and disappears.",
    // 10.3 must state Helix operates from inside the team, not as an adviser.
    requiredConcepts: ["alongside", "shared objectives"],
  },
];

export interface WhyHelixCopy {
  eyebrow: string;
  headline: string;
  intro: string;
}

/** The eyebrow, headline, and intro for the section (section 10). */
export const whyHelixCopy: WhyHelixCopy = {
  eyebrow: "WE’RE DIFFERENT BECAUSE…",
  headline: "WE PARTNER DEEPLY. OUR UPSIDE IS TIED TO YOURS.",
  intro:
    "We are not a hired pair of hands at the edge of the business. We take on a small number of situations where there is a credible path to materially higher enterprise value—and structure the relationship so we win when the business wins.",
} as const;

/** The exact point ids required, in the exact order (section 10). */
const REQUIRED_POINT_ORDER: readonly WhyHelixPointId[] = [
  "take-a-position",
  "share-risk-and-upside",
  "operate-from-inside",
];

/**
 * Markers that must never reach a production build. Kept lowercase; matching is
 * case-insensitive.
 */
const DRAFT_MARKERS: readonly string[] = [
  "draft",
  "not for publication",
  "todo",
  "tbd",
  "placeholder",
  "lorem ipsum",
];

/** Normalise copy for equality checks: lowercase, collapse whitespace, trim. */
function normalise(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Validate the "We're different because…" configuration against the section 10
 * rules. Returns the list of problems; an empty list means the content is
 * well-formed. The production build should treat any non-empty result as fatal.
 */
export function validateWhyHelix(
  points: readonly WhyHelixPoint[] = whyHelixPoints,
  copy: WhyHelixCopy = whyHelixCopy,
  operatingStages: readonly HowWeWorkStep[] = howWeWorkSteps,
): string[] {
  const errors: string[] = [];

  // Exactly three proof points (section 10 is a three-point manifesto).
  if (points.length !== 3) {
    errors.push(`Expected exactly 3 proof points, found ${points.length}.`);
  }

  // Order of ids is fixed and may not change without a decision.
  points.forEach((point, index) => {
    const expectedId = REQUIRED_POINT_ORDER[index];
    if (expectedId && point.id !== expectedId) {
      errors.push(
        `Proof point ${index + 1} must be "${expectedId}" but is "${point.id}".`,
      );
    }
  });

  // Section framing must be present.
  if (!copy.eyebrow.trim()) errors.push("The section is missing its eyebrow.");
  if (!copy.headline.trim()) errors.push("The section is missing its headline.");
  if (!copy.intro.trim()) errors.push("The section is missing its intro.");

  // The eyebrow must keep the recognisable "different because" framing so the
  // section cannot be quietly repurposed (section 10).
  if (!/different\s+because/i.test(copy.eyebrow)) {
    errors.push(
      'The eyebrow must keep the "different because" framing (section 10).',
    );
  }

  // Each point must carry its heading, body, and required concepts.
  for (const point of points) {
    if (!point.title.trim()) {
      errors.push(`Proof point "${point.id}" is missing a title.`);
    }
    if (!point.body.trim()) {
      errors.push(`Proof point "${point.id}" is missing body copy.`);
    }

    const haystack = `${point.title} ${point.body}`.toLowerCase();
    for (const concept of point.requiredConcepts) {
      if (!haystack.includes(concept.toLowerCase())) {
        errors.push(
          `Proof point "${point.id}" must express the concept "${concept}" but its copy does not.`,
        );
      }
    }

    for (const marker of DRAFT_MARKERS) {
      if (haystack.includes(marker)) {
        errors.push(
          `Proof point "${point.id}" contains a forbidden draft marker "${marker}".`,
        );
      }
    }
  }

  // No forbidden copy anywhere in the section (section 10, §15.3 tone rules).
  const allCopy = [
    copy.eyebrow,
    copy.headline,
    copy.intro,
    ...points.flatMap((p) => [p.title, p.body]),
  ].join("\n");
  for (const v of scanForbiddenCopy(allCopy)) {
    errors.push(
      `The section contains forbidden copy "${v.match}" [${v.id}] — ${v.reason}.`,
    );
  }

  // This manifesto must NOT duplicate the "How we work" operating stages
  // (section 10, P4-003: the two sections must stay distinct). Guard against a
  // point's copy being lifted wholesale from an operating stage.
  const stageBodies = new Set(operatingStages.map((s) => normalise(s.body)));
  const stageTitles = new Set(operatingStages.map((s) => normalise(s.title)));
  for (const point of points) {
    if (stageBodies.has(normalise(point.body))) {
      errors.push(
        `Proof point "${point.id}" reuses a "How we work" stage's body verbatim; the philosophy and operating sections must stay distinct (P4-003).`,
      );
    }
    if (stageTitles.has(normalise(point.title))) {
      errors.push(
        `Proof point "${point.id}" reuses a "How we work" stage's heading verbatim; the philosophy and operating sections must stay distinct (P4-003).`,
      );
    }
  }

  return errors;
}

/**
 * Assert the configuration is valid, throwing on the first failure. Intended
 * for use at build time so a broken configuration fails the production build.
 */
export function assertWhyHelixValid(
  points: readonly WhyHelixPoint[] = whyHelixPoints,
  copy: WhyHelixCopy = whyHelixCopy,
  operatingStages: readonly HowWeWorkStep[] = howWeWorkSteps,
): void {
  const errors = validateWhyHelix(points, copy, operatingStages);
  if (errors.length > 0) {
    throw new Error(
      `Invalid "We're different because…" configuration:\n- ${errors.join("\n- ")}`,
    );
  }
}
