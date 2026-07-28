import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  GOVERNING_REVIEW_ID,
  REQUIRED_REDIRECTS,
  REQUIRED_TOPIC_IDS,
  SEO_AUDIT_DOC_PATH,
  SEO_AUDIT_REVIEW,
  assertSeoAndRedirectAuditValid,
  renderSeoAndRedirectAuditDoc,
  seoFacts,
  seoTopics,
  validateSeoAndRedirectAudit,
  type RequiredRedirect,
  type SeoTopic,
} from "./seoAndRedirectAudit";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SITE_ORIGIN,
} from "./siteMeta";
import { INDEXABLE_ROUTES, SITEMAP_URL } from "./sitemap";
import { REDIRECTS } from "./redirects";
import { approvalQueue } from "./approvalQueue";

/** Deep-clone the topics so a test can mutate them safely. */
function cloneTopics(): SeoTopic[] {
  return seoTopics.map((t) => ({ ...t }));
}

/** Deep-clone the required redirects so a test can mutate them safely. */
function cloneRequired(): RequiredRedirect[] {
  return REQUIRED_REDIRECTS.map((r) => ({ ...r }));
}

/** Read the committed generated record relative to this module. */
function readCommittedDoc(): string {
  const path = fileURLToPath(
    new URL(`../../${SEO_AUDIT_DOC_PATH}`, import.meta.url),
  );
  return readFileSync(path, "utf8");
}

describe("SEO and redirect audit (R-010)", () => {
  it("the live record is valid and complete", () => {
    expect(validateSeoAndRedirectAudit()).toEqual([]);
    expect(() => assertSeoAndRedirectAuditValid()).not.toThrow();
  });

  it("documents exactly the §17.11 topics, in order, free of draft markers", () => {
    expect(seoTopics.map((t) => t.id)).toEqual([...REQUIRED_TOPIC_IDS]);
    for (const topic of seoTopics) {
      expect(topic.title.trim(), topic.id).toBeTruthy();
      expect(topic.statement.trim(), topic.id).toBeTruthy();
      const lower = topic.statement.toLowerCase();
      for (const marker of ["[verify", "[research", "todo", "tbd", "placeholder"]) {
        expect(lower, topic.id).not.toContain(marker);
      }
    }
  });

  it("mirrors siteMeta and sitemap facts exactly", () => {
    expect(seoFacts.canonicalOrigin).toBe(SITE_ORIGIN);
    expect(seoFacts.defaultTitle).toBe(DEFAULT_TITLE);
    expect(seoFacts.defaultDescription).toBe(DEFAULT_DESCRIPTION);
    expect([...seoFacts.indexableRoutes].sort()).toEqual([...INDEXABLE_ROUTES].sort());
    expect(seoFacts.sitemapUrl).toBe(SITEMAP_URL);
  });

  it("catches a documented canonical origin that has drifted from siteMeta.ts", () => {
    const errors = validateSeoAndRedirectAudit(seoTopics, {
      ...seoFacts,
      canonicalOrigin: "https://helixcollective.com",
    });
    expect(errors.join("\n")).toContain("SITE_ORIGIN");
  });

  it("catches a documented title that has drifted from siteMeta.ts", () => {
    const errors = validateSeoAndRedirectAudit(seoTopics, {
      ...seoFacts,
      defaultTitle: "Helix",
    });
    expect(errors.join("\n")).toContain("DEFAULT_TITLE");
  });

  it("catches documented indexable routes that drift from sitemap.ts", () => {
    const errors = validateSeoAndRedirectAudit(seoTopics, {
      ...seoFacts,
      indexableRoutes: ["/", "/contact-us"],
    });
    expect(errors.join("\n")).toContain("INDEXABLE_ROUTES");
  });

  it("catches a documented sitemap URL that has drifted from sitemap.ts", () => {
    const errors = validateSeoAndRedirectAudit(seoTopics, {
      ...seoFacts,
      sitemapUrl: "https://www.helixcollective.com/sitemap-index.xml",
    });
    expect(errors.join("\n")).toContain("SITEMAP_URL");
  });

  it("catches a topic linking a review item that does not exist", () => {
    const topics = cloneTopics();
    const meta = topics.find((t) => t.id === "title-and-description")!;
    meta.governingReview = "Q-9999-nope";
    const errors = validateSeoAndRedirectAudit(topics);
    expect(errors.join("\n")).toContain("not in the approval queue");
  });

  it("requires the mandatory /contact-us → / (301) redirect", () => {
    const required = cloneRequired().filter((r) => r.from !== "/contact-us");
    const errors = validateSeoAndRedirectAudit(seoTopics, seoFacts, required);
    expect(errors.join("\n")).toContain("mandatory /contact-us");
  });

  it("catches a documented launch redirect absent from redirects.ts", () => {
    const required = [
      ...cloneRequired(),
      { from: "/old-blog", to: "/", status: 301 as const, reason: "legacy" },
    ];
    const errors = validateSeoAndRedirectAudit(seoTopics, seoFacts, required);
    expect(errors.join("\n")).toContain("not present in redirects.ts");
  });

  it("the mandatory redirect actually ships in redirects.ts", () => {
    expect(
      REDIRECTS.some((r) => r.from === "/contact-us" && r.to === "/" && r.status === 301),
    ).toBe(true);
  });

  it("links a real, still-open launch-review item", () => {
    const review = approvalQueue.find((q) => q.id === GOVERNING_REVIEW_ID);
    expect(review, GOVERNING_REVIEW_ID).toBeDefined();
    // R-010 publishes as a pending baseline while the launch review is open.
    expect(SEO_AUDIT_REVIEW.status).toBe("pending");
    expect(review!.status).toBe("open");
  });

  it("forbids marking the record approved while the launch review is open", () => {
    const original = SEO_AUDIT_REVIEW.status;
    try {
      (SEO_AUDIT_REVIEW as { status: string }).status = "approved";
      const errors = validateSeoAndRedirectAudit();
      expect(errors.join("\n")).toContain("marked approved");
    } finally {
      (SEO_AUDIT_REVIEW as { status: string }).status = original;
    }
  });

  it("the committed generated doc matches the model", () => {
    expect(renderSeoAndRedirectAuditDoc()).toBe(readCommittedDoc());
  });
});
