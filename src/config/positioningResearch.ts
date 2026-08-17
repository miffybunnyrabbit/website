/**
 * Typed, self-validating positioning-research record (implementation plan §17.5
 * R-004, output `docs/research/positioning-research.md`).
 *
 * R-004 is the strategist/copywriter's document that sharpens Helix's
 * differentiation: it researches how credible firms describe enterprise-value
 * creation, operating leverage, performance-linked fees, venture building, and
 * deep product/technology partnership, records the language pattern each uses and
 * what Helix should avoid, names where Helix has a defensible difference, and
 * writes the strongest objections a qualified prospect may raise together with a
 * copy response to each. The plan is explicit that the purpose is "to sharpen
 * differentiation and avoid category clichés, not to copy competitors".
 *
 * Like `toneOfVoice.ts` (R-003) and `claimsMethodology.ts` (R-005) this module is
 * the checklist expressed as structured data so a build step — not just a human —
 * can hold the line, and it cross-checks the *live* artefacts rather than living
 * as free-form prose that silently drifts:
 *
 *  - every "category cliché to avoid" that a keyword can catch links the real
 *    `forbiddenCopy` rule that enforces it and must still fire on a probe; the
 *    clichés a scan cannot judge (generic venture-studio language, "innovation
 *    partner" when unsupported) are documented as Gate A human-review, exactly as
 *    `forbiddenCopy.ts` and `toneOfVoice.ts` already treat them;
 *  - every "defensible difference" is anchored to a real `whyHelix` manifesto
 *    pillar, and every pillar must be defended by at least one difference, so the
 *    positioning can never drift away from the section the site actually ships;
 *  - every objection targets a real positioning subject, every subject is
 *    stress-tested by at least one objection, and — crucially — every Helix-facing
 *    response (and every difference claim) is scanned clean of forbidden copy, so
 *    the objection-handling copy can never itself ship a banned cliché. The firms'
 *    *language patterns* are deliberately NOT scanned: they quote the clichés
 *    being criticised, which is the whole point of recording them.
 *
 * Following the same convention as the other R-records it renders no UI and
 * enforces no copy itself; `docs/research/positioning-research.md` is generated
 * from this model (`renderPositioningResearchDoc`) and `positioningResearch.test.ts`
 * asserts the committed file still matches, so the printable R-004 record cannot
 * drift from the code.
 */

import { approvalQueue, type QueueItem } from "./approvalQueue";
import {
  FORBIDDEN_PATTERNS,
  scanForbiddenCopy,
  type ForbiddenPattern,
} from "./forbiddenCopy";
import { whyHelixPoints, type WhyHelixPoint, type WhyHelixPointId } from "./whyHelix";

/** Where the generated record lives, for the rendered header. */
export const POSITIONING_RESEARCH_DOC_PATH =
  "docs/research/positioning-research.md";

/**
 * The five positioning subjects §17.5 requires the research to cover — the
 * language categories credible firms use that Helix must sharpen against. The
 * fixed order lets validation fail on a dropped, extra, or reordered subject.
 */
export type PositioningSubjectId =
  | "enterprise-value-creation"
  | "operating-leverage"
  | "performance-linked-fees"
  | "venture-building"
  | "deep-product-partnership";

/** One positioning subject and what the research examined for it. */
export interface PositioningSubject {
  id: PositioningSubjectId;
  /** Human label, e.g. "Enterprise-value creation". */
  label: string;
  /** What credible firms' language around this subject was studied for. */
  note: string;
}

/**
 * A reference firm (§17.5 "five to ten reference firms"). `languagePattern`
 * records how the firm talks; `whatToAvoid` records the trap Helix must not copy.
 * Neither field is scanned for forbidden copy — they quote the clichés being
 * criticised on purpose.
 */
export interface ReferenceFirm {
  /** The firm or archetype, e.g. "Andreessen Horowitz (a16z)". */
  name: string;
  /** The kind of firm, for context, e.g. "platform venture capital". */
  archetype: string;
  /** The language pattern the firm uses. */
  languagePattern: string;
  /** What Helix should avoid borrowing from this pattern. */
  whatToAvoid: string;
}

