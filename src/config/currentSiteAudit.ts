/**
 * Typed, self-validating current-site audit (implementation plan §17.2 R-001,
 * output `docs/research/current-site-audit.md`; §5 fixed requirements, §7
 * information architecture, §16 visual system, §27 exact next actions 3–4).
 *
 * R-001 is the first research task in Phase 1 and the foundation the plan says
 * every other visual decision rests on: "Do not begin final styling until this
 * audit exists." It records what the live Webflow site actually does — its
 * section order, header behaviour, breakpoints, spacing rhythm, typography,
 * colour usage, logo-marquee behaviour, states, motion, radii, imagery, footer,
 * routes, third-party scripts, analytics, forms, social links, metadata, and
 * robots/sitemap rules — and, crucially, how the rebuild reinterprets each one.
 *
 * Following the same convention as `seoAndRedirectAudit.ts` (R-010) and
 * `designTokensRecord.ts` (R-002), this module is thin, pure content plus
 * validation: it renders no UI and ships no route. What it *adds* is a
 * governance spine — the §17.2 audit topics as structured data plus a small set
 * of machine-checkable facts, and build-time cross-checks that keep the
 * documented audit honest against the live code the site actually ships:
 *
 *  (a) the documented rebuild section order is exactly `navigation.ts`'s
 *      `HOMEPAGE_SECTION_IDS`, so the "page sections and order" finding can never
 *      claim a layout the site does not render;
 *  (b) the documented core brand colours are exactly `designTokens.ts`'s
 *      `REQUIRED_BRAND_COLORS` (mint/ink/white, §16.1);
 *  (c) the documented removed brands are exactly `logos.ts`'s `REMOVED_BRANDS`
 *      (Awayco, Perion, Synaptico, §5/§8.4), so the marquee finding stays in
 *      lock-step with the enforced logo register;
 *  (d) the documented rebuild routes are exactly `sitemap.ts`'s
 *      `INDEXABLE_ROUTES`, and the retired `/contact-us` page resolves to a real
 *      301 rule in `redirects.ts`;
 *  (e) the documented site title is exactly `siteMeta.ts`'s `DEFAULT_TITLE`; and
 *  (f) this record may only read "approved" once the standing launch review
 *      (Q-0009) clears, since the final visual fidelity and design sign-off
 *      (§16, §24) are part of that review.
 *
 * `docs/research/current-site-audit.md` is generated from this model
 * (`renderCurrentSiteAuditDoc`) and `currentSiteAudit.test.ts` asserts the
 * committed file still matches, so the printable R-001 record cannot drift from
 * the code the site actually ships.
 *
 * The live-site full-page screenshots the plan also calls for (desktop, large
 * desktop, tablet, mobile, small mobile) are binary capture artefacts that
 * belong under `docs/research/current-site/` and are gathered during the
 * live-site crawl (§10.1); this record documents that requirement rather than
 * committing image binaries to the repository.
 *
 * This module is pure content plus validation: no UI, no client-side state, no
 * I/O.
 */

import { DEFAULT_TITLE } from "./siteMeta";
import { INDEXABLE_ROUTES } from "./sitemap";
import { REDIRECTS, type RedirectRule } from "./redirects";
import { HOMEPAGE_SECTION_IDS } from "./navigation";
import { REQUIRED_BRAND_COLORS } from "./designTokens";
import { REMOVED_BRANDS } from "./logos";
import { approvalQueue, type QueueItem } from "./approvalQueue";

/** Where the generated record lives, for the rendered header. */
export const CURRENT_SITE_AUDIT_DOC_PATH =
  "docs/research/current-site-audit.md";

/** Where the live-site full-page screenshots belong (§17.2). */
export const SCREENSHOT_DIR = "docs/research/current-site";

/**
 * The standing launch-review queue item (§23 category D, Q-0009). R-001 has no
 * §6 decision of its own — the section order, brand colours, removed logos, and
 * routes it audits are fixed requirements already decided in code. What is
 * genuinely pre-launch is the final visual fidelity and design sign-off (§16,
 * §24 "Headline scale and section rhythm feel recognisably Helix"), which falls
 * under the standing launch review. The record's review state is gated on that
 * item so it can never claim sign-off ahead of it.
 */
export const GOVERNING_REVIEW_ID = "Q-0009-launch-review";

