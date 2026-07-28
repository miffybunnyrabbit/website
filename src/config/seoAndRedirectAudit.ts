/**
 * Typed, self-validating SEO and redirect audit (implementation plan §17.11
 * R-010, output `docs/research/seo-and-redirect-audit.md`; §7 routes, P7-001
 * metadata, P7-002 canonical domain, P7-003 social preview, P7-004 structured
 * data, P7-009 redirects; §24 "sitemap and robots are correct").
 *
 * The rebuild's SEO surface already ships, spread across four modules:
 * `siteMeta.ts` (canonical origin, title/description, structured data),
 * `sitemap.ts` (robots + sitemap), and `redirects.ts` (the `/contact-us`
 * redirect). What was missing is the R-010 record that pulls those pieces
 * together into the §17.11 audit — every indexed route, the current
 * title/description, the canonical domain, known inbound links, contact-page
 * behaviour, the sitemap/robots rules, the social-preview image, the schema
 * markup, and the redirects required at launch — and keeps the documented audit
 * honest against the live code.
 *
 * Following the same convention as `conversionSpec.ts` and
 * `analyticsAndPrivacy.ts`, this module is thin, pure content plus validation: it
 * renders no UI and ships no route. What it *adds* is a governance spine — the
 * §17.11 topics as structured data plus a small set of machine-checkable facts,
 * and build-time cross-checks that (a) the documented canonical origin is exactly
 * `siteMeta.ts`'s `SITE_ORIGIN`; (b) the documented default title/description are
 * exactly `siteMeta.ts`'s `DEFAULT_TITLE`/`DEFAULT_DESCRIPTION`; (c) the
 * documented indexable routes are exactly `sitemap.ts`'s `INDEXABLE_ROUTES` and
 * the rendered `robots.txt` advertises the one `SITEMAP_URL`; (d) every redirect
 * the audit says is required at launch actually exists in `redirects.ts`, with
 * the mandatory `/contact-us → / (301)` among them; (e) the documented structured
 * data passes `validateStructuredData` (no person node, rating, count, or
 * valuation figure, P7-004); and (f) this record may only read "approved" once
 * the standing launch review (Q-0009) clears, since the final metadata copy
 * (P7-001) and the social-preview artwork (P7-003) are part of that review.
 *
 * `docs/research/seo-and-redirect-audit.md` is generated from this model
 * (`renderSeoAndRedirectAuditDoc`) and `seoAndRedirectAudit.test.ts` asserts the
 * committed file still matches, so the printable R-010 record cannot drift from
 * the code the site actually ships.
 *
 * This module is pure content plus validation: no UI, no client-side state, no
 * I/O.
 */

import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SITE_ORIGIN,
  canonicalUrl,
  structuredDataGraph,
  validateStructuredData,
} from "./siteMeta";
import {
  INDEXABLE_ROUTES,
  SITEMAP_URL,
  renderRobotsTxt,
  renderSitemapXml,
} from "./sitemap";
import { REDIRECTS, type RedirectRule, type RedirectStatus } from "./redirects";
import { approvalQueue, type QueueItem } from "./approvalQueue";

/** Where the generated record lives, for the rendered header. */
export const SEO_AUDIT_DOC_PATH = "docs/research/seo-and-redirect-audit.md";

/**
 * The standing launch-review queue item (§23 category D, Q-0009). R-010 has no
 * §6 decision of its own — the canonical domain, the `/contact-us` redirect, and
 * the sitemap/robots rules are fixed requirements already decided in code. What
 * is genuinely pre-launch is the final metadata copy ("Review before launch",
 * P7-001) and the social-preview artwork (P7-003), both of which fall under the
 * standing launch review. The record's review state is gated on that item so it
 * can never claim sign-off ahead of it.
 */
export const GOVERNING_REVIEW_ID = "Q-0009-launch-review";

/**
 * The record's review state. Like every pending content model, R-010 publishes
 * as the plan's working baseline now. It may only flip to `approved` once the
 * standing launch review (Q-0009) is approved — `validateSeoAndRedirectAudit`
 * enforces that so the record can never claim sign-off ahead of the review.
 */
export const SEO_AUDIT_REVIEW = {
  status: "pending" as "pending" | "approved",
} as const;

/**
 * The §17.11 topics, in a fixed order. Together they cover the full R-010 list;
 * validation fails on a missing, extra, or reordered topic so the record can
 * never lose a rule.
 */