/**
 * A category cliché to avoid (§17.5 "avoid category clichés"). If `enforcedBy` is
 * set, a `forbiddenCopy` rule of that id keyword-enforces the ban and `probe` is a
 * string that rule must catch. If `enforcedBy` is undefined, no keyword can judge
 * the cliché (it is a framing, not a fixed phrase), so it is Gate A human-review
 * and `probe` is a string that must NOT be caught — documenting the deliberate gap
 * exactly as `toneOfVoice.ts` does.
 */
export interface CategoryCliche {
  /** Stable, kebab-case identifier. */
  id: string;
  /** The cliché, as a prospect would recognise it. */
  cliche: string;
  /** The `forbiddenCopy` rule id that enforces this ban, if any. */
  enforcedBy?: string;
  /**
   * A representative string. For an enforced cliché, `forbiddenCopy` must catch
   * it; for a human-review cliché, `forbiddenCopy` must NOT catch it.
   */
  probe: string;
  /** Why this cliché is human-review only (required when not enforced). */
  humanReviewReason?: string;
}

/**
 * Where Helix has a defensible difference (§17.5). Each is anchored to a real
 * `whyHelix` manifesto pillar so the positioning stays tied to the section the
 * site actually ships. `claim` is Helix-facing copy and is scanned clean.
 */
export interface DefensibleDifference {
  /** Stable, kebab-case identifier. */
  id: string;
  /** The `whyHelix` pillar this difference defends. */
  whyHelixPointId: WhyHelixPointId;
  /** The difference, in one sentence of publishable copy. */
  claim: string;
}

/**
 * A prospect objection (§17.5 "the strongest objections a qualified prospect may
 * have") and the copy response to it. `subjectId` ties it to a positioning
 * subject so every subject can be shown to be stress-tested. `response` is
 * Helix-facing copy and is scanned clean of forbidden copy.
 */
export interface Objection {
  /** Stable, kebab-case identifier. */
  id: string;
  /** The positioning subject this objection attacks. */
  subjectId: PositioningSubjectId;
  /** The objection, in the prospect's sceptical voice. */
  objection: string;
  /** Helix's copy response. Must contain no forbidden copy. */
  response: string;
}

/**
 * The record's review state. Positioning is strategic copy, so its sign-off is
 * the category-A strategic-copy queue item, which the owner approved on
 * 2026-08-17.
 */
export const POSITIONING_RESEARCH_REVIEW = {
  status: "approved" as "pending" | "approved",
  /** The queue item that governs strategic-copy sign-off. */
  governingQueueItem: "Q-0008-strategic-copy",
} as const;

/** The five positioning subjects, in the fixed §17.5 order. */
export const positioningSubjects: readonly PositioningSubject[] = [
  {
    id: "enterprise-value-creation",
    label: "Enterprise-value creation",
    note: "How credible firms describe the value they create, and how they attribute it, so the $500m+ headline reads as evidence rather than a boast.",
  },
  {
    id: "operating-leverage",
    label: "Operating leverage",
    note: "How firms describe turning effort into disproportionate, durable results, without collapsing into abstraction.",
  },
  {
    id: "performance-linked-fees",
    label: "Performance-linked fees",
    note: "How firms describe aligned economics and gain-share without promising outcomes they cannot control.",
  },
  {
    id: "venture-building",
    label: "Venture building",
    note: "How studios describe co-building companies, and the generic venture-studio language Helix must not fall into.",
  },
  {
    id: "deep-product-partnership",
    label: "Deep product and technology partnership",
    note: "How firms describe embedded, hands-on partnership, and how to keep it distinct from staffing.",
  },
];

/** The exact subject ids required, in the exact §17.5 order. */
const REQUIRED_SUBJECT_ORDER: readonly PositioningSubjectId[] = [
  "enterprise-value-creation",
  "operating-leverage",
  "performance-linked-fees",
  "venture-building",
  "deep-product-partnership",
];

/**
 * Five to ten reference firms and the language pattern each uses (§17.5). These
 * are illustrative archetypes for differentiation, not endorsements; the point is
 * the pattern to sharpen against, not the firm.
 */