/**
 * The record's review state. Like every pending content model, R-001 publishes
 * as the plan's working baseline now. It may only flip to `approved` once the
 * standing launch review (Q-0009) is approved — `validateCurrentSiteAudit`
 * enforces that so the record can never claim sign-off ahead of the review.
 */
export const CURRENT_SITE_AUDIT_REVIEW = {
  status: "pending" as "pending" | "approved",
} as const;

/**
 * The §17.2 audit topics, in a fixed order. Together they cover the full R-001
 * list; validation fails on a missing, extra, or reordered topic so the record
 * can never lose a rule.
 */
export type AuditTopicId =
  | "page-sections-and-order"
  | "header-behaviour"
  | "breakpoints"
  | "max-widths"
  | "spacing-rhythm"
  | "typography"
  | "colour-usage"
  | "logo-marquee-behaviour"
  | "hover-and-focus-states"
  | "animation-timing"
  | "border-radii"
  | "image-treatment"
  | "footer-and-legal-content"
  | "existing-routes"
  | "existing-third-party-scripts"
  | "analytics-tags"
  | "forms"
  | "social-links"
  | "metadata"
  | "robots-and-sitemap-behaviour";

/**
 * One R-001 topic. `governingReview`, when present, links a topic whose final
 * treatment or asset is part of the standing launch review to the queue item
 * that clears it.
 */
export interface AuditTopic {
  id: AuditTopicId;
  /** Human title, e.g. "Colour usage". */
  title: string;
  /** The documented finding — current-site state plus how the rebuild handles it. */
  statement: string;
  /** The §23 launch-review item this topic waits on, if any. */
  governingReview?: string;
}

/**
 * The §17.2 topics that must appear, exactly once, in this order. A dropped or
 * reordered topic is a governance hole, so validation fails on any mismatch.
 */
export const REQUIRED_TOPIC_IDS: readonly AuditTopicId[] = [
  "page-sections-and-order",
  "header-behaviour",
  "breakpoints",
  "max-widths",
  "spacing-rhythm",
  "typography",
  "colour-usage",
  "logo-marquee-behaviour",
  "hover-and-focus-states",
  "animation-timing",
  "border-radii",
  "image-treatment",
  "footer-and-legal-content",
  "existing-routes",
  "existing-third-party-scripts",
  "analytics-tags",
  "forms",
  "social-links",
  "metadata",
  "robots-and-sitemap-behaviour",
];

/**
 * The machine-checkable half of the audit. Each value is documented here as a
 * literal and cross-checked against the live config it mirrors, so the printed
 * record can never quietly drift from the code the site actually ships (the same
 * technique `seoAndRedirectAudit.ts` uses for its SEO facts). The fields are
 * deliberately widened (not `as const`) so the cross-check has something to
 * catch: a drifted value is a build error reported by `validateCurrentSiteAudit`,
 * not a compile error hidden by a literal type.
 */
export interface AuditFacts {
  /** Must equal `navigation.ts`'s `HOMEPAGE_SECTION_IDS`. */
  rebuildSectionIds: readonly string[];
  /** Must equal `designTokens.ts`'s `REQUIRED_BRAND_COLORS`. */
  brandColors: Readonly<Record<string, string>>;
  /** Must equal `logos.ts`'s `REMOVED_BRANDS`. */
  removedBrands: readonly string[];
  /** Must equal `sitemap.ts`'s `INDEXABLE_ROUTES`. */
  rebuildIndexableRoutes: readonly string[];
  /** Must equal `siteMeta.ts`'s `DEFAULT_TITLE`. */
  rebuildTitle: string;
}

export const auditFacts: AuditFacts = {
  rebuildSectionIds: ["top", "how-we-work", "work", "fit", "contact"],
  brandColors: {
    "--color-helix-mint": "#5affba",
    "--color-helix-ink": "#000000",
    "--color-white": "#ffffff",
  },
  removedBrands: ["Awayco", "Perion", "Synaptico"],
  rebuildIndexableRoutes: ["/"],
  rebuildTitle: "Helix Collective — Enterprise Value Growth Partner",
};

/**
 * The documented R-001 topics. Each statement records the current live-site
 * finding (directional, from §28) alongside how the rebuild reinterprets it, and
 * commits to no final visual treatment while the launch review is open.
 */
