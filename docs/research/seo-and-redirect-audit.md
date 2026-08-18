# SEO and redirect audit (R-010)

<!-- Generated from src/config/seoAndRedirectAudit.ts — do not edit by hand. -->

**Plan references:** §17.11 R-010, §7 (routes), P7-001 (metadata), P7-002 (canonical domain), P7-003 (social preview), P7-004 (structured data), P7-009 (redirects), §24 (“sitemap and robots are correct”).
**Review status:** approved — this document is the plan's working baseline; the final metadata copy (P7-001) and the social-preview artwork (P7-003) are part of the standing launch review (Q-0009-launch-review), and this record may only be marked approved once that review clears.

The rebuild's SEO surface ships across `siteMeta.ts` (canonical origin,
title/description, structured data), `sitemap.ts` (robots + sitemap), and
`redirects.ts` (the `/contact-us` redirect). This record is the R-010 audit
over those pieces; its facts are cross-checked against that config at build
time so the audit can never drift from the code the site actually ships.

## Fixed configuration

- **Canonical origin:** https://www.helixcollective.com
- **Default title:** Helix Collective — Enterprise Value Growth Partner
- **Default description:** Helix Collective partners deeply with businesses to create meaningful growth in enterprise value through product, technology and commercial execution.
- **Indexable routes:** /
- **Sitemap URL:** https://www.helixcollective.com/sitemap.xml

## Audit

### Every currently indexed route

The live Webflow site indexes the homepage `/` and a separate `/contact-us` page (§28). The rebuild is one coherent single-page story (§7), so it ships one indexable route — `/` — plus a `noindex` `/404` page that is deliberately excluded from the sitemap. `sitemap.ts`'s `INDEXABLE_ROUTES` is the single source of truth, and the generated `sitemap.xml` lists exactly it.

- **Governing review:** none

### Current title and description

The working title “Helix Collective — Enterprise Value Growth Partner” and the approved-proposition meta description ship from `siteMeta.ts` (P7-001). Both are the launch-review baseline — P7-001 marks them “Review before launch” — so their final wording is confirmed by the standing launch review before cutover.

- **Governing review:** Q-0009-launch-review

### Canonical domain

One canonical origin, `https://www.helixcollective.com` (P7-002), fixed in `siteMeta.ts` as `SITE_ORIGIN` and mirrored by `astro.config.mjs`'s `site`. Every page's `<link rel="canonical">` and every sitemap `<loc>` is built from that one origin, so the site never advertises two URLs for one page. The apex domain redirects to `www` at the Cloudflare zone (P7-002).

- **Governing review:** none

### Inbound links known to the business

The one inbound route the plan names is `/contact-us` (§28), preserved by a permanent redirect to `/`. No other inbound routes are known to the business today. Any discovered during the live-site crawl (§10.1) must be added to `redirects.ts` with an approval-queue reference, never hand-edited into `_redirects`.

- **Governing review:** none

### Contact page behaviour

The live site's `/contact-us` page folds into the single site-wide Calendly CTA — §4 bars a custom contact form and lead-capture backend. The route is retired as a page and preserved as a permanent (301) redirect to the homepage (P7-009), so existing inbound links and their accumulated SEO signal survive the migration.

- **Governing review:** none

### Current sitemap and robots rules

`robots.txt` allows crawling site-wide and advertises the one absolute sitemap URL; `sitemap.xml` lists every indexable route as an absolute canonical URL and omits the `noindex` 404. Both files are generated from `sitemap.ts` and `sitemap.test.ts` asserts the committed files still match, so neither can drift. The Webflow-managed robots/sitemap are replaced wholesale at cutover.

- **Governing review:** none

### Social-preview image

A safe brand-only Open Graph card ships in draft form (P7-003) — mint/ink/white, the approved enterprise-value proposition, no people, no figure — generated from `socialCard.ts` and rendered to `public/social/og-card.svg`, which `socialCard.test.ts` pins so the shipped artwork cannot drift. The card carries only already-published hero copy and embeds no raster, so it leaks no unapproved claim; its final designed artwork is signed off through the standing launch review.

- **Governing review:** Q-0009-launch-review

### Schema markup

Conservative `Organization` and `WebSite` JSON-LD only (P7-004), emitted as one `application/ld+json` graph from `siteMeta.ts`. No `founder`/person node, no fabricated rating, no unverified founding date or employee count, and no case-study valuation figure — `validateStructuredData` fails the build if any of those reappears, keeping the machine-readable surface consistent with the institutional-positioning and unsupported-claim rules (§4/§5).

- **Governing review:** none

### Redirects required at launch

Exactly one redirect is required at launch — `/contact-us → / (301)` (P7-009) — defined in `redirects.ts` and rendered into `public/_redirects`. Additional redirects surfaced by the live-site crawl are added to `redirects.ts` first (with an approval-queue reference) and then documented here, so the audit and the shipped rules never diverge.

- **Governing review:** none

## Redirects required at launch

- `/contact-us → / (301)` — The live site's /contact-us page folds into the single site-wide Calendly CTA (§4 bars a custom contact form). A permanent redirect preserves every existing inbound link and its accumulated SEO signal.