export const referenceFirms: readonly ReferenceFirm[] = [
  {
    name: "Andreessen Horowitz (a16z)",
    archetype: "platform venture capital",
    languagePattern:
      "Positions the firm as an operating platform with in-house functions that “help founders” across a large portfolio.",
    whatToAvoid:
      "Implying a deep services bench and portfolio scale; Helix is a small, selective firm that takes on a handful of situations at a time.",
  },
  {
    name: "Sequoia Capital",
    archetype: "elite venture capital",
    languagePattern:
      "Mission and legacy framing — helping the daring build enduring, legendary companies.",
    whatToAvoid:
      "Grand legacy language unbacked by named, verifiable outcomes; the tone system demands proof before theatre.",
  },
  {
    name: "McKinsey (incl. Leap and RTS)",
    archetype: "strategy consultancy",
    languagePattern:
      "Category-defining consultancy vocabulary: digital transformation, end-to-end solutions, capability building.",
    whatToAvoid:
      "The exact consultancy clichés the tone system bans; these read as generic and undifferentiated.",
  },
  {
    name: "Bain Capital portfolio operations",
    archetype: "private-equity operating partners",
    languagePattern:
      "Value-creation teams framed around “results, not reports” and hands-on operating support.",
    whatToAvoid:
      "Control-ownership and balance-sheet framing; Helix aligns economics without buying control of the business.",
  },
  {
    name: "Alvarez & Marsal",
    archetype: "operating and performance advisers",
    languagePattern:
      "Action-and-results framing built on operational turnaround and performance improvement.",
    whatToAvoid:
      "Distress and turnaround connotations; Helix partners on upside, not rescue.",
  },
  {
    name: "eFounders / Hexa",
    archetype: "startup studio",
    languagePattern:
      "Co-founding language — the studio builds startups alongside founders and takes founding equity.",
    whatToAvoid:
      "Generic venture-studio self-description; §17.2 and §15.3 warn against sounding like every other studio.",
  },
  {
    name: "Blackstone portfolio operations",
    archetype: "private-equity value-creation team",
    languagePattern:
      "Dedicated operating professionals framed as driving measurable portfolio value creation.",
    whatToAvoid:
      "Implying capital deployment and portfolio scale Helix does not have; the difference is a shared value thesis, not a balance sheet.",
  },
];

/**
 * Category clichés to avoid (§17.5). The keyword-detectable ones link the real
 * `forbiddenCopy` rule that catches them; the two that are framings rather than
 * fixed phrases are Gate A human-review, mirroring `toneOfVoice.ts`.
 */
export const categoryCliches: readonly CategoryCliche[] = [
  {
    id: "digital-transformation",
    cliche: "“digital transformation”",
    enforcedBy: "digital-transformation",
    probe: "digital transformation",
  },
  {
    id: "end-to-end-solutions",
    cliche: "“end-to-end solutions”",
    enforcedBy: "end-to-end-solutions",
    probe: "end-to-end solutions",
  },
  {
    id: "world-class",
    cliche: "“world-class” and other empty superlatives",
    enforcedBy: "world-class",
    probe: "world-class",
  },
  {
    id: "market-domination",
    cliche: "“zero to market domination”",
    enforcedBy: "market-domination",
    probe: "zero to market domination",
  },
  {
    id: "resource-augmentation",
    cliche: "“resource augmentation” / staffing framed as partnership",
    enforcedBy: "resource-augmentation",
    probe: "resource augmentation",
  },
  {
    id: "generic-venture-studio",
    cliche: "generic venture-studio language (“we build startups”, undifferentiated)",
    probe: "we are a venture studio that builds startups",
    humanReviewReason:
      "Venture-studio language has no fixed banned keyword and legitimate copy may describe building, so avoiding the generic register is a Gate A human-review call, not a keyword ban.",
  },
  {
    id: "innovation-partner",
    cliche: "“your innovation partner”, when unsupported by detail",
    probe: "your innovation partner",
    humanReviewReason:
      "The plan bans this only “when unsupported by detail”; a scan cannot judge whether the surrounding copy earns it, so it stays a Gate A human-review call.",
  },
];

/** The exact cliché ids required, in order. */
const REQUIRED_CLICHE_ORDER: readonly string[] = [
  "digital-transformation",
  "end-to-end-solutions",
  "world-class",
  "market-domination",
  "resource-augmentation",
  "generic-venture-studio",
  "innovation-partner",
];