export type SeoTopicId =
  | "indexed-routes"
  | "title-and-description"
  | "canonical-domain"
  | "inbound-links"
  | "contact-page-behaviour"
  | "sitemap-and-robots"
  | "social-preview-image"
  | "schema-markup"
  | "launch-redirects";

/**
 * One R-010 topic. `governingReview`, when present, links a topic whose final
 * wording or asset is part of the standing launch review to the queue item that
 * clears it.
 */
export interface SeoTopic {
  id: SeoTopicId;
  /** Human title, e.g. "Canonical domain". */
  title: string;
  /** The documented finding — current-site state plus how the rebuild handles it. */
  statement: string;
  /** The §23 launch-review item this topic waits on, if any. */
  governingReview?: string;
}

/**
 * The §17.11 topics that must appear, exactly once, in this order. A dropped or
 * reordered topic is a governance hole, so validation fails on any mismatch.
 */
export const REQUIRED_TOPIC_IDS: readonly SeoTopicId[] = [
  "indexed-routes",
  "title-and-description",
  "canonical-domain",
  "inbound-links",
  "contact-page-behaviour",
  "sitemap-and-robots",
  "social-preview-image",
  "schema-markup",
  "launch-redirects",
];

/**
 * A redirect the audit says is required at launch. Each must resolve to a real
 * rule in `redirects.ts` (same `from`, `to`, and `status`), so the documented
 * launch redirects can never drift from the rules the site actually ships.
 */
export interface RequiredRedirect {
  from: string;
  to: string;
  status: RedirectStatus;
  /** Why the redirect exists, e.g. the inbound link it preserves. */
  reason: string;
}

/**
 * The redirects R-010 records as required at launch. The plan mandates exactly
 * one (P7-009); any more discovered during the live-site crawl are added to
 * `redirects.ts` first and then documented here.
 */
export const REQUIRED_REDIRECTS: readonly RequiredRedirect[] = [
  {
    from: "/contact-us",
    to: "/",
    status: 301,
    reason:
      "The live site's /contact-us page folds into the single site-wide Calendly CTA (§4 bars a custom contact form). A permanent redirect preserves every existing inbound link and its accumulated SEO signal.",
  },
];

/**
 * The machine-checkable half of the audit. Each value is documented here as a
 * literal and cross-checked against the live config it mirrors, so the printed
 * record can never quietly drift from the code the site actually ships (the same
 * technique `conversionSpec.ts` uses for its CTA facts). The fields are
 * deliberately widened (not `as const`) so the cross-check has something to
 * catch: a drifted value is a build error reported by
 * `validateSeoAndRedirectAudit`, not a compile error hidden by a literal type.
 */
export interface SeoFacts {
  /** Must equal `siteMeta.ts`'s `SITE_ORIGIN`. */
  canonicalOrigin: string;
  /** Must equal `siteMeta.ts`'s `DEFAULT_TITLE`. */
  defaultTitle: string;
  /** Must equal `siteMeta.ts`'s `DEFAULT_DESCRIPTION`. */
  defaultDescription: string;
  /** Must equal `sitemap.ts`'s `INDEXABLE_ROUTES`. */
  indexableRoutes: readonly string[];
  /** Must equal `sitemap.ts`'s `SITEMAP_URL` and be advertised in `robots.txt`. */
  sitemapUrl: string;
}

export const seoFacts: SeoFacts = {
  canonicalOrigin: "https://www.helixcollective.com",
  defaultTitle: "Helix Collective — Enterprise Value Growth Partner",
  defaultDescription:
    "Helix Collective partners deeply with businesses to create meaningful growth in enterprise value through product, technology and commercial execution.",
  indexableRoutes: ["/"],
  sitemapUrl: "https://www.helixcollective.com/sitemap.xml",
};

/**
 * The documented R-010 topics. The wording records the current live-site finding
 * (directional, from §28) alongside how the rebuild handles it, and commits to no
 * final metadata copy or social image while the launch review is open.
 */
