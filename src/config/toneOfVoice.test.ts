import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  PROFANITY_POLICY,
  TONE_OF_VOICE_DOC_PATH,
  TONE_OF_VOICE_REVIEW,
  assertToneOfVoiceValid,
  favouredTerms,
  renderToneOfVoiceDoc,
  retiredTerms,
  validateToneOfVoice,
  voicePrinciples,
  type RetiredTerm,
  type VoicePrinciple,
} from "./toneOfVoice";
import { approvalQueue } from "./approvalQueue";
import { FORBIDDEN_PATTERNS, scanForbiddenCopy } from "./forbiddenCopy";

/** Deep-clone the principles so a test can mutate them safely. */
function clonePrinciples(): VoicePrinciple[] {
  return voicePrinciples.map((p) => ({ ...p }));
}

/** Deep-clone the retired themes so a test can mutate them safely. */
function cloneRetired(): RetiredTerm[] {
  return retiredTerms.map((t) => ({ ...t }));
}

/** Read the committed generated record relative to this module. */
function readCommittedDoc(): string {
  const path = fileURLToPath(
    new URL(`../../${TONE_OF_VOICE_DOC_PATH}`, import.meta.url),
  );
  return readFileSync(path, "utf8");
}

describe("tone-of-voice record (R-003)", () => {
  it("the live record is valid and complete", () => {
    expect(validateToneOfVoice()).toEqual([]);
    expect(() => assertToneOfVoiceValid()).not.toThrow();
  });

  it("documents all six §15.1 voice principles with a checklist question", () => {
    expect(voicePrinciples).toHaveLength(6);
    for (const p of voicePrinciples) {
      expect(p.title.trim(), p.id).toBeTruthy();
      expect(p.principle.trim(), p.id).toBeTruthy();
      expect(p.check.trim(), p.id).toBeTruthy();
      // Checklist questions should read as pass/fail.
      expect(p.check.trim().endsWith("?"), p.id).toBe(true);
    }
  });

  it("is signed off, its governing queue item having cleared", () => {
    expect(TONE_OF_VOICE_REVIEW.status).toBe("approved");
    const governing = approvalQueue.find(
      (q) => q.id === PROFANITY_POLICY.governingQueueItem,
    );
    expect(governing?.status).toBe("approved");
  });

  it("declines profanity and offers a profanity-free equivalent", () => {
    // The owner declined the supplied phrasing but asked for something equally
    // punchy, so the record must carry a replacement rather than a bare "no".
    expect(PROFANITY_POLICY.sanctionedAlternative.trim()).not.toBe("");
    expect(PROFANITY_POLICY.sanctionedAlternative).not.toMatch(/shit|fuck/i);
    expect(PROFANITY_POLICY.rule.toLowerCase()).toContain("declined");
  });

  it("tracks the profanity decision against a real queue item", () => {
    const queueIds = new Set(approvalQueue.map((q) => q.id));
    expect(queueIds.has(PROFANITY_POLICY.governingQueueItem)).toBe(true);
    // The hard rule keeps profanity out of metadata regardless of that decision.
    expect(PROFANITY_POLICY.hardRule.toLowerCase()).toContain("metadata");
  });
});

describe("favoured / retired cross-check against forbiddenCopy", () => {
  it("every favoured term ships clean (no ban catches it)", () => {
    for (const term of favouredTerms) {
      expect(scanForbiddenCopy(term.phrase), term.phrase).toEqual([]);
    }
  });

  it("every enforced retirement is caught by its named, existing rule", () => {
    const patternIds = new Set(FORBIDDEN_PATTERNS.map((p) => p.id));
    for (const term of retiredTerms.filter((t) => t.enforcedBy)) {
      expect(patternIds.has(term.enforcedBy as string), term.id).toBe(true);
      const hits = scanForbiddenCopy(term.probe);
      expect(hits.some((h) => h.id === term.enforcedBy), term.id).toBe(true);
    }
  });

  it("every human-review retirement is deliberately not keyword-enforced", () => {
    for (const term of retiredTerms.filter((t) => !t.enforcedBy)) {
      expect(term.humanReviewReason?.trim(), term.id).toBeTruthy();
      expect(scanForbiddenCopy(term.probe), term.id).toEqual([]);
    }
  });

  it("covers the three context-dependent §15.3 bans as human-review", () => {
    const humanReview = new Set(
      retiredTerms.filter((t) => !t.enforcedBy).map((t) => t.id),
    );
    expect(humanReview.has("innovation-partner")).toBe(true);
    expect(humanReview.has("free-consulting")).toBe(true);
    expect(humanReview.has("capital-vs-value")).toBe(true);
  });
});