/**
 * Where Helix has a defensible difference (§17.5), each anchored to a `whyHelix`
 * manifesto pillar. Every pillar must be defended by at least one difference.
 */
export const defensibleDifferences: readonly DefensibleDifference[] = [
  {
    id: "own-thesis-not-a-brief",
    whyHelixPointId: "take-a-position",
    claim:
      "Helix forms its own view of the opportunity and what must become true for value to be created, rather than executing a client's brief the way an adviser or agency does.",
  },
  {
    id: "aligned-economics-without-control",
    whyHelixPointId: "share-risk-and-upside",
    claim:
      "Helix is paid as it delivers, with upside tied to the value thesis playing out — aligned economics without taking control of the business the way a private-equity owner does.",
  },
  {
    id: "embedded-not-advisory",
    whyHelixPointId: "operate-from-inside",
    claim:
      "Helix works from inside the team against shared objectives, not as an adviser who hands over a deck and disappears or a staffing arrangement billed by the seat.",
  },
];

/**
 * The strongest objections a qualified prospect may raise, each tied to a
 * positioning subject, with a copy response. Every subject must be stress-tested
 * by at least one objection, and every response must ship clean of forbidden copy.
 */
export const objections: readonly Objection[] = [
  {
    id: "attribution-is-unprovable",
    subjectId: "enterprise-value-creation",
    objection:
      "Every firm claims to “create enterprise value”. How is $500m+ actually attributable to you rather than the market or the founders?",
    response:
      "Fair challenge — that is why every figure on this site resolves to a documented claim with an attribution standard and evidence behind it. We publish how the result was achieved, not just the number, and we are deliberately conservative about what we claim.",
  },
  {
    id: "leverage-is-a-buzzword",
    subjectId: "operating-leverage",
    objection:
      "“Operating leverage” is a buzzword. What actually changes operationally when you engage?",
    response:
      "We build the independent case, align the incentives, join the team to deliver, and then make the result sustainable and hand it back. Each stage is concrete work, not a slide.",
  },
  {
    id: "fees-cherry-pick",
    subjectId: "performance-linked-fees",
    objection:
      "Performance-linked fees just mean you cherry-pick the easy wins and load the fixed fee.",
    response:
      "We take on a small number of situations where there is a credible path to materially higher value, and we are paid as we deliver, with upside tied to that thesis. The incentives are built to point in the same direction as yours.",
  },
  {
    id: "studios-spread-thin",
    subjectId: "venture-building",
    objection:
      "Venture studios spread themselves thin across a portfolio. How do I know I get real attention?",
    response:
      "We are selective by design and operate from inside one team at a time, not across a portfolio. That is the point of taking a position rather than filling a roster.",
  },
  {
    id: "partnership-is-staffing",
    subjectId: "deep-product-partnership",
    objection:
      "“Embedded partnership” is just staffing with a nicer name.",
    response:
      "We take a position and own a shared value thesis with you — not a scope of seats billed by the hour. We work alongside your team against shared objectives, and we win when the business wins.",
  },
];

const DRAFT_MARKERS: readonly string[] = [
  "[verify",
  "[research",
  "todo",
  "tbd",
  "placeholder",
  "lorem ipsum",
];

/** True when `text` contains any draft marker (case-insensitive). */
function hasDraftMarker(text: string): boolean {
  const lower = text.toLowerCase();
  return DRAFT_MARKERS.some((marker) => lower.includes(marker));
}

/**
 * Validate the positioning-research record against §17.5 and cross-check it
 * against the live `forbiddenCopy` enforcement, the `whyHelix` manifesto, and the
 * approval queue. Returns the list of problems; an empty list means the record is
 * complete and consistent. The production build treats any non-empty result as
 * fatal.
 */