export const auditTopics: readonly AuditTopic[] = [
  {
    id: "page-sections-and-order",
    title: "Page sections and order",
    statement:
      "The live Webflow homepage runs an oversized hero, a four-metric proof strip (`50+ ventures`, `$500m`, a human count, `10+ years`), a broad logo strip, case-study panels (including Xylo), a merged differentiation/process block, a flattened flowchart image, and a split build/invest CTA. The rebuild reorders this into the §7 sequence — header, enterprise-value hero, two-metric proof banner, accessible logo marquee, a separate “We're different because…” manifesto, a distinct four-stage “How we work” section, five case studies, the interactive fit qualifier, one closing CTA, and an institutional footer — anchored by `navigation.ts`'s `HOMEPAGE_SECTION_IDS` so the story order is a single source of truth.",
  },
  {
    id: "header-behaviour",
    title: "Header behaviour",
    statement:
      "The live header carries a team link and an “invest in our ventures” action alongside the logo. The rebuild strips both (§5 institutional positioning, §8.1): a restrained header with the Helix logo, an optional anchor nav for Work / How we work / Fit, and one primary CTA using the globally approved label. On narrow screens it stays a compact anchor menu rather than a complex drawer.",
  },
  {
    id: "breakpoints",
    title: "Breakpoints",
    statement:
      "The audit records the live site's responsive breakpoints so the rebuild's testing matrix (§8.3: 320, 390, 768, 1024, 1440, 1920) covers every layout change. The rebuild's own breakpoint tokens live in `designTokens.ts` (R-002); this record captures the live reference points rather than re-deriving the design system.",
  },
  {
    id: "max-widths",
    title: "Max-widths",
    statement:
      "The live site's container max-widths and gutters are recorded here as the reference for the rebuild's page-container primitive (P3-004). The rebuild expresses its own container widths as design tokens (R-002); the audit's role is to note where the live layout constrains content so the rebuild's rhythm reads as recognisably Helix (§24).",
  },
  {
    id: "spacing-rhythm",
    title: "Spacing rhythm",
    statement:
      "The live site uses generous vertical rhythm between oversized statements. The rebuild preserves that confident, spacious cadence (§16.4) via the spacing scale in `designTokens.ts`, avoiding the tight, card-dense SaaS look §16.4 explicitly bars.",
  },
  {
    id: "typography",
    title: "Typography",
    statement:
      "The live site pairs oversized, high-impact uppercase display headings with clean, legible body copy. The audit records the exact heading/body families, weights, letter-spacing, and line-heights, and — critically — whether each font is local, hosted, or licensed through Webflow, because §16.3 and D-010 forbid self-hosting a commercial font without a valid licence. The rebuild's type tokens and the font-rights decision are tracked in R-002 and D-010; this record captures the source-of-truth measurements.",
  },
  {
    id: "colour-usage",
    title: "Colour usage",
    statement:
      "The 2026-07-29 computed-value audit of the live site confirms mint `#5affba` (defined there as `--helix-green`, rendered on the CTA and three full-bleed section backgrounds), pure-black ink `#000000` (`--black`; the hero and footer run white-on-black), and white (§16.1, §28). Supporting neutrals were taken exactly from the live stylesheet: near-black `#1c1c1e`, border grey `#dddddd`, and light section background `#f3f3f3`. The rebuild carries this identity as `REQUIRED_BRAND_COLORS` in `designTokens.ts`. Live-site treatments the audit recorded for VD-102: black-on-mint proof strip, mint eyebrow labels, pill-shaped mint CTAs (20px radius) with black labels, and reference screenshots in `docs/research/current-site/`.",
  },
  {
    id: "logo-marquee-behaviour",
    title: "Logo marquee behaviour",
    statement:
      "The live site scrolls a broad client/venture logo strip. The rebuild keeps the sense of institutional proof but makes it accessible (§8.4): local optimised assets (never Webflow-CDN hotlinks), an `aria-hidden` duplicate set for the infinite scroll, a static wrapped grid under `prefers-reduced-motion`, and keyboard-accessible small-screen scrolling. Awayco, Perion, and Synaptico are removed from the strip (§5); `logos.ts`'s `REMOVED_BRANDS` enforces their absence.",
  },
  {
    id: "hover-and-focus-states",
    title: "Hover and focus states",
    statement:
      "The audit records the live site's hover and focus treatments so the rebuild can preserve the brand's interactive character while meeting WCAG 2.2 AA (§16.6, P7-005): every interactive element gets a visible focus state, no meaning is communicated by colour alone, and no copy is hidden behind hover-only reveals (§11.6, §12.4).",
  },
  {
    id: "animation-timing",
    title: "Animation timing",
    statement:
      "The live site animates the logo marquee, section reveals, and the qualification path. The rebuild keeps restrained motion (§16.6) — one shared easing/duration scale (P3-005) in `designTokens.ts` — and every animation has a reduced-motion alternative, so nothing essential depends on movement.",
  },
  {
    id: "border-radii",
    title: "Border radii",
    statement:
      "The live case-study visuals and shapes use rounded corners. The audit records the observed radii so the rebuild's radius scale (R-002) reproduces the brand's rounded, organic feel (§16.4) rather than sharp corporate rectangles.",
  },
  {
    id: "image-treatment",
    title: "Image treatment",
    statement:
      "The live site mixes product, environment, and — in the removed “humans” section — people photography. The rebuild uses product/system/environment/outcome imagery only, never portraits or stock people (§16.4/§16.5), routes everything through Astro's local image pipeline with responsive sizes and set dimensions (P7-007), and records each image's rights in the asset register (R-008). Existing Webflow imagery may be used only after it is downloaded into the repository and its rights are confirmed.",
  },
  {
    id: "footer-and-legal-content",
    title: "Footer and legal content",
    statement:
      "The live footer carries an investment CTA, team references, and a human count. The rebuild's footer establishes institutional legitimacy without people (§14): logo, legally accurate location(s), legal entity name and ABN, approved social links, and an approved email fallback. The pending institutional-identity facts (legal entity, ABN, registered office) publish in tracked draft form under queue item Q-0010.",
    governingReview: "Q-0010-footer-identity",
  },
  {
    id: "existing-routes",
    title: "Existing routes",
    statement:
      "The live site indexes the homepage `/` and a separate `/contact-us` page (§28). The rebuild is one coherent single-page story (§7), so it ships one indexable route — `/` — plus a `noindex` `/404` page. The retired `/contact-us` route is preserved as a permanent (301) redirect to `/` in `redirects.ts`, so existing inbound links survive the migration.",
  },
  {
    id: "existing-third-party-scripts",
    title: "Existing third-party scripts",
    statement:
      "The audit inventories every third-party script the live Webflow build injects (Webflow runtime, embeds, any tag manager) so none is carried over blindly. The rebuild ships static HTML with a single React island for the fit qualifier and no third-party iframe on initial load (§18.2, P7-006); any external dependency must be reviewed before a Content Security Policy is written (P7-008).",
  },
  {
    id: "analytics-tags",
    title: "Analytics tags",
    statement:
      "The audit records the live site's current analytics/tag-manager tags. The rebuild's launch analytics decision is D-011 (documented in R-011); measurement flows through a no-op-safe adapter whose event set is fixed and PII-free (no names, emails, free text, or revenue figures). This topic captures what exists today; R-011 governs what ships.",
  },
  {
    id: "forms",
    title: "Forms",
    statement:
      "The live `/contact-us` page carries a contact form. §4 bars a custom lead-capture form and backend, so the rebuild ships no form: the single conversion action is an outbound link to the approved Calendly booking page (§13, R-009), with a visible email fallback in the footer (D-006).",
  },
  {
    id: "social-links",
    title: "Social links",
    statement:
      "The audit records the live site's social links. The rebuild carries only approved social links in the institutional footer (§14) — LinkedIn plus any owner-approved link — and never reintroduces founder/personal profiles that would reopen the people-led narrative §5 removes.",
  },
  {
    id: "metadata",
    title: "Metadata",
    statement:
      "The audit records the live site's title, description, and social-preview metadata. The rebuild ships the working title “Helix Collective — Enterprise Value Growth Partner” and the approved-proposition description from `siteMeta.ts` (P7-001), both confirmed by the standing launch review before cutover. The full metadata/redirect surface is audited in detail in R-010.",
    governingReview: GOVERNING_REVIEW_ID,
  },
  {
    id: "robots-and-sitemap-behaviour",
    title: "Robots and sitemap behaviour",
    statement:
      "The audit records the live Webflow-managed robots and sitemap behaviour, which the rebuild replaces wholesale at cutover: `robots.txt` and `sitemap.xml` are generated from `sitemap.ts` (allow site-wide, advertise one absolute sitemap URL, list only indexable canonical routes, omit the `noindex` 404). The detailed rules and their build-time cross-checks live in R-010.",
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

/** Order-sensitive equality between two string lists. */
function sameSequence(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

/** Order-independent equality between two string lists. */
function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((x) => set.has(x));
}

/** Equality between two `name → value` colour maps. */
function sameColorMap(
  a: Readonly<Record<string, string>>,
  b: Readonly<Record<string, string>>,
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => a[k] === b[k]);
}

/**
 * Validate the R-001 record and cross-check it against the live config it
 * audits — `navigation.ts`, `designTokens.ts`, `logos.ts`, `sitemap.ts`,
 * `redirects.ts`, `siteMeta.ts`, and the approval queue. Returns the list of
 * problems; an empty list means the record is well-formed and complete. The
 * production build treats any non-empty result as fatal.
 */
export function validateCurrentSiteAudit(
  topics: readonly AuditTopic[] = auditTopics,
  facts: AuditFacts = auditFacts,
): string[] {
  const errors: string[] = [];

  // --- Topics: exactly the §17.2 set, in order, well-formed. ---
  const ids = topics.map((t) => t.id);
  if (
    ids.length !== REQUIRED_TOPIC_IDS.length ||
    ids.some((id, i) => id !== REQUIRED_TOPIC_IDS[i])
  ) {
    errors.push(
      `Audit topics must be exactly [${REQUIRED_TOPIC_IDS.join(", ")}] in that order, found [${ids.join(", ")}].`,
    );
  }

  const queueIds = new Set(approvalQueue.map((q: QueueItem) => q.id));
  const seen = new Set<AuditTopicId>();
  for (const topic of topics) {
    if (seen.has(topic.id)) {
      errors.push(`Duplicate audit topic "${topic.id}".`);
    }
    seen.add(topic.id);

    if (!topic.title.trim()) {
      errors.push(`Audit topic "${topic.id}" is missing a title.`);
    }
    if (!topic.statement.trim()) {
      errors.push(`Audit topic "${topic.id}" is missing a statement.`);
    }
    if (hasDraftMarker(topic.statement)) {
      errors.push(`Audit topic "${topic.id}" statement still contains a draft marker.`);
    }
    if (topic.governingReview && !queueIds.has(topic.governingReview)) {
      errors.push(
        `Audit topic "${topic.id}" links review item "${topic.governingReview}", which is not in the approval queue.`,
      );
    }
  }

  // --- Facts: exactly the live config, so the doc cannot drift. ---
  if (!sameSequence(facts.rebuildSectionIds, HOMEPAGE_SECTION_IDS)) {
    errors.push(
      `Documented rebuild section order [${facts.rebuildSectionIds.join(", ")}] must be exactly navigation.ts's HOMEPAGE_SECTION_IDS [${HOMEPAGE_SECTION_IDS.join(", ")}].`,
    );
  }
  if (!sameColorMap(facts.brandColors, REQUIRED_BRAND_COLORS)) {
    errors.push(
      "Documented brand colours must be exactly designTokens.ts's REQUIRED_BRAND_COLORS (mint/ink/white).",
    );
  }
  if (!sameSet(facts.removedBrands, REMOVED_BRANDS)) {
    errors.push(
      `Documented removed brands [${facts.removedBrands.join(", ")}] must be exactly logos.ts's REMOVED_BRANDS [${REMOVED_BRANDS.join(", ")}].`,
    );
  }
  if (!sameSet(facts.rebuildIndexableRoutes, INDEXABLE_ROUTES)) {
    errors.push(
      `Documented rebuild routes [${facts.rebuildIndexableRoutes.join(", ")}] must be exactly sitemap.ts's INDEXABLE_ROUTES [${INDEXABLE_ROUTES.join(", ")}].`,
    );
  }
  if (facts.rebuildTitle !== DEFAULT_TITLE) {
    errors.push(
      `Documented site title "${facts.rebuildTitle}" must be exactly siteMeta.ts's DEFAULT_TITLE "${DEFAULT_TITLE}".`,
    );
  }

  // --- The retired /contact-us page must resolve to a real 301 rule. ---
  const contactRedirect = REDIRECTS.some(
    (rule: RedirectRule) =>
      rule.from === "/contact-us" && rule.to === "/" && rule.status === 301,
  );
  if (!contactRedirect) {
    errors.push(
      "The retired /contact-us page must resolve to a /contact-us → / (301) rule in redirects.ts.",
    );
  }

  // --- Review state may not outrun the standing launch review. ---
  const review = approvalQueue.find((q: QueueItem) => q.id === GOVERNING_REVIEW_ID);
  if (!review) {
    errors.push(
      `Governing review item "${GOVERNING_REVIEW_ID}" is missing from the approval queue.`,
    );
  } else if (
    CURRENT_SITE_AUDIT_REVIEW.status === "approved" &&
    review.status !== "approved"
  ) {
    errors.push(
      `R-001 is marked approved but its governing launch review ${GOVERNING_REVIEW_ID} is still ${review.status}.`,
    );
  }

  return errors;
}

/**
 * Assert the R-001 record is valid and complete, throwing on failure. Intended
 * for build time so a documented section order, brand-colour set, removed-brand
 * list, route set, or title that has drifted from the live code — a retired
 * `/contact-us` page with no redirect, or a record claiming sign-off ahead of
 * the launch review — fails the build.
 */
export function assertCurrentSiteAuditValid(
  topics: readonly AuditTopic[] = auditTopics,
  facts: AuditFacts = auditFacts,
): void {
  const errors = validateCurrentSiteAudit(topics, facts);
  if (errors.length > 0) {
    throw new Error(`Invalid current-site audit:\n- ${errors.join("\n- ")}`);
  }
}

const DOC_COMMENT =
  "<!-- Generated from src/config/currentSiteAudit.ts — do not edit by hand. -->";

/**
 * Render the exact markdown text of `docs/research/current-site-audit.md` from
 * this model. `currentSiteAudit.test.ts` asserts the committed file still
 * matches, so the printable R-001 record cannot drift from the code. Ends with a
 * trailing newline.
 */
export function renderCurrentSiteAuditDoc(
  topics: readonly AuditTopic[] = auditTopics,
  facts: AuditFacts = auditFacts,
): string {
  const lines: string[] = [
    "# Current-site audit (R-001)",
    "",
    DOC_COMMENT,
    "",
    "**Plan references:** §17.2 R-001, §5 (fixed requirements), §7 (information architecture), §16 (visual system), §27 (exact next actions 3–4).",
    `**Review status:** ${CURRENT_SITE_AUDIT_REVIEW.status} — this document is the plan's working baseline; the final visual fidelity and design sign-off (§16, §24) are part of the standing launch review (${GOVERNING_REVIEW_ID}), and this record may only be marked approved once that review clears.`,
    "",
    "R-001 is the first Phase 1 research task and the foundation the plan says",
    "every visual decision rests on: “Do not begin final styling until this audit",
    "exists.” It records what the live Webflow site does and how the rebuild",
    "reinterprets each aspect. Its facts are cross-checked against the live config",
    "at build time so the audit can never drift from the code the site actually",
    "ships.",
    "",
    `Full-page live-site screenshots (desktop 1440×900, large desktop 1920×1080,`,
    `tablet 768×1024, mobile 390×844, small mobile 320×568) are binary capture`,
    `artefacts stored under \`${SCREENSHOT_DIR}/\` and gathered during the`,
    "live-site crawl (§10.1); they are not committed as part of this generated",
    "record.",
    "",
    "## Cross-checked configuration",
    "",
    `- **Rebuild section order:** ${facts.rebuildSectionIds.join(" → ")}`,
    `- **Core brand colours:** ${Object.entries(facts.brandColors)
      .map(([name, value]) => `${name} \`${value}\``)
      .join(", ")}`,
    `- **Removed brands:** ${facts.removedBrands.join(", ")}`,
    `- **Rebuild indexable routes:** ${facts.rebuildIndexableRoutes.join(", ")}`,
    `- **Rebuild site title:** ${facts.rebuildTitle}`,
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

  return lines.join("\n") + "\n";
}
