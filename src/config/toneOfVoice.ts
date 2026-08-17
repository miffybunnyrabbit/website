/**
 * Typed, self-validating tone-of-voice system (implementation plan §17.4 R-003,
 * output `docs/research/tone-of-voice.md`).
 *
 * R-003 is the copywriter's document that captures how the site must *sound*:
 * the voice principles that preserve the current site's bold, direct energy
 * while making the copy more commercially rigorous (§15.1), the vocabulary to
 * favour (§15.2) and to retire (§15.3), and the profanity policy (§15.4). The
 * plan asks the copywriter to "write a short checklist that every section must
 * pass"; this module is that checklist, expressed as structured data so a build
 * step — not just a human — can hold the line.
 *
 * The site already ships a *negative* guard: `forbiddenCopy.ts` scans rendered
 * output and fails the build when a retired phrase reaches a visitor. But that
 * guard and the tone record could silently drift — a retired phrase could be
 * documented here while its enforcement pattern is deleted there, or a favoured
 * word could accidentally be caught by an over-broad ban and never ship. This
 * module closes that gap the same way `claimsMethodology.ts` closes the gap
 * between the methodology and the ledger: it links each *enforced* retirement to
 * the real `forbiddenCopy` rule that catches it and cross-checks, at build time,
 * that (a) every enforced retirement's linked rule still exists and still fires
 * on a representative probe, (b) every retirement the plan only bans "when
 * unsupported by detail" or "unless intentional" is documented as human-review
 * (Gate A) and is deliberately NOT keyword-enforced, and (c) no favoured phrase
 * is caught by any ban, so the recommended vocabulary always ships clean.
 *
 * Following the same convention as `claimsMethodology.ts` / `engagementModel.ts`,
 * it is thin, pure content plus validation: it renders no UI and enforces no copy
 * itself (that is `forbiddenCopy.ts`'s job). `docs/research/tone-of-voice.md` is
 * generated from this model (`renderToneOfVoiceDoc`) and `toneOfVoice.test.ts`
 * asserts the committed file still matches, so the printable R-003 record cannot
 * drift from the code.
 */

import { approvalQueue, type QueueItem } from "./approvalQueue";
import {
  FORBIDDEN_PATTERNS,
  scanForbiddenCopy,
  type ForbiddenPattern,
} from "./forbiddenCopy";

/** Where the generated record lives, for the rendered header. */
export const TONE_OF_VOICE_DOC_PATH = "docs/research/tone-of-voice.md";

/**
 * The six §15.1 voice principles, in a fixed order. Validation fails on a
 * missing, extra, or reordered principle so the checklist can never lose a rule.
 */
export type VoicePrincipleId =
  | "bold-not-inflated"
  | "proof-before-theatre"
  | "institutional-we"
  | "selective-confidence"
  | "plain-english"
  | "australian-english";

/**
 * One voice principle and the pass/fail question every section must answer to
 * satisfy it. The `check` question is written so a "no" is a defect.
 */
export interface VoicePrinciple {
  id: VoicePrincipleId;
  /** Human heading, e.g. "Bold, not inflated". */
  title: string;
  /** The principle, phrased as the standard to hold to. */
  principle: string;
  /** The pass/fail question every section must answer "yes". */
  check: string;
}

/**
 * A favoured word or theme (§15.2). Cross-checked to never be caught by a
 * `forbiddenCopy` ban, so the recommended vocabulary always ships clean.
 */
export interface FavouredTerm {
  /** The exact phrase to favour, verbatim from §15.2. */
  phrase: string;
}

/**
 * A retired word or theme (§15.3). If `enforcedBy` is set, a `forbiddenCopy`
 * rule of that id keyword-enforces the retirement and `probe` is a string that
 * rule must catch. If `enforcedBy` is undefined, the plan only bans the phrase
 * "when unsupported by detail" or "unless intentional" — a keyword scan cannot
 * judge intent, so the retirement is human-review (Gate A) and `probe` is a
 * string that must NOT be caught (documenting the deliberate gap).
 */
export interface RetiredTerm {
  /** Stable, kebab-case identifier. */
  id: string;
  /** The theme to retire, in the words of §15.3. */
  theme: string;
  /** The `forbiddenCopy` rule id that enforces this retirement, if any. */
  enforcedBy?: string;
  /**
   * A representative string. For an enforced term, `forbiddenCopy` must catch
   * it; for a human-review term, `forbiddenCopy` must NOT catch it.
   */
  probe: string;
  /** Why this retirement is human-review only (required when not enforced). */
  humanReviewReason?: string;
}