export const seoTopics: readonly SeoTopic[] = [
  {
    id: "indexed-routes",
    title: "Every currently indexed route",
    statement:
      "The live Webflow site indexes the homepage `/` and a separate `/contact-us` page (§28). The rebuild is one coherent single-page story (§7), so it ships one indexable route — `/` — plus a `noindex` `/404` page that is deliberately excluded from the sitemap. `sitemap.ts`'s `INDEXABLE_ROUTES` is the single source of truth, and the generated `sitemap.xml` lists exactly it.",
  },
  {
    id: "title-and-description",
    title: "Current title and description",
    statement:
      "The working title “Helix Collective — Enterprise Value Growth Partner” and the approved-proposition meta description ship from `siteMeta.ts` (P7-001). Both are the launch-review baseline — P7-001 marks them “Review before launch” — so their final wording is confirmed by the standing launch review before cutover.",
    governingReview: GOVERNING_REVIEW_ID,
  },
  {
    id: "canonical-domain",
    title: "Canonical domain",
    statement:
      "One canonical origin, `https://www.helixcollective.com` (P7-002), fixed in `siteMeta.ts` as `SITE_ORIGIN` and mirrored by `astro.config.mjs`'s `site`. Every page's `<link rel=\"canonical\">` and every sitemap `<loc>` is built from that one origin, so the site never advertises two URLs for one page. The apex domain redirects to `www` at the Cloudflare zone (P7-002).",
  },
  {
    id: "inbound-links",
    title: "Inbound links known to the business",
    statement:
      "The one inbound route the plan names is `/contact-us` (§28), preserved by a permanent redirect to `/`. No other inbound routes are known to the business today. Any discovered during the live-site crawl (§10.1) must be added to `redirects.ts` with an approval-queue reference, never hand-edited into `_redirects`.",
  },
  {
    id: "contact-page-behaviour",
    title: "Contact page behaviour",
    statement:
      "The live site's `/contact-us` page folds into the single site-wide Calendly CTA — §4 bars a custom contact form and lead-capture backend. The route is retired as a page and preserved as a permanent (301) redirect to the homepage (P7-009), so existing inbound links and their accumulated SEO signal survive the migration.",
  },
  {
    id: "sitemap-and-robots",
    title: "Current sitemap and robots rules",
    statement:
      "`robots.txt` allows crawling site-wide and advertises the one absolute sitemap URL; `sitemap.xml` lists every indexable route as an absolute canonical URL and omits the `noindex` 404. Both files are generated from `sitemap.ts` and `sitemap.test.ts` asserts the committed files still match, so neither can drift. The Webflow-managed robots/sitemap are replaced wholesale at cutover.",
  },
  {
    id: "social-preview-image",
    title: "Social-preview image",
    statement:
      "A safe brand-only Open Graph card ships in draft form (P7-003) — mint/ink/white, the approved enterprise-value proposition, no people, no figure — generated from `socialCard.ts` and rendered to `public/social/og-card.svg`, which `socialCard.test.ts` pins so the shipped artwork cannot drift. The card carries only already-published hero copy and embeds no raster, so it leaks no unapproved claim; its final designed artwork is signed off through the standing launch review.",
    governingReview: GOVERNING_REVIEW_ID,
  },
  {
    id: "schema-markup",
    title: "Schema markup",
    statement:
      "Conservative `Organization` and `WebSite` JSON-LD only (P7-004), emitted as one `application/ld+json` graph from `siteMeta.ts`. No `founder`/person node, no fabricated rating, no unverified founding date or employee count, and no case-study valuation figure — `validateStructuredData` fails the build if any of those reappears, keeping the machine-readable surface consistent with the institutional-positioning and unsupported-claim rules (§4/§5).",
  },
  {
    id: "launch-redirects",
    title: "Redirects required at launch",
    statement:
      "Exactly one redirect is required at launch — `/contact-us → / (301)` (P7-009) — defined in `redirects.ts` and rendered into `public/_redirects`. Additional redirects surfaced by the live-site crawl are added to `redirects.ts` first (with an approval-queue reference) and then documented here, so the audit and the shipped rules never diverge.",
  },
];

/** Draft markers that must never appear in a documented statement. */
const DRAFT_MARKERS: readonly string[] = [
  "[verify",
  "[research",
  "todo",
  "tbd",
  "placeholder",
];

/** True if `text` contains any draft marker (case-insensitive). */
function hasDraftMarker(text: string): boolean {
  const lower = text.toLowerCase();
  return DRAFT_MARKERS.some((marker) => lower.includes(marker));
}

/** Order-independent equality between two string lists. */
function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((x) => set.has(x));
}

/** True if `redirects.ts` contains a rule matching `from`, `to`, and `status`. */
function redirectExists(required: RequiredRedirect): boolean {
  return REDIRECTS.some(
    (rule: RedirectRule) =>
      rule.from === required.from &&
      rule.to === required.to &&
      rule.status === required.status,
  );
}

/**
 * Validate the R-010 record and cross-check it against the live SEO config —
 * `siteMeta.ts`, `sitemap.ts`, `redirects.ts`, and the approval queue. Returns
 * the list of problems; an empty list means the record is well-formed and
 * complete. The production build treats any non-empty result as fatal.
 */