export function validatePositioningResearch(
  subjects: readonly PositioningSubject[] = positioningSubjects,
  firms: readonly ReferenceFirm[] = referenceFirms,
  cliches: readonly CategoryCliche[] = categoryCliches,
  differences: readonly DefensibleDifference[] = defensibleDifferences,
  objectionList: readonly Objection[] = objections,
  patterns: readonly ForbiddenPattern[] = FORBIDDEN_PATTERNS,
  pillars: readonly WhyHelixPoint[] = whyHelixPoints,
  queue: readonly QueueItem[] = approvalQueue,
): string[] {
  const errors: string[] = [];

  // --- Subjects: exactly the required set, in the required §17.5 order. ---
  if (subjects.length !== REQUIRED_SUBJECT_ORDER.length) {
    errors.push(
      `Expected exactly ${REQUIRED_SUBJECT_ORDER.length} §17.5 positioning subjects, found ${subjects.length}.`,
    );
  }
  subjects.forEach((s, index) => {
    const expected = REQUIRED_SUBJECT_ORDER[index];
    if (expected && s.id !== expected) {
      errors.push(`Positioning subject ${index + 1} must be "${expected}" but is "${s.id}".`);
    }
    if (!s.label.trim()) errors.push(`Positioning subject "${s.id}" is missing a label.`);
    if (!s.note.trim()) errors.push(`Positioning subject "${s.id}" is missing its note.`);
    if (hasDraftMarker(`${s.label} ${s.note}`)) {
      errors.push(`Positioning subject "${s.id}" contains a forbidden draft marker.`);
    }
  });
  const subjectIds = new Set(subjects.map((s) => s.id));

  // --- Reference firms: five to ten (§17.5), each complete, no duplicates. ---
  if (firms.length < 5 || firms.length > 10) {
    errors.push(
      `§17.5 requires five to ten reference firms, found ${firms.length}.`,
    );
  }
  const seenFirms = new Set<string>();
  for (const firm of firms) {
    const key = firm.name.trim().toLowerCase();
    if (!key) {
      errors.push("A reference firm has an empty name.");
      continue;
    }
    if (seenFirms.has(key)) errors.push(`Duplicate reference firm "${firm.name}".`);
    seenFirms.add(key);
    if (!firm.archetype.trim()) errors.push(`Reference firm "${firm.name}" is missing an archetype.`);
    if (!firm.languagePattern.trim()) {
      errors.push(`Reference firm "${firm.name}" is missing its language pattern.`);
    }
    if (!firm.whatToAvoid.trim()) {
      errors.push(`Reference firm "${firm.name}" is missing its "what to avoid" note.`);
    }
    // Note: firm language patterns quote the clichés being criticised, so they are
    // deliberately NOT scanned for forbidden copy.
    if (hasDraftMarker(`${firm.languagePattern} ${firm.whatToAvoid}`)) {
      errors.push(`Reference firm "${firm.name}" contains a forbidden draft marker.`);
    }
  }

  // --- Category clichés: exactly the required set in order; enforced ones link a
  //     real, firing forbiddenCopy rule; human-review ones stay unscanned. ---
  if (cliches.length !== REQUIRED_CLICHE_ORDER.length) {
    errors.push(
      `Expected exactly ${REQUIRED_CLICHE_ORDER.length} category clichés, found ${cliches.length}.`,
    );
  }
  const patternIds = new Set(patterns.map((p) => p.id));
  cliches.forEach((c, index) => {
    const expected = REQUIRED_CLICHE_ORDER[index];
    if (expected && c.id !== expected) {
      errors.push(`Category cliché ${index + 1} must be "${expected}" but is "${c.id}".`);
    }
    if (!c.cliche.trim()) errors.push(`Category cliché "${c.id}" is missing its text.`);
    if (hasDraftMarker(c.cliche)) {
      errors.push(`Category cliché "${c.id}" contains a forbidden draft marker.`);
    }
    const hits = scanForbiddenCopy(c.probe, patterns);
    if (c.enforcedBy) {
      if (!patternIds.has(c.enforcedBy)) {
        errors.push(
          `Category cliché "${c.id}" claims enforcement by forbiddenCopy rule "${c.enforcedBy}", which does not exist.`,
        );
      } else if (!hits.some((h) => h.id === c.enforcedBy)) {
        errors.push(
          `Category cliché "${c.id}" is not caught by its enforcing rule "${c.enforcedBy}"; the guard and the record have drifted.`,
        );
      }
    } else {
      if (!c.humanReviewReason?.trim()) {
        errors.push(
          `Category cliché "${c.id}" is human-review but gives no reason for not being keyword-enforced.`,
        );
      }
      if (hits.length > 0) {
        errors.push(
          `Category cliché "${c.id}" is documented as human-review but forbiddenCopy rule "${hits[0].id}" catches it; move it to enforced or fix its probe.`,
        );
      }
    }
  });

  // --- Defensible differences: anchored to real pillars; every pillar defended;
  //     claims ship clean of forbidden copy. ---
  const pillarIds = new Set(pillars.map((p) => p.id));
  const defendedPillars = new Set<WhyHelixPointId>();
  const seenDiff = new Set<string>();
  for (const diff of differences) {
    if (!diff.id.trim()) {
      errors.push("A defensible difference has an empty id.");
    } else if (seenDiff.has(diff.id)) {
      errors.push(`Duplicate defensible difference "${diff.id}".`);
    }
    seenDiff.add(diff.id);
    if (!pillarIds.has(diff.whyHelixPointId)) {
      errors.push(
        `Defensible difference "${diff.id}" anchors to whyHelix pillar "${diff.whyHelixPointId}", which does not exist.`,
      );
    } else {
      defendedPillars.add(diff.whyHelixPointId);
    }
    if (!diff.claim.trim()) {
      errors.push(`Defensible difference "${diff.id}" is missing its claim.`);
    }
    if (hasDraftMarker(diff.claim)) {
      errors.push(`Defensible difference "${diff.id}" contains a forbidden draft marker.`);
    }
    const hits = scanForbiddenCopy(diff.claim, patterns);
    if (hits.length > 0) {
      errors.push(
        `Defensible difference "${diff.id}" contains forbidden copy "${hits[0].match}" [${hits[0].id}]; publishable copy must ship clean.`,
      );
    }
  }
  for (const pillar of pillars) {
    if (!defendedPillars.has(pillar.id)) {
      errors.push(
        `whyHelix pillar "${pillar.id}" has no defensible difference; every manifesto pillar must be defended (§17.5).`,
      );
    }
  }

  // --- Objections: target a real subject, every subject stress-tested, responses
  //     ship clean of forbidden copy. ---
  const challengedSubjects = new Set<PositioningSubjectId>();
  const seenObjection = new Set<string>();
  for (const o of objectionList) {
    if (!o.id.trim()) {
      errors.push("An objection has an empty id.");
    } else if (seenObjection.has(o.id)) {
      errors.push(`Duplicate objection "${o.id}".`);
    }
    seenObjection.add(o.id);
    if (!subjectIds.has(o.subjectId)) {
      errors.push(
        `Objection "${o.id}" targets subject "${o.subjectId}", which is not a positioning subject.`,
      );
    } else {
      challengedSubjects.add(o.subjectId);
    }
    if (!o.objection.trim()) errors.push(`Objection "${o.id}" is missing its objection text.`);
    if (!o.response.trim()) errors.push(`Objection "${o.id}" is missing its response.`);
    if (hasDraftMarker(`${o.objection} ${o.response}`)) {
      errors.push(`Objection "${o.id}" contains a forbidden draft marker.`);
    }
    // Only the Helix-facing response must be clean; the objection quotes a sceptic.
    const hits = scanForbiddenCopy(o.response, patterns);
    if (hits.length > 0) {
      errors.push(
        `Objection "${o.id}" response contains forbidden copy "${hits[0].match}" [${hits[0].id}]; the response is publishable copy and must ship clean.`,
      );
    }
  }
  for (const subject of subjects) {
    if (!challengedSubjects.has(subject.id)) {
      errors.push(
        `Positioning subject "${subject.id}" has no objection; every subject must be stress-tested (§17.5).`,
      );
    }
  }

  // --- Review state: the governing strategic-copy queue item must exist. ---
  const queueIds = new Set(queue.map((q) => q.id));
  if (!queueIds.has(POSITIONING_RESEARCH_REVIEW.governingQueueItem)) {
    errors.push(
      `The positioning record references queue item "${POSITIONING_RESEARCH_REVIEW.governingQueueItem}", which is not in the approval queue.`,
    );
  }

  return errors;
}