/**
 * The record's review state. The tone system itself is the plan's baseline and
 * needs no sign-off; the one outstanding piece was the §15.4 profanity decision,
 * which the owner recorded on 2026-08-17 with the strategic copy (Q-0008). With
 * that decided, the record is approved.
 */
export const TONE_OF_VOICE_REVIEW = {
  status: "approved" as "pending" | "approved",
} as const;

/**
 * The §15.4 profanity policy, decided by the owner on 2026-08-17 alongside the
 * strategic copy (Q-0008): profanity does not publish. The supplied "get shit
 * done" phrasing is consistent with the existing irreverence, but the owner
 * asked for an equally punchy phrase without the swearing, so
 * `sanctionedAlternative` records the wording that ships in its place. The hard
 * rule stands and always did: profanity never appears in metadata, social
 * previews, or accessibility labels.
 */
export const PROFANITY_POLICY = {
  rule:
    "Profanity does not publish in body copy: the supplied “get shit done” phrasing is declined (owner decision, 2026-08-17, Q-0008). Copy keeps the same directness without it.",
  /**
   * The punchy, profanity-free replacement the owner asked for in place of the
   * declined phrasing. Same blunt cadence, same irreverence, no swearing.
   */
  sanctionedAlternative: "get the hard part done",
  hardRule:
    "Profanity never appears in metadata, social-preview text, or accessibility labels — and under this decision it does not appear in body copy either.",
  /** The queue item that recorded the owner decision. */
  governingQueueItem: "Q-0008-strategic-copy",
} as const;

/** The six voice principles, in the fixed §15.1 order. */
export const voicePrinciples: readonly VoicePrinciple[] = [
  {
    id: "bold-not-inflated",
    title: "Bold, not inflated",
    principle:
      "Make plain, confident declarations (“We create meaningful growth in enterprise value”) rather than inflated abstractions (“We unlock transformative digital synergies for tomorrow’s leaders”).",
    check:
      "Does every headline say something concrete Helix does, with no empty abstraction or synergy language?",
  },
  {
    id: "proof-before-theatre",
    title: "Proof before theatre",
    principle:
      "A large claim is immediately followed by how the result was achieved; the evidence carries the drama, not the adjectives.",
    check:
      "Is every large claim immediately backed by how it was achieved, not left as a bare superlative?",
  },
  {
    id: "institutional-we",
    title: "Institutional “we”",
    principle:
      "“We” means Helix Collective as an enduring business; the copy never requires the reader to know who any individual is.",
    check:
      "Does the copy read as Helix the business, never leaning on named individuals or a people-led framing?",
  },
  {
    id: "selective-confidence",
    title: "Selective confidence",
    principle:
      "The tone makes clear Helix is assessing fit as well as selling; it is selective, not eager for every visitor.",
    check:
      "Does the section make clear Helix is assessing fit, rather than pitching to everyone?",
  },
  {
    id: "plain-english",
    title: "Plain English beneath the headline",
    principle:
      "Headlines can be punchy; the supporting copy under them is specific and easy to understand.",
    check:
      "Is the supporting copy beneath each headline specific and plain, not jargon padding?",
  },
  {
    id: "australian-english",
    title: "Australian English",
    principle:
      "Use Australian spelling and punctuation (organisation, neighbourhood, programme where appropriate, en dashes for ranges), except when reproducing a client’s official wording.",
    check:
      "Is every section in Australian English, with en dashes for ranges, except where a client’s official wording is reproduced?",
  },
];

/** The exact principle ids required, in the exact order (R-003 / §15.1). */
const REQUIRED_PRINCIPLE_ORDER: readonly VoicePrincipleId[] = [
  "bold-not-inflated",
  "proof-before-theatre",
  "institutional-we",
  "selective-confidence",
  "plain-english",
  "australian-english",
];

/** The vocabulary to favour, verbatim from §15.2. */
export const favouredTerms: readonly FavouredTerm[] = [
  { phrase: "enterprise value" },
  { phrase: "value creation" },
  { phrase: "path to victory" },
  { phrase: "deep partnership" },
  { phrase: "aligned economics" },
  { phrase: "independent case" },
  { phrase: "value thesis" },
  { phrase: "gain-share" },
  { phrase: "sustainable handover" },
  { phrase: "operating leverage" },
  { phrase: "scalable delivery" },
  { phrase: "0 → 1 → 10" },
  { phrase: "build" },
  { phrase: "ship" },
  { phrase: "momentum" },
  { phrase: "selective" },
  { phrase: "material outcome" },
  { phrase: "credible path" },
];

