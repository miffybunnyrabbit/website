import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ANALYTICS_AND_PRIVACY_DOC_PATH,
  ANALYTICS_AND_PRIVACY_REVIEW,
  GOVERNING_DECISION_ID,
  NEVER_TRACKED,
  REQUIRED_TOPIC_IDS,
  analyticsTopics,
  assertAnalyticsAndPrivacyValid,
  renderAnalyticsAndPrivacyDoc,
  trackedEvents,
  validateAnalyticsAndPrivacy,
  type AnalyticsTopic,
  type TrackedEventDoc,
} from "./analyticsAndPrivacy";
import { ANALYTICS_EVENTS } from "../utils/analytics";
import { decisions } from "./decisions";

/** Deep-clone the topics so a test can mutate them safely. */
function cloneTopics(): AnalyticsTopic[] {
  return analyticsTopics.map((t) => ({ ...t }));
}

/** Deep-clone the events so a test can mutate them safely. */
function cloneEvents(): TrackedEventDoc[] {
  return trackedEvents.map((e) => ({ ...e }));
}

/** Read the committed generated record relative to this module. */
function readCommittedDoc(): string {
  const path = fileURLToPath(
    new URL(`../../${ANALYTICS_AND_PRIVACY_DOC_PATH}`, import.meta.url),
  );
  return readFileSync(path, "utf8");
}

describe("analytics and privacy (R-011)", () => {
  it("the live record is valid and complete", () => {
    expect(validateAnalyticsAndPrivacy()).toEqual([]);
    expect(() => assertAnalyticsAndPrivacyValid()).not.toThrow();
  });

  it("documents exactly the §17.12 topics, in order, free of draft markers", () => {
    expect(analyticsTopics.map((t) => t.id)).toEqual([...REQUIRED_TOPIC_IDS]);
    for (const topic of analyticsTopics) {
      expect(topic.title.trim(), topic.id).toBeTruthy();
      expect(topic.statement.trim(), topic.id).toBeTruthy();
      const lower = topic.statement.toLowerCase();
      for (const marker of ["[verify", "[research", "todo", "tbd", "placeholder"]) {
        expect(lower, topic.id).not.toContain(marker);
      }
    }
  });

  it("documents exactly the adapter's live ANALYTICS_EVENTS set", () => {
    const documented = trackedEvents.map((e) => e.event).sort();
    expect(documented).toEqual([...ANALYTICS_EVENTS].sort());
    for (const doc of trackedEvents) {
      expect(doc.purpose.trim(), doc.event).toBeTruthy();
    }
  });

  it("catches a documented event the adapter no longer emits", () => {
    const events = cloneEvents();
    // Drop cta_click from the documentation: the adapter still emits it.
    const trimmed = events.filter((e) => e.event !== "cta_click");
    const errors = validateAnalyticsAndPrivacy(analyticsTopics, trimmed);
    expect(errors.join("\n")).toContain("exactly the adapter's ANALYTICS_EVENTS");
    expect(errors.join("\n")).toContain("cta_click");
  });

  it("catches a topic linking a decision that does not exist", () => {
    const topics = cloneTopics();
    const launch = topics.find((t) => t.id === "desired-launch-analytics")!;
    launch.governingDecision = "D-9999-nope";
    const errors = validateAnalyticsAndPrivacy(topics);
    expect(errors.join("\n")).toContain("not in the decisions register");
  });

  it("requires the launch-analytics topic to be governed by D-011", () => {
    const topics = cloneTopics();
    const launch = topics.find((t) => t.id === "desired-launch-analytics")!;
    delete launch.governingDecision;
    const errors = validateAnalyticsAndPrivacy(topics);
    expect(errors.join("\n")).toContain(GOVERNING_DECISION_ID);
  });

  it("links a real, still-open D-011 decision", () => {
    const governing = decisions.find((d) => d.id === GOVERNING_DECISION_ID);
    expect(governing, GOVERNING_DECISION_ID).toBeDefined();
    // R-011 publishes as a pending baseline while the provider decision is open.
    expect(ANALYTICS_AND_PRIVACY_REVIEW.status).toBe("pending");
    expect(governing!.status).toBe("open");
  });

  it("forbids marking the record approved while D-011 is still open", () => {
    // The live decision D-011 is open, so an approved review must be rejected.
    const original = ANALYTICS_AND_PRIVACY_REVIEW.status;
    try {
      (ANALYTICS_AND_PRIVACY_REVIEW as { status: string }).status = "approved";
      const errors = validateAnalyticsAndPrivacy();
      expect(errors.join("\n")).toContain("marked approved");
    } finally {
      (ANALYTICS_AND_PRIVACY_REVIEW as { status: string }).status = original;
    }
  });

  it("records the never-tracked data R-011 forbids", () => {
    const joined = NEVER_TRACKED.join(" ").toLowerCase();
    expect(joined).toContain("email");
    expect(joined).toContain("calendly");
    expect(NEVER_TRACKED.every((item) => item.trim().length > 0)).toBe(true);
  });

  it("the committed generated doc matches the model", () => {
    expect(renderAnalyticsAndPrivacyDoc()).toBe(readCommittedDoc());
  });
});
