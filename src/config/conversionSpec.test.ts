import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CONVERSION_SPEC_DOC_PATH,
  CONVERSION_SPEC_REVIEW,
  GOVERNING_DECISION_ID,
  POSITIVE_FIT_OUTCOMES,
  REQUIRED_TOPIC_IDS,
  assertConversionSpecValid,
  conversionFacts,
  conversionTopics,
  renderConversionSpecDoc,
  validateConversionSpec,
  type ConversionTopic,
} from "./conversionSpec";
import {
  APPROVED_CTA_HOSTS,
  CTA_ANALYTICS_EVENT,
  PRIMARY_CTA_LABEL,
} from "./cta";
import { fitResultEvent } from "../utils/analytics";
import { decisions } from "./decisions";

/** Deep-clone the topics so a test can mutate them safely. */
function cloneTopics(): ConversionTopic[] {
  return conversionTopics.map((t) => ({ ...t }));
}

/** Read the committed generated record relative to this module. */
function readCommittedDoc(): string {
  const path = fileURLToPath(
    new URL(`../../${CONVERSION_SPEC_DOC_PATH}`, import.meta.url),
  );
  return readFileSync(path, "utf8");
}

describe("conversion specification (R-009)", () => {
  it("the live record is valid and complete", () => {
    expect(validateConversionSpec()).toEqual([]);
    expect(() => assertConversionSpecValid()).not.toThrow();
  });

  it("documents exactly the §17.10 topics, in order, free of draft markers", () => {
    expect(conversionTopics.map((t) => t.id)).toEqual([...REQUIRED_TOPIC_IDS]);
    for (const topic of conversionTopics) {
      expect(topic.title.trim(), topic.id).toBeTruthy();
      expect(topic.statement.trim(), topic.id).toBeTruthy();
      const lower = topic.statement.toLowerCase();
      for (const marker of ["[verify", "[research", "todo", "tbd", "placeholder"]) {
        expect(lower, topic.id).not.toContain(marker);
      }
    }
  });

  it("mirrors cta.ts's label, event, and approved hosts exactly", () => {
    expect(conversionFacts.ctaLabel).toBe(PRIMARY_CTA_LABEL);
    expect(conversionFacts.conversionEvent).toBe(CTA_ANALYTICS_EVENT);
    expect([...conversionFacts.approvedHosts].sort()).toEqual(
      [...APPROVED_CTA_HOSTS].sort(),
    );
  });

  it("catches a documented CTA label that has drifted from cta.ts", () => {
    const errors = validateConversionSpec(conversionTopics, {
      ...conversionFacts,
      ctaLabel: "BOOK A CALL",
    });
    expect(errors.join("\n")).toContain("PRIMARY_CTA_LABEL");
  });

  it("catches a documented conversion event that has drifted from cta.ts", () => {
    const errors = validateConversionSpec(conversionTopics, {
      ...conversionFacts,
      conversionEvent: "book_click",
    });
    expect(errors.join("\n")).toContain("CTA_ANALYTICS_EVENT");
  });

  it("catches documented approved hosts that drift from cta.ts", () => {
    const errors = validateConversionSpec(conversionTopics, {
      ...conversionFacts,
      approvedHosts: ["cal.com"],
    });
    expect(errors.join("\n")).toContain("APPROVED_CTA_HOSTS");
  });

  it("catches a topic linking a decision that does not exist", () => {
    const topics = cloneTopics();
    const url = topics.find((t) => t.id === "calendly-url")!;
    url.governingDecision = "D-9999-nope";
    const errors = validateConversionSpec(topics);
    expect(errors.join("\n")).toContain("not in the decisions register");
  });

  it("requires the calendly-url topic to be governed by D-006", () => {
    const topics = cloneTopics();
    const url = topics.find((t) => t.id === "calendly-url")!;
    delete url.governingDecision;
    const errors = validateConversionSpec(topics);
    expect(errors.join("\n")).toContain(GOVERNING_DECISION_ID);
  });

  it("confirms the three positive outcomes map to distinct fit_result events", () => {
    expect(POSITIVE_FIT_OUTCOMES).toEqual(["growth-fit", "idea-fit", "community-fit"]);
    const events = POSITIVE_FIT_OUTCOMES.map((o) => fitResultEvent(o));
    // Each resolves to an event, all distinct, none the shared conversion event.
    expect(new Set(events).size).toBe(events.length);
    for (const event of events) {
      expect(event).toBeTruthy();
      expect(event).not.toBe(conversionFacts.conversionEvent);
    }
  });

  it("links a real, still-open D-006 decision", () => {
    const governing = decisions.find((d) => d.id === GOVERNING_DECISION_ID);
    expect(governing, GOVERNING_DECISION_ID).toBeDefined();
    // R-009 publishes as a pending baseline while the Calendly decision is open.
    expect(CONVERSION_SPEC_REVIEW.status).toBe("pending");
    expect(governing!.status).toBe("open");
  });

  it("forbids marking the record approved while D-006 is still open", () => {
    const original = CONVERSION_SPEC_REVIEW.status;
    try {
      (CONVERSION_SPEC_REVIEW as { status: string }).status = "approved";
      const errors = validateConversionSpec();
      expect(errors.join("\n")).toContain("marked approved");
    } finally {
      (CONVERSION_SPEC_REVIEW as { status: string }).status = original;
    }
  });

  it("the committed generated doc matches the model", () => {
    expect(renderConversionSpecDoc()).toBe(readCommittedDoc());
  });
});
