import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  decisions,
  decisionById,
  openDecisions,
  isDecided,
  gateApproved,
  validateDecisions,
  assertDecisionsValid,
  DECISION_ID_PATTERN,
  REQUIRED_DECISION_NUMBERS,
  decisionFilename,
  renderDecisionMarkdown,
  formatOpenDecisionsWarning,
  type DecisionRecord,
  type DecisionGateId,
} from "./decisions";
import { approvalQueue } from "./approvalQueue";

/** A minimal valid open decision, for isolated negative-path tests. */
function makeDecision(overrides: Partial<DecisionRecord> = {}): DecisionRecord {
  return {
    id: "D-0001-currency",
    title: "Currency",
    summary: "An ambiguity.",
    recommendedDefault: "A default.",
    status: "open",
    ...overrides,
  };
}

/**
 * A register that covers all twelve §6 numbers and claims all three gates, so a
 * completeness check passes and per-decision negatives can be tested in isolation.
 * `first` replaces D-0001 (which owns the proof-currency gate).
 */
function fullRegister(first: DecisionRecord): DecisionRecord[] {
  const rest = decisions.filter((d) => d.id !== "D-0001-currency");
  return [first, ...rest];
}

describe("decisions register content (§6)", () => {
  it("covers exactly the twelve §6 decisions, one each", () => {
    expect(decisions).toHaveLength(REQUIRED_DECISION_NUMBERS.length);
    const numbers = decisions.map((d) => Number(/^D-(\d{4})-/.exec(d.id)![1]));
    expect([...numbers].sort((a, b) => a - b)).toEqual([
      ...REQUIRED_DECISION_NUMBERS,
    ]);
  });

  it("gives every decision a well-formed id, title, summary, and default", () => {
    for (const d of decisions) {
      expect(d.id, d.id).toMatch(DECISION_ID_PATTERN);
      expect(d.title.trim(), d.id).toBeTruthy();
      expect(d.summary.trim(), d.id).toBeTruthy();
      expect(d.recommendedDefault.trim(), d.id).toBeTruthy();
    }
  });

  it("has unique ids", () => {
    const ids = decisions.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("carries the recorded owner decisions; everything else stays open", () => {
    const decidedOn: Record<string, string> = {
      "D-0001-currency": "2026-07-29",
      "D-0010-font-rights": "2026-07-29",
      "D-0012-engagement-boundaries": "2026-08-03",
    };
    for (const d of decisions) {
      if (d.id in decidedOn) {
        expect(d.status, d.id).toBe("decided");
        expect(isDecided(d), d.id).toBe(true);
        expect(d.decision, d.id).toBeTruthy();
        expect(d.decisionDate, d.id).toBe(decidedOn[d.id]);
        expect(d.decidedBy, d.id).toContain("Helix owner");
      } else {
        expect(d.status, d.id).toBe("open");
        expect(isDecided(d), d.id).toBe(false);
        expect(d.decision, d.id).toBeUndefined();
        expect(d.decisionDate, d.id).toBeUndefined();
        expect(d.decidedBy, d.id).toBeUndefined();
      }
    }
    expect(openDecisions()).toHaveLength(
      decisions.length - Object.keys(decidedOn).length,
    );
  });

  it("points every named approval-queue item at a real queue item", () => {
    const queueIds = new Set(approvalQueue.map((q) => q.id));
    for (const d of decisions) {
      if (d.queueItem) expect(queueIds.has(d.queueItem), d.id).toBe(true);
    }
  });

  it("requires a note explaining any decision with no queue item", () => {
    for (const d of decisions) {
      if (!d.queueItem) expect(d.notes?.trim(), d.id).toBeTruthy();
    }
  });

  it("wires the known decisions to their queue items and gates", () => {
    expect(decisionById("D-0001-currency")?.gate).toBe("proof-currency");
    expect(decisionById("D-0001-currency")?.queueItem).toBe(
      "Q-0007-proof-enterprise-value",
    );
    expect(decisionById("D-0009-performance-linked-economics")?.gate).toBe(
      "hero-performance-linked",
    );
    expect(decisionById("D-0012-engagement-boundaries")?.gate).toBe(
      "engagement-model",
    );
    expect(decisionById("D-0007-locations")?.queueItem).toBe(
      "Q-0010-footer-identity",
    );
    expect(decisionById("D-0008-xylo-logo")?.queueItem).toBe(
      "Q-0006-client-representation",
    );
  });
});

describe("gateApproved", () => {
  it("reads the currency and engagement gates approved; hero wording pending", () => {
    expect(gateApproved("proof-currency")).toBe(true);
    expect(gateApproved("hero-performance-linked")).toBe(false);
    expect(gateApproved("engagement-model")).toBe(true);
  });
});

describe("validateDecisions", () => {
  it("accepts the live register against the live queue", () => {
    expect(validateDecisions()).toEqual([]);
    expect(() => assertDecisionsValid()).not.toThrow();
  });

  it("rejects a malformed id", () => {
    const reg = fullRegister(makeDecision({ id: "D-1-currency", gate: "proof-currency" }));
    expect(validateDecisions(reg)).toContain(
      'Decision id "D-1-currency" is not of the form D-NNNN-short-title.',
    );
  });

  it("rejects a missing recommended default", () => {
    const reg = fullRegister(
      makeDecision({ recommendedDefault: "  ", gate: "proof-currency" }),
    );
    expect(validateDecisions(reg)).toContain(
      'Decision "D-0001-currency" must record the recommended default it publishes until decided.',
    );
  });

  it("requires a decision note, date, and decider once decided", () => {
    const reg = fullRegister(
      makeDecision({ status: "decided", gate: "proof-currency" }),
    );
    const errors = validateDecisions(reg);
    expect(errors).toContain('Decided decision "D-0001-currency" is missing a decision note.');
    expect(errors).toContain('Decided decision "D-0001-currency" needs a YYYY-MM-DD decision date.');
    expect(errors).toContain('Decided decision "D-0001-currency" must record who decided.');
  });

  it("forbids an open decision from carrying a recorded decision", () => {
    const reg = fullRegister(
      makeDecision({ decision: "Chose A$.", gate: "proof-currency" }),
    );
    expect(validateDecisions(reg)).toContain(
      'Open decision "D-0001-currency" must not carry a recorded decision.',
    );
  });

  it("rejects a dangling approval-queue reference", () => {
    const reg = fullRegister(
      makeDecision({ queueItem: "Q-9999-nope", gate: "proof-currency" }),
    );
    expect(validateDecisions(reg)).toContain(
      'Decision "D-0001-currency" references approval-queue item "Q-9999-nope", which does not exist.',
    );
  });

  it("flags a content gate approved while its decision is still open", () => {
    // Stub the gate reader so proof-currency reads approved against a register
    // where the owning decision D-0001 is wound back to open; the §2 cross-check
    // must fire.
    const approveProofCurrency = (g: DecisionGateId) => g === "proof-currency";
    const wound = decisions.map((d) =>
      d.id === "D-0001-currency"
        ? {
            ...d,
            status: "open" as const,
            decision: undefined,
            decisionDate: undefined,
            decidedBy: undefined,
          }
        : d,
    );
    expect(validateDecisions(wound, approvalQueue, approveProofCurrency)).toContain(
      'Content gate "proof-currency" reads "approved" but decision "D-0001-currency" is still open; record the decision before approving the gate.',
    );
  });

  it("accepts an approved content gate once its decision is recorded", () => {
    const approveProofCurrency = (g: DecisionGateId) => g === "proof-currency";
    const decided = makeDecision({
      status: "decided",
      decision: "Deliberately currency-neutral.",
      decisionDate: "2026-07-27",
      decidedBy: "helix-owner",
      gate: "proof-currency",
    });
    expect(
      validateDecisions(fullRegister(decided), approvalQueue, approveProofCurrency),
    ).toEqual([]);
  });

  it("rejects two records claiming the same §6 decision number", () => {
    const dup = makeDecision({ id: "D-0002-again", gate: undefined });
    const reg = [...decisions, dup];
    expect(validateDecisions(reg)).toContain(
      "Duplicate §6 decision number D-0002.",
    );
  });

  it("reports a missing §6 decision", () => {
    const reg = decisions.filter((d) => d.id !== "D-0011-analytics");
    expect(validateDecisions(reg)).toContain(
      "The register is missing §6 decision D-0011.",
    );
  });

  it("requires every content gate to be claimed by exactly one decision", () => {
    // Drop D-0009, which owns the hero-performance-linked gate.
    const reg = decisions.filter(
      (d) => d.id !== "D-0009-performance-linked-economics",
    );
    const errors = validateDecisions(reg);
    expect(
      errors.some((e) =>
        e.includes('Content gate "hero-performance-linked" is not claimed'),
      ),
    ).toBe(true);
  });
});

describe("formatOpenDecisionsWarning", () => {
  it("lists every open decision", () => {
    const warning = formatOpenDecisionsWarning();
    expect(warning).toContain("9 open §6 decision(s)");
    for (const d of openDecisions()) expect(warning).toContain(d.id);
  });

  it("reports none open when the register is empty of open items", () => {
    const allDecided = decisions.map((d) => ({
      ...d,
      status: "decided" as const,
    }));
    expect(formatOpenDecisionsWarning(allDecided)).toBe("Decisions: none open.");
  });
});

describe("generated one-file-per-decision records (§6)", () => {
  /** Absolute path of a file in the committed `docs/decisions/` directory. */
  function decisionDocPath(name: string): string {
    return fileURLToPath(new URL(`../../docs/decisions/${name}`, import.meta.url));
  }

  it("renders each record from the model with the expected shape", () => {
    const d = decisions[0];
    const text = renderDecisionMarkdown(d);
    expect(text).toContain(`# ${d.id} — ${d.title}`);
    expect(text).toContain("do not edit by hand");
    expect(text).toContain(`- **Status:** ${d.status}`);
    expect(text).toContain(d.recommendedDefault);
    expect(text).toMatch(/\n$/);
  });

  it("shows the decision block only once a decision is decided", () => {
    const open = decisions.find((d) => d.status === "open")!;
    expect(renderDecisionMarkdown(open)).toContain("No decision recorded yet");

    const decided: DecisionRecord = {
      ...open,
      status: "decided",
      decision: "Deliberately currency-neutral confirmed.",
      decisionDate: "2026-07-27",
      decidedBy: "helix-owner",
    };
    const text = renderDecisionMarkdown(decided);
    expect(text).not.toContain("No decision recorded yet");
    expect(text).toContain("Deliberately currency-neutral confirmed.");
    expect(text).toContain("- **Decision date:** 2026-07-27");
    expect(text).toContain("- **Decided by:** helix-owner");
  });

  it("names the filename after §6's NNNN-short-title format", () => {
    expect(decisionFilename(decisions[0])).toBe("0001-currency.md");
  });

  it("has a committed record for every decision that matches the model", () => {
    for (const d of decisions) {
      const committed = readFileSync(decisionDocPath(decisionFilename(d)), "utf8");
      expect(committed, d.id).toBe(renderDecisionMarkdown(d));
    }
  });

  it("has no orphan NNNN-*.md record without a decision", () => {
    const onDisk = readdirSync(decisionDocPath("."))
      .filter((n) => /^\d{4}-.*\.md$/.test(n))
      .sort();
    const expected = decisions.map(decisionFilename).sort();
    expect(onDisk).toEqual(expected);
  });
});