/**
 * Assert the positioning-research record is valid and complete, throwing on
 * failure. Intended for build time so a dropped subject, a cliché whose enforcing
 * rule was deleted, an unanchored differentiator, an undefended pillar, a response
 * that picked up a banned cliché, or a dangling queue reference fails the build.
 */
export function assertPositioningResearchValid(
  subjects: readonly PositioningSubject[] = positioningSubjects,
  firms: readonly ReferenceFirm[] = referenceFirms,
  cliches: readonly CategoryCliche[] = categoryCliches,
  differences: readonly DefensibleDifference[] = defensibleDifferences,
  objectionList: readonly Objection[] = objections,
  patterns: readonly ForbiddenPattern[] = FORBIDDEN_PATTERNS,
  pillars: readonly WhyHelixPoint[] = whyHelixPoints,
  queue: readonly QueueItem[] = approvalQueue,
): void {
  const errors = validatePositioningResearch(
    subjects,
    firms,
    cliches,
    differences,
    objectionList,
    patterns,
    pillars,
    queue,
  );
  if (errors.length > 0) {
    throw new Error(`Invalid positioning-research record:\n- ${errors.join("\n- ")}`);
  }
}

/** Comment written into the generated doc to discourage hand-edits. */
const DOC_COMMENT =
  "<!-- Generated from src/config/positioningResearch.ts — do not edit by hand. -->";