/**
 * The themes to retire, in the §15.3 order. Each hard, keyword-detectable ban is
 * linked to the `forbiddenCopy` rule that enforces it; the three the plan only
 * bans in context ("innovation partner … when unsupported by detail", "free
 * consulting … unless … intentional") plus the semantic bans a keyword scan
 * cannot judge are marked human-review, matching `forbiddenCopy.ts`'s own
 * documented exclusions.
 */
export const retiredTerms: readonly RetiredTerm[] = [
  {
    id: "humans-of-helix",
    theme: "humans of Helix",
    enforcedBy: "humans-of-helix",
    probe: "Humans of Helix",
  },
  {
    id: "venture-count",
    theme: "50+ ventures",
    enforcedBy: "venture-count",
    probe: "50+ ventures",
  },
  {
    id: "market-domination",
    theme: "market domination",
    enforcedBy: "market-domination",
    probe: "zero to market domination",
  },
  {
    id: "digital-transformation",
    theme: "digital transformation",
    enforcedBy: "digital-transformation",
    probe: "digital transformation",
  },
  {
    id: "innovation-partner",
    theme: "innovation partner, when unsupported by detail",
    probe: "your innovation partner",
    humanReviewReason:
      "The plan bans this only “when unsupported by detail”; a keyword scan cannot judge whether the surrounding copy earns it, so it stays a Gate A human-review call.",
  },
  {
    id: "end-to-end-solutions",
    theme: "end-to-end solutions",
    enforcedBy: "end-to-end-solutions",
    probe: "end-to-end solutions",
  },
  {
    id: "world-class",
    theme: "world-class",
    enforcedBy: "world-class",
    probe: "world-class",
  },
  {
    id: "best-in-class",
    theme: "best-in-class",
    enforcedBy: "best-in-class",
    probe: "best-in-class",
  },
  {
    id: "resource-augmentation",
    theme: "resource augmentation",
    enforcedBy: "resource-augmentation",
    probe: "resource augmentation",
  },
  {
    id: "free-consulting",
    theme: "free consulting, unless the exact promise is intentional",
    probe: "free consulting",
    humanReviewReason:
      "The plan bans this only “unless the exact promise is intentional”; intent is a Gate A human-review call, not a keyword match.",
  },
  {
    id: "guaranteed-upside",
    theme: "guaranteed upside",
    enforcedBy: "guaranteed-upside",
    probe: "guaranteed upside",
  },
  {
    id: "forced-exit",
    theme: "forced exit",
    enforcedBy: "forced-exit",
    probe: "forced exit",
  },
  {
    id: "greatest-asset",
    theme: "“our people are our greatest asset”",
    enforcedBy: "greatest-asset",
    probe: "our people are our greatest asset",
  },
  {
    id: "founder-worship",
    theme: "founder worship",
    probe: "founder worship",
    humanReviewReason:
      "Founder worship is a framing, not a fixed phrase; the concrete “greatest asset” form is keyword-enforced, but the broader tone is a Gate A human-review call.",
  },
  {
    id: "generic-trend-language",
    theme: "generic AI/Web3 trend language",
    probe: "riding the AI and Web3 wave",
    humanReviewReason:
      "Trend language has no fixed keyword and legitimate copy may name AI in context, so this is a Gate A human-review call rather than a keyword ban.",
  },
  {
    id: "capital-vs-value",
    theme: "claims that confuse capital raised with company value",
    probe: "capital raised is the company’s value",
    humanReviewReason:
      "This is a semantic error the claims methodology governs; no single keyword captures it, so it is caught in finance/legal and Gate A review, not by a scan.",
  },
];

