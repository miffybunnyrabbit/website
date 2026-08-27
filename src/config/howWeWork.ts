/**
 * Typed configuration for the "How we work" four-stage operating model
 * (implementation plan sections 11 and 20.5).
 *
 * The four stages live in one place so that order, wording, and the meaning
 * that "must survive copy editing" can be validated in tests rather than
 * trusted to a reviewer's eye. This module is pure content plus validation —
 * it renders as a semantic `<ol>` and requires no client-side state.
 *
 * Wording here is the plan's working baseline (pending the engagement-model
 * research recorded in `docs/research/engagement-model.md`, D-002/D-003). The
 * *structure* and the required concepts are what these checks guarantee.
 */

export type HowWeWorkStepNumber = "01" | "02" | "03" | "04";

export type HowWeWorkStepId =
  | "build-case"
  | "align-incentives"
  | "deliver"
  | "sustain-and-realise";

export interface HowWeWorkStep {
  number: HowWeWorkStepNumber;
  id: HowWeWorkStepId;
  /** Public heading, in the plan's shouty display case. */
  title: string;
  /** Working body copy shown under the heading. */
  body: string;
  /**
   * Lowercase concept keywords that must appear (case-insensitively) in this
   * step's copy. These encode the "meaning that must survive copy editing"
   * guardrails from section 11 so a well-meaning rewrite cannot silently drop
   * a required idea.
   */
  requiredConcepts: string[];
}

/** The four stages, in the fixed operating sequence (section 11.1–11.4). */
export const howWeWorkSteps: readonly HowWeWorkStep[] = [
  {
    number: "01",
    id: "build-case",
    title: "WE BUILD THE CASE—ON OUR OWN DIME.",
    body: "We spend time getting to know the business, its founders, and its executive team. We build our own independent case for where enterprise value can be created—at our own cost and on our own time. We only move forward when we believe we can deliver on the promise.",
    // Stage one must state that Helix invests its own preparation time/cost
    // and forms an independent case (section 20.5 validation).
    requiredConcepts: ["own cost", "own time", "independent"],
  },
  {
    number: "02",
    id: "align-incentives",
    title: "WE DESIGN THE DEAL SO EVERYONE WINS TOGETHER.",
    body: "We agree the objectives, evidence, decision rights, and pricing model before delivery begins. Broadly, we are paid as we deliver and earn back-end upside as the thesis plays out. That requires meaningful alignment with founders and executives—and, where relevant, the board.",
    // Stage two must cover current delivery compensation, back-end upside, and
    // executive/board alignment.
    requiredConcepts: ["paid as we deliver", "back-end upside", "board"],
  },
  {
    number: "03",
    id: "deliver",
    title: "WE JOIN THE TEAM AND CHASE THE OUTCOME.",
    body: "We become part of the operating team and deliver with single-minded focus against the agreed objectives. Product, technology, commercial execution, capital, and operating systems are tools; the objective is the increase in enterprise value they are meant to produce.",
    // Stage three must describe embedded, objective-led delivery.
    requiredConcepts: ["operating team", "agreed objectives"],
  },
  {
    number: "04",
    id: "sustain-and-realise",
    title: "WE MAKE THE VALUE LAST—THEN REALISE THE UPSIDE.",
    body: "We build capability, systems, and ownership that the business can sustain without us. We then work with the founders and leadership on a clean exit from the engagement and the agreed path for realising our back-end gain-share as the value thesis plays out.",
    // Stage four must cover sustainability, handover, and gain-share realisation.
    requiredConcepts: ["sustain", "exit", "gain-share"],
  },
];

/** The section's framing copy: eyebrow, headline, intro, and closing line. */
export interface HowWeWorkCopy {
  /** Small label above the headline. */
  eyebrow: string;
  /** Section headline. */
  headline: string;
  /** Introductory paragraph beneath the headline. */
  intro: string;
  /** Single closing line beneath the four stages (section 11.5). */
  closing: string;
}

/** The eyebrow, headline, intro, and closing line for the section (section 11). */
export const howWeWorkCopy = {
  eyebrow: "HOW WE WORK",
  headline: "OTHERS PROMISE. WE PUT OUR MONEY WHERE OUR MOUTH IS.",
  intro:
    "Before we ask a business to back us, we back our own case. We invest our time, form an independent thesis, align the economics, and then work from inside the team to make the thesis real.",
  // Section 11.5: use one closing line, not both alternatives at equal weight.
  closing:
    "THE EXACT MECHANICS CHANGE. THE PRINCIPLE DOESN’T: WE PUT REAL TIME, UPSIDE, AND REPUTATION BEHIND THE CASE.",
} as const;

/** The exact ids required, in the exact order (section 20.5). */
const REQUIRED_STEP_ORDER: readonly HowWeWorkStepId[] = [
  "build-case",
  "align-incentives",
  "deliver",
  "sustain-and-realise",
];

const REQUIRED_STEP_NUMBERS: readonly HowWeWorkStepNumber[] = [
  "01",
  "02",
  "03",
  "04",
];

/**
 * Markers that must never reach a production build (section 20.5). Kept
 * lowercase; matching is case-insensitive.
 */
const DRAFT_MARKERS: readonly string[] = [
  "draft",
  "not for publication",
  "todo",
  "tbd",
  "placeholder",
  "lorem ipsum",
];