/**
 * Render the exact markdown text of `docs/research/positioning-research.md` from
 * this model. `positioningResearch.test.ts` asserts the committed file still
 * matches, so the printable R-004 record cannot drift from the code. Ends with a
 * trailing newline.
 */
export function renderPositioningResearchDoc(
  subjects: readonly PositioningSubject[] = positioningSubjects,
  firms: readonly ReferenceFirm[] = referenceFirms,
  cliches: readonly CategoryCliche[] = categoryCliches,
  differences: readonly DefensibleDifference[] = defensibleDifferences,
  objectionList: readonly Objection[] = objections,
  pillars: readonly WhyHelixPoint[] = whyHelixPoints,
): string {
  const pillarTitle = new Map(pillars.map((p) => [p.id, p.title]));
  const lines: string[] = [
    "# Positioning research (R-004)",
    "",
    DOC_COMMENT,
    "",
    "**Plan references:** §17.5 R-004, §10 (differentiation).",
    `**Review status:** ${POSITIONING_RESEARCH_REVIEW.status} — positioning is strategic copy; sign-off is tracked in \`${POSITIONING_RESEARCH_REVIEW.governingQueueItem}\`.`,
    "",
    "The purpose is to sharpen differentiation and avoid category clichés, not to",
    "copy competitors. The clichés below are enforced at build time by",
    "`forbiddenCopy.ts` where a keyword can catch them; the rest are Gate A",
    "human-review calls. Each defensible difference is anchored to a",
    "`whyHelix` manifesto pillar, and each response ships clean of forbidden copy.",
    "",
    "## Subjects researched (§17.5)",
    "",
  ];

  for (const s of subjects) {
    lines.push(`- **${s.label}** — ${s.note}`);
  }
  lines.push("");

  lines.push("## Reference firms and their language patterns", "");
  for (const firm of firms) {
    lines.push(
      `### ${firm.name}`,
      "",
      `- **Archetype:** ${firm.archetype}`,
      `- **Language pattern:** ${firm.languagePattern}`,
      `- **What Helix should avoid:** ${firm.whatToAvoid}`,
      "",
    );
  }

  lines.push("## Category clichés to avoid (§17.5)", "");
  for (const c of cliches) {
    const how = c.enforcedBy
      ? `enforced by \`forbiddenCopy\` rule \`${c.enforcedBy}\``
      : "human-review (Gate A)";
    lines.push(`- **${c.cliche}** — ${how}.`);
    if (c.humanReviewReason) {
      lines.push(`  - ${c.humanReviewReason}`);
    }
  }
  lines.push("");

  lines.push("## Where Helix has a defensible difference", "");
  for (const diff of differences) {
    const title = pillarTitle.get(diff.whyHelixPointId) ?? diff.whyHelixPointId;
    lines.push(`- **${title}** — ${diff.claim}`);
  }
  lines.push("");

  lines.push("## Objections and copy responses", "");
  for (const o of objectionList) {
    lines.push(
      `### ${o.objection}`,
      "",
      o.response,
      "",
    );
  }

  return lines.join("\n") + "\n";
}