export function validateSeoAndRedirectAudit(
  topics: readonly SeoTopic[] = seoTopics,
  facts: SeoFacts = seoFacts,
  required: readonly RequiredRedirect[] = REQUIRED_REDIRECTS,
): string[] {
  const errors: string[] = [];

  // --- Topics: exactly the §17.11 set, in order, well-formed. ---
  const ids = topics.map((t) => t.id);
  if (
    ids.length !== REQUIRED_TOPIC_IDS.length ||
    ids.some((id, i) => id !== REQUIRED_TOPIC_IDS[i])
  ) {
    errors.push(
      `SEO topics must be exactly [${REQUIRED_TOPIC_IDS.join(", ")}] in that order, found [${ids.join(", ")}].`,
    );
  }

  const queueIds = new Set(approvalQueue.map((q: QueueItem) => q.id));
  const seen = new Set<SeoTopicId>();
  for (const topic of topics) {
    if (seen.has(topic.id)) {
      errors.push(`Duplicate SEO topic "${topic.id}".`);
    }
    seen.add(topic.id);

    if (!topic.title.trim()) {
      errors.push(`SEO topic "${topic.id}" is missing a title.`);
    }
    if (!topic.statement.trim()) {
      errors.push(`SEO topic "${topic.id}" is missing a statement.`);
    }
    if (hasDraftMarker(topic.statement)) {
      errors.push(`SEO topic "${topic.id}" statement still contains a draft marker.`);
    }
    if (topic.governingReview && !queueIds.has(topic.governingReview)) {
      errors.push(
        `SEO topic "${topic.id}" links review item "${topic.governingReview}", which is not in the approval queue.`,
      );
    }
  }

  // --- Facts: exactly the live config, so the doc cannot drift. ---
  if (facts.canonicalOrigin !== SITE_ORIGIN) {
    errors.push(
      `Documented canonical origin "${facts.canonicalOrigin}" must be exactly siteMeta.ts's SITE_ORIGIN "${SITE_ORIGIN}".`,
    );
  }
  if (facts.defaultTitle !== DEFAULT_TITLE) {
    errors.push(
      `Documented default title "${facts.defaultTitle}" must be exactly siteMeta.ts's DEFAULT_TITLE "${DEFAULT_TITLE}".`,
    );
  }
  if (facts.defaultDescription !== DEFAULT_DESCRIPTION) {
    errors.push(
      "Documented default description must be exactly siteMeta.ts's DEFAULT_DESCRIPTION.",
    );
  }
  if (!sameSet(facts.indexableRoutes, INDEXABLE_ROUTES)) {
    errors.push(
      `Documented indexable routes [${facts.indexableRoutes.join(", ")}] must be exactly sitemap.ts's INDEXABLE_ROUTES [${INDEXABLE_ROUTES.join(", ")}].`,
    );
  }
  if (facts.sitemapUrl !== SITEMAP_URL) {
    errors.push(
      `Documented sitemap URL "${facts.sitemapUrl}" must be exactly sitemap.ts's SITEMAP_URL "${SITEMAP_URL}".`,
    );
  }

  // --- robots.txt actually advertises the sitemap and allows crawling. ---
  const robots = renderRobotsTxt();
  if (!robots.includes(`Sitemap: ${facts.sitemapUrl}`)) {
    errors.push(
      `robots.txt does not advertise the documented sitemap URL "${facts.sitemapUrl}".`,
    );
  }
  if (!/^Allow:\s*\/$/m.test(robots)) {
    errors.push("robots.txt does not allow site-wide crawling (`Allow: /`).");
  }

  // --- sitemap lists the canonical homepage and omits the noindex 404. ---
  const sitemap = renderSitemapXml();
  if (!sitemap.includes(`<loc>${canonicalUrl("/")}</loc>`)) {
    errors.push("sitemap.xml does not list the canonical homepage URL.");
  }
  if (sitemap.includes("/404")) {
    errors.push("sitemap.xml must not list the noindex 404 page.");
  }

  // --- Launch redirects: each must be a real rule in redirects.ts. ---
  if (required.length === 0) {
    errors.push("At least one launch redirect (the /contact-us → / rule) must be documented.");
  }
  for (const rule of required) {
    if (!rule.reason.trim()) {
      errors.push(`Required redirect "${rule.from}" is missing a reason.`);
    }
    if (!redirectExists(rule)) {
      errors.push(
        `Documented launch redirect "${rule.from} → ${rule.to} (${rule.status})" is not present in redirects.ts.`,
      );
    }
  }
  // The one redirect the plan mandates (P7-009) must be among them.
  if (!required.some((r) => r.from === "/contact-us" && r.to === "/" && r.status === 301)) {
    errors.push(
      "The mandatory /contact-us → / (301) redirect (P7-009) is missing from the required-redirects list.",
    );
  }

  // --- Schema markup: the documented structured data must pass P7-004. ---
  errors.push(...validateStructuredData(structuredDataGraph()));

  // --- Review state may not outrun the standing launch review. ---
  const review = approvalQueue.find((q: QueueItem) => q.id === GOVERNING_REVIEW_ID);
  if (!review) {
    errors.push(
      `Governing review item "${GOVERNING_REVIEW_ID}" is missing from the approval queue.`,
    );
  } else if (SEO_AUDIT_REVIEW.status === "approved" && review.status !== "approved") {
    errors.push(
      `R-010 is marked approved but its governing launch review ${GOVERNING_REVIEW_ID} is still ${review.status}.`,
    );
  }

  return errors;
}

