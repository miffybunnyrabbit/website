import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CURRENT_SITE_AUDIT_DOC_PATH,
  CURRENT_SITE_AUDIT_REVIEW,
  GOVERNING_REVIEW_ID,
  REQUIRED_TOPIC_IDS,
  assertCurrentSiteAuditValid,
  auditFacts,
  auditTopics,
  renderCurrentSiteAuditDoc,
  validateCurrentSiteAudit,
  type AuditFacts,
  type AuditTopic,
} from "./currentSiteAudit";
import { DEFAULT_TITLE } from "./siteMeta";
import { INDEXABLE_ROUTES } from "./sitemap";
import { REDIRECTS } from "./redirects";
import { HOMEPAGE_SECTION_IDS } from "./navigation";
import { REQUIRED_BRAND_COLORS } from "./designTokens";
import { REMOVED_BRANDS } from "./logos";
import { approvalQueue } from "./approvalQueue";

/** Deep-clone the topics so a test can mutate them safely. */
function cloneTopics(): AuditTopic[] {
  return auditTopics.map((t) => ({ ...t }));
}

/** A fresh copy of the facts so a test can mutate them safely. */
function cloneFacts(): AuditFacts {
  return {
    ...auditFacts,
    rebuildSectionIds: [...auditFacts.rebuildSectionIds],
    brandColors: { ...auditFacts.brandColors },
    removedBrands: [...auditFacts.removedBrands],
    rebuildIndexableRoutes: [...auditFacts.rebuildIndexableRoutes],
  };
}

/** Read the committed generated record relative to this module. */
function readCommittedDoc(): string {
  const path = fileURLToPath(
    new URL(`../../${CURRENT_SITE_AUDIT_DOC_PATH}`, import.meta.url),
  );
  return readFileSync(path, "utf8");
}

describe("Current-site audit (R-001)", () => {
  it("the live record is valid and complete", () => {
    expect(validateCurrentSiteAudit()).toEqual([]);
    expect(() => assertCurrentSiteAuditValid()).not.toThrow();
  });

  it("documents exactly the §17.2 topics, in order, free of draft markers", () => {
    expect(auditTopics.map((t) => t.id)).toEqual([...REQUIRED_TOPIC_IDS]);
    for (const topic of auditTopics) {
      expect(topic.title.trim(), topic.id).toBeTruthy();
      expect(topic.statement.trim(), topic.id).toBeTruthy();
      const lower = topic.statement.toLowerCase();
      for (const marker of ["[verify", "[research", "todo", "tbd", "placeholder"]) {
        expect(lower, topic.id).not.toContain(marker);
      }
    }
  });

  it("covers all twenty §17.2 audit aspects", () => {
    expect(REQUIRED_TOPIC_IDS.length).toBe(20);
  });

  it("mirrors the live section order, colours, removed brands, routes, and title exactly", () => {
    expect(auditFacts.rebuildSectionIds).toEqual([...HOMEPAGE_SECTION_IDS]);
    expect(auditFacts.brandColors).toEqual(REQUIRED_BRAND_COLORS);
    expect([...auditFacts.removedBrands].sort()).toEqual([...REMOVED_BRANDS].sort());
    expect([...auditFacts.rebuildIndexableRoutes].sort()).toEqual(
      [...INDEXABLE_ROUTES].sort(),
    );
    expect(auditFacts.rebuildTitle).toBe(DEFAULT_TITLE);
  });

  it("catches a documented section order that has drifted from navigation.ts", () => {
    const facts = cloneFacts();
    facts.rebuildSectionIds = ["top", "fit", "work", "how-we-work", "contact"];
    const errors = validateCurrentSiteAudit(auditTopics, facts);
    expect(errors.join("\n")).toContain("HOMEPAGE_SECTION_IDS");
  });

  it("catches documented brand colours that have drifted from designTokens.ts", () => {
    const facts = cloneFacts();
    facts.brandColors = { ...facts.brandColors, "--color-helix-mint": "#00ff00" };
    const errors = validateCurrentSiteAudit(auditTopics, facts);
    expect(errors.join("\n")).toContain("REQUIRED_BRAND_COLORS");
  });

  it("catches documented removed brands that drift from logos.ts", () => {
    const facts = cloneFacts();
    facts.removedBrands = ["Awayco", "Perion"];
    const errors = validateCurrentSiteAudit(auditTopics, facts);
    expect(errors.join("\n")).toContain("REMOVED_BRANDS");
  });

  it("catches documented routes that drift from sitemap.ts", () => {
    const facts = cloneFacts();
    facts.rebuildIndexableRoutes = ["/", "/contact-us"];
    const errors = validateCurrentSiteAudit(auditTopics, facts);
    expect(errors.join("\n")).toContain("INDEXABLE_ROUTES");
  });

  it("catches a documented title that has drifted from siteMeta.ts", () => {
    const facts = cloneFacts();
    facts.rebuildTitle = "Helix";
    const errors = validateCurrentSiteAudit(auditTopics, facts);
    expect(errors.join("\n")).toContain("DEFAULT_TITLE");
  });

  it("catches a reordered topic set", () => {
    const topics = cloneTopics();
    [topics[0], topics[1]] = [topics[1], topics[0]];
    const errors = validateCurrentSiteAudit(topics);
    expect(errors.join("\n")).toContain("in that order");
  });

  it("catches a topic linking a review item that does not exist", () => {
    const topics = cloneTopics();
    const meta = topics.find((t) => t.id === "metadata")!;
    meta.governingReview = "Q-9999-nope";
    const errors = validateCurrentSiteAudit(topics);
    expect(errors.join("\n")).toContain("not in the approval queue");
  });

  it("catches a draft marker in a statement", () => {
    const topics = cloneTopics();
    topics[0] = { ...topics[0], statement: `${topics[0].statement} [VERIFY]` };
    const errors = validateCurrentSiteAudit(topics);
    expect(errors.join("\n")).toContain("draft marker");
  });

  it("the mandatory /contact-us → / (301) redirect actually ships in redirects.ts", () => {
    expect(
      REDIRECTS.some((r) => r.from === "/contact-us" && r.to === "/" && r.status === 301),
    ).toBe(true);
  });

  it("links a real, still-open launch-review item", () => {
    const review = approvalQueue.find((q) => q.id === GOVERNING_REVIEW_ID);
    expect(review, GOVERNING_REVIEW_ID).toBeDefined();
    // R-001 publishes as a pending baseline while the launch review is open.
    expect(CURRENT_SITE_AUDIT_REVIEW.status).toBe("pending");
    expect(review!.status).toBe("open");
  });

  it("links the footer-identity queue item from the footer topic", () => {
    const footer = auditTopics.find((t) => t.id === "footer-and-legal-content")!;
    expect(footer.governingReview).toBe("Q-0010-footer-identity");
    expect(approvalQueue.some((q) => q.id === footer.governingReview)).toBe(true);
  });

  it("forbids marking the record approved while the launch review is open", () => {
    const original = CURRENT_SITE_AUDIT_REVIEW.status;
    try {
      (CURRENT_SITE_AUDIT_REVIEW as { status: string }).status = "approved";
      const errors = validateCurrentSiteAudit();
      expect(errors.join("\n")).toContain("marked approved");
    } finally {
      (CURRENT_SITE_AUDIT_REVIEW as { status: string }).status = original;
    }
  });

  it("the committed generated doc matches the model", () => {
    expect(renderCurrentSiteAuditDoc()).toBe(readCommittedDoc());
  });
});