describe("tone-of-voice validation guards", () => {
  it("fails when a voice principle is missing (completeness)", () => {
    const short = clonePrinciples().slice(0, -1);
    expect(validateToneOfVoice(short).join("\n")).toMatch(
      /Expected exactly 6 §15.1 voice principles/,
    );
  });

  it("fails when the principles are reordered", () => {
    const swapped = clonePrinciples();
    [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
    const errors = validateToneOfVoice(swapped);
    expect(errors.some((e) => e.includes("must be"))).toBe(true);
  });

  it("fails when an enforced retirement's rule is removed", () => {
    // Drop the world-class rule; its retirement can no longer be caught.
    const withoutWorldClass = FORBIDDEN_PATTERNS.filter(
      (p) => p.id !== "world-class",
    );
    const errors = validateToneOfVoice(
      voicePrinciples,
      favouredTerms,
      retiredTerms,
      withoutWorldClass,
    );
    expect(errors.join("\n")).toMatch(/world-class/);
  });

  it("fails when a favoured term becomes banned", () => {
    const banned = [
      ...FORBIDDEN_PATTERNS,
      {
        id: "ban-momentum",
        pattern: /\bmomentum\b/i,
        reason: "test",
        planRef: "test",
      },
    ];
    const errors = validateToneOfVoice(
      voicePrinciples,
      favouredTerms,
      retiredTerms,
      banned,
    );
    expect(errors.join("\n")).toMatch(/recommended word must never be banned/);
  });

  it("fails when a human-review theme claims a probe that is actually caught", () => {
    const defs = cloneRetired();
    const i = defs.findIndex((t) => t.id === "free-consulting");
    // Point its probe at a phrase forbiddenCopy really catches.
    defs[i] = { ...defs[i], probe: "world-class" };
    const errors = validateToneOfVoice(
      voicePrinciples,
      favouredTerms,
      defs,
    );
    expect(errors.join("\n")).toMatch(/documented as human-review but/);
  });

  it("fails when a human-review theme gives no reason", () => {
    const defs = cloneRetired();
    const i = defs.findIndex((t) => t.id === "founder-worship");
    defs[i] = { ...defs[i], humanReviewReason: "  " };
    const errors = validateToneOfVoice(
      voicePrinciples,
      favouredTerms,
      defs,
    );
    expect(errors.join("\n")).toMatch(/gives no reason/);
  });

  it("fails when the profanity queue item does not exist", () => {
    const errors = validateToneOfVoice(
      voicePrinciples,
      favouredTerms,
      retiredTerms,
      FORBIDDEN_PATTERNS,
      approvalQueue.filter((q) => q.id !== PROFANITY_POLICY.governingQueueItem),
    );
    expect(errors.join("\n")).toMatch(/not in the approval queue/);
  });
});

describe("generated docs/research/tone-of-voice.md", () => {
  it("renders with the expected shape", () => {
    const doc = renderToneOfVoiceDoc();
    expect(doc).toContain("# Tone-of-voice system (R-003)");
    expect(doc).toContain("do not edit by hand");
    expect(doc).toContain("## Voice principles — the section checklist");
    expect(doc).toContain("## Vocabulary to favour (§15.2)");
    expect(doc).toContain("## Themes to retire (§15.3)");
    expect(doc).toContain("## Profanity (§15.4)");
    expect(doc).toMatch(/\n$/);
  });

  it("matches the committed file (no drift)", () => {
    expect(renderToneOfVoiceDoc()).toBe(readCommittedDoc());
  });
});