/** The exact retired-term ids required, in the exact §15.3 order. */
const REQUIRED_RETIRED_ORDER: readonly string[] = [
  "humans-of-helix",
  "venture-count",
  "market-domination",
  "digital-transformation",
  "innovation-partner",
  "end-to-end-solutions",
  "world-class",
  "best-in-class",
  "resource-augmentation",
  "free-consulting",
  "guaranteed-upside",
  "forced-exit",
  "greatest-asset",
  "founder-worship",
  "generic-trend-language",
  "capital-vs-value",
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
 * Validate the tone-of-voice record against the §15 rules and cross-check it
 * against the live `forbiddenCopy` enforcement and the approval queue. Returns
 * the list of problems; an empty list means the record is complete and
 * consistent. The production build treats any non-empty result as fatal.
 */
export function validateToneOfVoice(
  principles: readonly VoicePrinciple[] = voicePrinciples,
  favoured: readonly FavouredTerm[] = favouredTerms,
  retired: readonly RetiredTerm[] = retiredTerms,
  patterns: readonly ForbiddenPattern[] = FORBIDDEN_PATTERNS,
  queue: readonly QueueItem[] = approvalQueue,
): string[] {
  const errors: string[] = [];

  // --- Voice principles: exactly the required set, in the required order. ---
  if (principles.length !== REQUIRED_PRINCIPLE_ORDER.length) {
    errors.push(
      `Expected exactly ${REQUIRED_PRINCIPLE_ORDER.length} §15.1 voice principles, found ${principles.length}.`,
    );
  }
  principles.forEach((p, index) => {
    const expected = REQUIRED_PRINCIPLE_ORDER[index];
    if (expected && p.id !== expected) {
      errors.push(`Voice principle ${index + 1} must be "${expected}" but is "${p.id}".`);
    }
    if (!p.title.trim()) errors.push(`Voice principle "${p.id}" is missing a title.`);
    if (!p.principle.trim()) errors.push(`Voice principle "${p.id}" is missing its text.`);
    if (!p.check.trim()) {
      errors.push(`Voice principle "${p.id}" is missing its checklist question.`);
    }
    const haystack = `${p.title} ${p.principle} ${p.check}`;
    if (hasDraftMarker(haystack)) {
      errors.push(`Voice principle "${p.id}" contains a forbidden draft marker.`);
    }
  });

  // --- Favoured vocabulary: non-empty, no duplicates, and — the cross-check —
  //     never caught by a forbiddenCopy ban, so recommended words always ship. ---
  if (favoured.length === 0) errors.push("The favoured-vocabulary list (§15.2) is empty.");
  const seenFavoured = new Set<string>();
  for (const term of favoured) {
    const key = term.phrase.trim().toLowerCase();
    if (!key) {
      errors.push("A favoured term has an empty phrase.");
      continue;
    }
    if (seenFavoured.has(key)) errors.push(`Duplicate favoured term "${term.phrase}".`);
    seenFavoured.add(key);
    const hits = scanForbiddenCopy(term.phrase, patterns);
    if (hits.length > 0) {
      errors.push(
        `Favoured term "${term.phrase}" is caught by forbiddenCopy rule "${hits[0].id}"; a recommended word must never be banned.`,
      );
    }
  }

  // --- Retired themes: exactly the required set in order; enforced ones link to
  //     a real, firing forbiddenCopy rule; human-review ones stay unscanned. ---
  if (retired.length !== REQUIRED_RETIRED_ORDER.length) {
    errors.push(
      `Expected exactly ${REQUIRED_RETIRED_ORDER.length} §15.3 retired themes, found ${retired.length}.`,
    );
  }
  const patternIds = new Set(patterns.map((p) => p.id));
  retired.forEach((term, index) => {
    const expected = REQUIRED_RETIRED_ORDER[index];
    if (expected && term.id !== expected) {
      errors.push(`Retired theme ${index + 1} must be "${expected}" but is "${term.id}".`);
    }
    if (!term.theme.trim()) errors.push(`Retired theme "${term.id}" is missing its text.`);
    if (hasDraftMarker(term.theme)) {
      errors.push(`Retired theme "${term.id}" contains a forbidden draft marker.`);
    }
    const hits = scanForbiddenCopy(term.probe, patterns);
    if (term.enforcedBy) {
      // The linked rule must exist and must actually catch the probe.
      if (!patternIds.has(term.enforcedBy)) {
        errors.push(
          `Retired theme "${term.id}" claims enforcement by forbiddenCopy rule "${term.enforcedBy}", which does not exist.`,
        );
      } else if (!hits.some((h) => h.id === term.enforcedBy)) {
        errors.push(
          `Retired theme "${term.id}" is not caught by its enforcing rule "${term.enforcedBy}"; the guard and the record have drifted.`,
        );
      }
    } else {
      // Human-review only: it must NOT be keyword-enforced, and must document why.
      if (!term.humanReviewReason?.trim()) {
        errors.push(
          `Retired theme "${term.id}" is human-review but gives no reason for not being keyword-enforced.`,
        );
      }
      if (hits.length > 0) {
        errors.push(
          `Retired theme "${term.id}" is documented as human-review but forbiddenCopy rule "${hits[0].id}" catches it; move it to enforced or fix its probe.`,
        );
      }
    }
  });

  // --- Profanity policy: its governing queue item must exist in the queue. ---
  const queueIds = new Set(queue.map((q) => q.id));
  if (!queueIds.has(PROFANITY_POLICY.governingQueueItem)) {
    errors.push(
      `The profanity policy references queue item "${PROFANITY_POLICY.governingQueueItem}", which is not in the approval queue.`,
    );
  }

  return errors;
}

/**
 * Assert the tone-of-voice record is valid and complete, throwing on failure.
 * Intended for build time so a dropped principle, a retirement whose enforcing
 * rule was deleted, a favoured word that became banned, or a dangling queue
 * reference fails the production build.
 */
export function assertToneOfVoiceValid(
  principles: readonly VoicePrinciple[] = voicePrinciples,
  favoured: readonly FavouredTerm[] = favouredTerms,
  retired: readonly RetiredTerm[] = retiredTerms,
  patterns: readonly ForbiddenPattern[] = FORBIDDEN_PATTERNS,
  queue: readonly QueueItem[] = approvalQueue,
): void {
  const errors = validateToneOfVoice(principles, favoured, retired, patterns, queue);
  if (errors.length > 0) {
    throw new Error(`Invalid tone-of-voice record:\n- ${errors.join("\n- ")}`);
  }
}

/** Comment written into the generated doc to discourage hand-edits. */
const DOC_COMMENT =
  "<!-- Generated from src/config/toneOfVoice.ts — do not edit by hand. -->";

/**
 * Render the exact markdown text of `docs/research/tone-of-voice.md` from this
 * model. `toneOfVoice.test.ts` asserts the committed file still matches, so the
 * printable R-003 record cannot drift from the code. Ends with a trailing
 * newline.
 */
export function renderToneOfVoiceDoc(
  principles: readonly VoicePrinciple[] = voicePrinciples,
  favoured: readonly FavouredTerm[] = favouredTerms,
  retired: readonly RetiredTerm[] = retiredTerms,
): string {
  const lines: string[] = [
    "# Tone-of-voice system (R-003)",
    "",
    DOC_COMMENT,
    "",
    "**Plan references:** §15 (tone-of-voice system), §17.4 R-003.",
    `**Review status:** ${TONE_OF_VOICE_REVIEW.status} — the tone system is the plan's working baseline, and its one outstanding sign-off, the §15.4 profanity decision, was recorded by the owner in \`${PROFANITY_POLICY.governingQueueItem}\`.`,
    "",
    "The current site's voice is bold, playful, direct, and slightly",
    "conspiratorial. Preserve that energy, but make the copy more commercially",
    "rigorous. The retirements below are enforced at build time by",
    "`forbiddenCopy.ts` where a keyword can catch them; the rest are Gate A",
    "human-review calls, noted as such.",
    "",
    "## Voice principles — the section checklist",
    "",
    "Every section must answer “yes” to each question.",
    "",
  ];

  principles.forEach((p, index) => {
    lines.push(
      `### ${index + 1}. ${p.title}`,
      "",
      p.principle,
      "",
      `- **Checklist:** ${p.check}`,
      "",
    );
  });

  lines.push("## Vocabulary to favour (§15.2)", "");
  for (const term of favoured) {
    lines.push(`- ${term.phrase}`);
  }
  lines.push("");

  lines.push("## Themes to retire (§15.3)", "");
  for (const term of retired) {
    const how = term.enforcedBy
      ? `enforced by \`forbiddenCopy\` rule \`${term.enforcedBy}\``
      : "human-review (Gate A)";
    lines.push(`- **${term.theme}** — ${how}.`);
    if (term.humanReviewReason) {
      lines.push(`  - ${term.humanReviewReason}`);
    }
  }
  lines.push("");

  lines.push(
    "## Profanity (§15.4)",
    "",
    PROFANITY_POLICY.rule,
    "",
    `Sanctioned equivalent: “${PROFANITY_POLICY.sanctionedAlternative}”.`,
    "",
    PROFANITY_POLICY.hardRule,
    "",
  );

  return lines.join("\n") + "\n";
}