/**
 * Distinctive fragments of the commitment the section must communicate:
 *
 * > OTHERS PROMISE. WE PUT OUR MONEY WHERE OUR MOUTH IS.
 *
 * Section 24 requires that "the 'How we work' headline *or* its closing line
 * communicates" this message, so the check looks across both carriers rather
 * than pinning one exact string — a rewrite that moves the line from the
 * headline to the closing (or vice versa) still passes, but dropping it from
 * both fails the build. Matched case-insensitively.
 */
export const REQUIRED_COMMITMENT_FRAGMENTS: readonly string[] = [
  "others promise",
  "money where our mouth",
];

/**
 * Validate the how-we-work configuration against the section 20.5 rules.
 * Returns the list of problems; an empty list means the content is well-formed.
 * The production build should treat any non-empty result as fatal.
 */
export function validateHowWeWork(
  steps: readonly HowWeWorkStep[] = howWeWorkSteps,
): string[] {
  const errors: string[] = [];

  // Exactly four steps.
  if (steps.length !== 4) {
    errors.push(`Expected exactly 4 stages, found ${steps.length}.`);
  }

  // Order of ids and numbers is fixed and may not change without a decision.
  steps.forEach((step, index) => {
    const expectedId = REQUIRED_STEP_ORDER[index];
    if (expectedId && step.id !== expectedId) {
      errors.push(
        `Stage ${index + 1} must be "${expectedId}" but is "${step.id}".`,
      );
    }
    const expectedNumber = REQUIRED_STEP_NUMBERS[index];
    if (expectedNumber && step.number !== expectedNumber) {
      errors.push(
        `Stage ${index + 1} ("${step.id}") must be numbered "${expectedNumber}" but is "${step.number}".`,
      );
    }
  });

  // Each step must carry its required concepts, its heading, and body copy.
  for (const step of steps) {
    if (!step.title.trim()) {
      errors.push(`Stage "${step.id}" is missing a title.`);
    }
    if (!step.body.trim()) {
      errors.push(`Stage "${step.id}" is missing body copy.`);
    }

    const haystack = `${step.title} ${step.body}`.toLowerCase();
    for (const concept of step.requiredConcepts) {
      if (!haystack.includes(concept.toLowerCase())) {
        errors.push(
          `Stage "${step.id}" must express the concept "${concept}" but its copy does not.`,
        );
      }
    }

    // No draft markers or obvious placeholders in the copy.
    for (const marker of DRAFT_MARKERS) {
      if (haystack.includes(marker)) {
        errors.push(
          `Stage "${step.id}" contains a forbidden draft marker "${marker}".`,
        );
      }
    }
  }

  return errors;
}

/**
 * Assert the configuration is valid, throwing on the first failure. Intended
 * for use at build time so a broken configuration fails the production build.
 */
export function assertHowWeWorkValid(
  steps: readonly HowWeWorkStep[] = howWeWorkSteps,
): void {
  const errors = validateHowWeWork(steps);
  if (errors.length > 0) {
    throw new Error(
      `Invalid "How we work" configuration:\n- ${errors.join("\n- ")}`,
    );
  }
}

/**
 * Validate the section's framing copy (eyebrow, headline, intro, closing line)
 * against the section 11 / 11.5 rules and the section 24 acceptance criterion.
 * The four stages carry their own concept and draft-marker guards; this copy is
 * rendered straight into the page but had no gate of its own, so a blanked line,
 * a stray draft marker, or a rewrite that drops the required commitment could
 * ship unnoticed. Returns the list of problems; an empty list means the copy is
 * well-formed. The production build should treat any non-empty result as fatal.
 */
export function validateHowWeWorkCopy(
  copy: HowWeWorkCopy = howWeWorkCopy,
): string[] {
  const errors: string[] = [];

  const fields: readonly [keyof HowWeWorkCopy, string][] = [
    ["eyebrow", copy.eyebrow],
    ["headline", copy.headline],
    ["intro", copy.intro],
    ["closing", copy.closing],
  ];

  for (const [name, value] of fields) {
    if (!value.trim()) {
      errors.push(`How-we-work ${name} copy is missing.`);
    }
    const lower = value.toLowerCase();
    for (const marker of DRAFT_MARKERS) {
      if (lower.includes(marker)) {
        errors.push(
          `How-we-work ${name} copy contains a forbidden draft marker "${marker}".`,
        );
      }
    }
  }

  // Section 11.5: show one closing statement, not the headline repeated at equal
  // weight as a second sign-off.
  if (copy.closing.trim() && copy.closing.trim() === copy.headline.trim()) {
    errors.push(
      "How-we-work closing line must not repeat the headline at equal weight (section 11.5).",
    );
  }

  // Section 24: the required commitment must live in the headline or the closing
  // line. Either may carry it, so both are scanned together.
  const carrier = `${copy.headline} ${copy.closing}`.toLowerCase();
  for (const fragment of REQUIRED_COMMITMENT_FRAGMENTS) {
    if (!carrier.includes(fragment)) {
      errors.push(
        `How-we-work headline or closing line must communicate "${fragment}" (section 24) but neither does.`,
      );
    }
  }

  return errors;
}

/**
 * Assert the section's framing copy is valid, throwing on the first failure.
 * Intended for use at build time so broken copy fails the production build,
 * mirroring `assertHowWeWorkValid` for the stages.
 */
export function assertHowWeWorkCopyValid(
  copy: HowWeWorkCopy = howWeWorkCopy,
): void {
  const errors = validateHowWeWorkCopy(copy);
  if (errors.length > 0) {
    throw new Error(`Invalid "How we work" copy:\n- ${errors.join("\n- ")}`);
  }
}
