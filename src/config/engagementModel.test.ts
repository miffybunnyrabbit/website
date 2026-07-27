import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  APPROVED_WORDING,
  ENGAGEMENT_MODEL_DOC_PATH,
  ENGAGEMENT_MODEL_REVIEW,
  PROHIBITED_WORDING,
  PUBLIC_SAFE_SUMMARY,
  assertEngagementModelValid,
  engagementModelTopics,
  governedCopySources,
  renderEngagementModelDoc,
  scanProhibitedWording,
  validateEngagementModel,
  type EngagementModelTopic,
} from "./engagementModel";
import { howWeWorkSteps, howWeWorkCopy } from "./howWeWork";
import { whyHelixPoints, whyHelixCopy } from "./whyHelix";
import { approvalQueue, REQUIRED_APPROVERS } from "./approvalQueue";

/** Deep-clone the topics so a test can mutate them safely. */
function cloneTopics(): EngagementModelTopic[] {
  return engagementModelTopics.map((t) => ({ ...t }));
}

/** Read the committed generated record relative to this module. */
function readCommittedDoc(): string {
  const path = fileURLToPath(
    new URL(`../../${ENGAGEMENT_MODEL_DOC_PATH}`, import.meta.url),
  );
  return readFileSync(path, "utf8");
}

describe("engagement model (R-012)", () => {
  it("the live record is valid and the governed copy is clean", () => {
    expect(validateEngagementModel()).toEqual([]);
    expect(() => assertEngagementModelValid()).not.toThrow();
  });

  it("documents both R-012 halves for every topic, free of draft markers", () => {
    for (const topic of engagementModelTopics) {
      expect(topic.title.trim(), topic.id).toBeTruthy();
      expect(topic.publicSummary.trim(), topic.id).toBeTruthy();
      expect(topic.implementationNote.trim(), topic.id).toBeTruthy();
      const haystack =
        `${topic.title} ${topic.publicSummary} ${topic.implementationNote}`.toLowerCase();
      expect(haystack).not.toContain("todo");
      expect(haystack).not.toContain("tbd");
    }
  });

  it("carries a public-safe summary and non-empty wording guards", () => {
    expect(PUBLIC_SAFE_SUMMARY.trim()).toBeTruthy();
    expect(APPROVED_WORDING.length).toBeGreaterThan(0);
    expect(PROHIBITED_WORDING.length).toBeGreaterThan(0);
  });

  it("fails when a topic is missing (R-012 completeness)", () => {
    const short = cloneTopics().slice(0, -1);
    expect(validateEngagementModel(short).join("\n")).toMatch(
      /Expected exactly 11 R-012 topics/,
    );
  });

  it("fails when the topics are reordered", () => {
    const swapped = cloneTopics();
    [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
    const errors = validateEngagementModel(swapped);
    expect(errors.some((e) => e.includes("must be"))).toBe(true);
  });

  it("fails when a topic loses its implementation note", () => {
    const topics = cloneTopics();
    topics[0] = { ...topics[0], implementationNote: "  " };
    expect(validateEngagementModel(topics).join("\n")).toMatch(
      /missing its implementation note/,
    );
  });

  it("fails when a topic carries a draft marker", () => {
    const topics = cloneTopics();
    topics[0] = { ...topics[0], publicSummary: "TODO: rewrite this later." };
    expect(validateEngagementModel(topics).join("\n")).toMatch(
      /forbidden draft marker/,
    );
  });
});

describe("prohibited-wording guardrail (§11.7)", () => {
  it("the shipped 'How we work' and 'We're different' copy is clean", () => {
    for (const source of governedCopySources()) {
      expect(scanProhibitedWording(source.label, source.text), source.label).toEqual(
        [],
      );
    }
  });

  it.each([
    ["we become your employees", "employment-relationship"],
    ["you put us on your payroll", "on-your-payroll"],
    ["we guarantee a result", "guaranteed-result"],
    ["we get paid when you get paid", "universal-payment-claim"],
    ["you must sell the company", "mandatory-sale"],
    ["this requires a company sale", "sale-required"],
    ["we act as your fiduciary", "fiduciary-agency-directorship"],
    ["you receive guaranteed equity", "guaranteed-instrument"],
  ])("flags prohibited phrase %j as %s", (text, expectedId) => {
    const hits = scanProhibitedWording("test", text);
    expect(hits.map((h) => h.id)).toContain(expectedId);
  });

  it("surfaces prohibited wording injected into a governed section", () => {
    const steps = howWeWorkSteps.map((s) => ({ ...s }));
    steps[2] = {
      ...steps[2],
      body: `${steps[2].body} We become your employees for the duration.`,
    };
    const errors = validateEngagementModel(
      engagementModelTopics,
      steps,
      howWeWorkCopy,
      whyHelixPoints,
      whyHelixCopy,
    );
    expect(errors.join("\n")).toMatch(/Prohibited wording[^\n]*employment-relationship/);
  });

  it("scans without leaking regex state between calls", () => {
    const text = "we become your employees; and you put us on your payroll";
    // Two calls in a row must return the same result (no shared lastIndex).
    expect(scanProhibitedWording("a", text)).toEqual(
      scanProhibitedWording("a", text),
    );
  });
});

describe("generated docs/research/engagement-model.md", () => {
  it("renders with the expected shape", () => {
    const doc = renderEngagementModelDoc();
    expect(doc).toContain("# Engagement-model validation (R-012)");
    expect(doc).toContain("do not edit by hand");
    expect(doc).toContain("## Public-safe summary");
    expect(doc).toContain("## Approved public wording");
    expect(doc).toContain("## Prohibited wording");
    expect(doc).toMatch(/\n$/);
  });

  it("matches the committed file (no drift)", () => {
    expect(renderEngagementModelDoc()).toBe(readCommittedDoc());
  });
});

describe("approval-queue linkage", () => {
  it("is tracked by a real category-B engagement-model queue item", () => {
    const item = approvalQueue.find(
      (q) => q.id === ENGAGEMENT_MODEL_REVIEW.queueItem,
    );
    expect(item).toBeDefined();
    expect(item!.category).toBe("B");
    expect(item!.requiredApprovers).toEqual(REQUIRED_APPROVERS.B);
    expect(item!.coverage.some((c) => c.kind === "engagement-model")).toBe(true);
  });
});