/**
 * Assert the R-010 record is valid and complete, throwing on failure. Intended
 * for build time so a documented canonical origin/title/description that has
 * drifted from `siteMeta.ts`, an indexable-route or sitemap mismatch, a launch
 * redirect missing from `redirects.ts`, forbidden schema markup, or a record
 * claiming sign-off ahead of the launch review fails the build.
 */
export function assertSeoAndRedirectAuditValid(
  topics: readonly SeoTopic[] = seoTopics,
  facts: SeoFacts = seoFacts,
  required: readonly RequiredRedirect[] = REQUIRED_REDIRECTS,
): void {
  const errors = validateSeoAndRedirectAudit(topics, facts, required);
  if (errors.length > 0) {
    throw new Error(`Invalid SEO and redirect audit:\n- ${errors.join("\n- ")}`);
  }
}

const DOC_COMMENT =
  "<!-- Generated from src/config/seoAndRedirectAudit.ts — do not edit by hand. -->";

/**
 * Render the exact markdown text of `docs/research/seo-and-redirect-audit.md`
 * from this model. `seoAndRedirectAudit.test.ts` asserts the committed file still
 * matches, so the printable R-010 record cannot drift from the code. Ends with a
 * trailing newline.
 */
export function renderSeoAndRedirectAuditDoc(
  topics: readonly SeoTopic[] = seoTopics,
  facts: SeoFacts = seoFacts,
  required: readonly RequiredRedirect[] = REQUIRED_REDIRECTS,
): string {
  const lines: string[] = [
    "# SEO and redirect audit (R-010)",
    "",
    DOC_COMMENT,
    "",
    "**Plan references:** §17.11 R-010, §7 (routes), P7-001 (metadata), P7-002 (canonical domain), P7-003 (social preview), P7-004 (structured data), P7-009 (redirects), §24 (“sitemap and robots are correct”).",
    `**Review status:** ${SEO_AUDIT_REVIEW.status} — this document is the plan's working baseline; the final metadata copy (P7-001) and the social-preview artwork (P7-003) are part of the standing launch review (${GOVERNING_REVIEW_ID}), and this record may only be marked approved once that review clears.`,
    "",
    "The rebuild's SEO surface ships across `siteMeta.ts` (canonical origin,",
    "title/description, structured data), `sitemap.ts` (robots + sitemap), and",
    "`redirects.ts` (the `/contact-us` redirect). This record is the R-010 audit",
    "over those pieces; its facts are cross-checked against that config at build",
    "time so the audit can never drift from the code the site actually ships.",
    "",
    "## Fixed configuration",
    "",
    `- **Canonical origin:** ${facts.canonicalOrigin}`,
    `- **Default title:** ${facts.defaultTitle}`,
    `- **Default description:** ${facts.defaultDescription}`,
    `- **Indexable routes:** ${facts.indexableRoutes.join(", ")}`,
    `- **Sitemap URL:** ${facts.sitemapUrl}`,
    "",
    "## Audit",
    "",
  ];

  for (const topic of topics) {
    lines.push(
      `### ${topic.title}`,
      "",
      topic.statement,
      "",
      `- **Governing review:** ${topic.governingReview ?? "none"}`,
      "",
    );
  }

  lines.push("## Redirects required at launch", "");
  for (const rule of required) {
    lines.push(`- \`${rule.from} → ${rule.to} (${rule.status})\` — ${rule.reason}`);
  }
  lines.push("");

  return lines.join("\n") + "\n";
}
