# Current-site audit (R-001)

<!-- Generated from src/config/currentSiteAudit.ts — do not edit by hand. -->

**Plan references:** §17.2 R-001, §5 (fixed requirements), §7 (information architecture), §16 (visual system), §27 (exact next actions 3–4).
**Review status:** pending — this document is the plan's working baseline; the final visual fidelity and design sign-off (§16, §24) are part of the standing launch review (Q-0009-launch-review), and this record may only be marked approved once that review clears.

R-001 is the first Phase 1 research task and the foundation the plan says
every visual decision rests on: “Do not begin final styling until this audit
exists.” It records what the live Webflow site does and how the rebuild
reinterprets each aspect. Its facts are cross-checked against the live config
at build time so the audit can never drift from the code the site actually
ships.

Full-page live-site screenshots (desktop 1440×900, large desktop 1920×1080,
tablet 768×1024, mobile 390×844, small mobile 320×568) are binary capture
artefacts stored under `docs/research/current-site/` and gathered during the
live-site crawl (§10.1); they are not committed as part of this generated
record.

## Cross-checked configuration

- **Rebuild section order:** top → work → how-we-work → fit → contact
- **Core brand colours:** --color-helix-mint `#5affba`, --color-helix-ink `#231f20`, --color-white `#ffffff`
- **Removed brands:** Awayco, Perion, Synaptico
- **Rebuild indexable routes:** /
- **Rebuild site title:** Helix Collective — Enterprise Value Growth Partner

## Audit

### Page sections and order

The live Webflow homepage runs an oversized hero, a four-metric proof strip (`50+ ventures`, `$500m`, a human count, `10+ years`), a broad logo strip, case-study panels (including Xylo), a merged differentiation/process block, a flattened flowchart image, and a split build/invest CTA. The rebuild reorders this into the §7 sequence — header, enterprise-value hero, two-metric proof banner, accessible logo marquee, five case studies, a separate “We're different because…” manifesto, a distinct four-stage “How we work” section, the interactive fit qualifier, one closing CTA, and an institutional footer — anchored by `navigation.ts`'s `HOMEPAGE_SECTION_IDS` so the story order is a single source of truth.

- **Governing review:** none

### Header behaviour

The live header carries a team link and an “invest in our ventures” action alongside the logo. The rebuild strips both (§5 institutional positioning, §8.1): a restrained header with the Helix logo, an optional anchor nav for Work / How we work / Fit, and one primary CTA using the globally approved label. On narrow screens it stays a compact anchor menu rather than a complex drawer.

- **Governing review:** none

### Breakpoints

The audit records the live site's responsive breakpoints so the rebuild's testing matrix (§8.3: 320, 390, 768, 1024, 1440, 1920) covers every layout change. The rebuild's own breakpoint tokens live in `designTokens.ts` (R-002); this record captures the live reference points rather than re-deriving the design system.

- **Governing review:** none

### Max-widths

The live site's container max-widths and gutters are recorded here as the reference for the rebuild's page-container primitive (P3-004). The rebuild expresses its own container widths as design tokens (R-002); the audit's role is to note where the live layout constrains content so the rebuild's rhythm reads as recognisably Helix (§24).

- **Governing review:** none

### Spacing rhythm

The live site uses generous vertical rhythm between oversized statements. The rebuild preserves that confident, spacious cadence (§16.4) via the spacing scale in `designTokens.ts`, avoiding the tight, card-dense SaaS look §16.4 explicitly bars.

- **Governing review:** none

### Typography

The live site pairs oversized, high-impact uppercase display headings with clean, legible body copy. The audit records the exact heading/body families, weights, letter-spacing, and line-heights, and — critically — whether each font is local, hosted, or licensed through Webflow, because §16.3 and D-010 forbid self-hosting a commercial font without a valid licence. The rebuild's type tokens and the font-rights decision are tracked in R-002 and D-010; this record captures the source-of-truth measurements.

- **Governing review:** none

### Colour usage

A current Helix brand asset uses mint `#5affba`, ink `#231f20`, and white (§16.1, §28). The rebuild recreates that identity in code as `REQUIRED_BRAND_COLORS` in `designTokens.ts` and derives supporting neutrals from ink and white (§16.2) rather than introducing unrelated brand colours. Computed live-site colours must be re-confirmed in browser dev tools before the tokens are locked.

- **Governing review:** none

### Logo marquee behaviour

The live site scrolls a broad client/venture logo strip. The rebuild keeps the sense of institutional proof but makes it accessible (§8.4): local optimised assets (never Webflow-CDN hotlinks), an `aria-hidden` duplicate set for the infinite scroll, a static wrapped grid under `prefers-reduced-motion`, and keyboard-accessible small-screen scrolling. Awayco, Perion, and Synaptico are removed from the strip (§5); `logos.ts`'s `REMOVED_BRANDS` enforces their absence.

- **Governing review:** none

### Hover and focus states

The audit records the live site's hover and focus treatments so the rebuild can preserve the brand's interactive character while meeting WCAG 2.2 AA (§16.6, P7-005): every interactive element gets a visible focus state, no meaning is communicated by colour alone, and no copy is hidden behind hover-only reveals (§11.6, §12.4).

- **Governing review:** none

### Animation timing

The live site animates the logo marquee, section reveals, and the qualification path. The rebuild keeps restrained motion (§16.6) — one shared easing/duration scale (P3-005) in `designTokens.ts` — and every animation has a reduced-motion alternative, so nothing essential depends on movement.

- **Governing review:** none

### Border radii

The live case-study visuals and shapes use rounded corners. The audit records the observed radii so the rebuild's radius scale (R-002) reproduces the brand's rounded, organic feel (§16.4) rather than sharp corporate rectangles.

- **Governing review:** none

### Image treatment

The live site mixes product, environment, and — in the removed “humans” section — people photography. The rebuild uses product/system/environment/outcome imagery only, never portraits or stock people (§16.4/§16.5), routes everything through Astro's local image pipeline with responsive sizes and set dimensions (P7-007), and records each image's rights in the asset register (R-008). Existing Webflow imagery may be used only after it is downloaded into the repository and its rights are confirmed.

- **Governing review:** none

### Footer and legal content

The live footer carries an investment CTA, team references, and a human count. The rebuild's footer establishes institutional legitimacy without people (§14): logo, legally accurate location(s), legal entity name and ABN, approved social links, and an approved email fallback. The pending institutional-identity facts (legal entity, ABN, registered office) publish in tracked draft form under queue item Q-0010.

- **Governing review:** Q-0010-footer-identity

### Existing routes

The live site indexes the homepage `/` and a separate `/contact-us` page (§28). The rebuild is one coherent single-page story (§7), so it ships one indexable route — `/` — plus a `noindex` `/404` page. The retired `/contact-us` route is preserved as a permanent (301) redirect to `/` in `redirects.ts`, so existing inbound links survive the migration.

- **Governing review:** none

### Existing third-party scripts

The audit inventories every third-party script the live Webflow build injects (Webflow runtime, embeds, any tag manager) so none is carried over blindly. The rebuild ships static HTML with a single React island for the fit qualifier and no third-party iframe on initial load (§18.2, P7-006); any external dependency must be reviewed before a Content Security Policy is written (P7-008).

- **Governing review:** none

### Analytics tags

The audit records the live site's current analytics/tag-manager tags. The rebuild's launch analytics decision is D-011 (documented in R-011); measurement flows through a no-op-safe adapter whose event set is fixed and PII-free (no names, emails, free text, or revenue figures). This topic captures what exists today; R-011 governs what ships.

- **Governing review:** none

### Forms

The live `/contact-us` page carries a contact form. §4 bars a custom lead-capture form and backend, so the rebuild ships no form: the single conversion action is an outbound link to the approved Calendly booking page (§13, R-009), with a visible email fallback in the footer (D-006).

- **Governing review:** none

### Social links

The audit records the live site's social links. The rebuild carries only approved social links in the institutional footer (§14) — LinkedIn plus any owner-approved link — and never reintroduces founder/personal profiles that would reopen the people-led narrative §5 removes.

- **Governing review:** none

### Metadata

The audit records the live site's title, description, and social-preview metadata. The rebuild ships the working title “Helix Collective — Enterprise Value Growth Partner” and the approved-proposition description from `siteMeta.ts` (P7-001), both confirmed by the standing launch review before cutover. The full metadata/redirect surface is audited in detail in R-010.

- **Governing review:** Q-0009-launch-review

### Robots and sitemap behaviour

The audit records the live Webflow-managed robots and sitemap behaviour, which the rebuild replaces wholesale at cutover: `robots.txt` and `sitemap.xml` are generated from `sitemap.ts` (allow site-wide, advertise one absolute sitemap URL, list only indexable canonical routes, omit the `noindex` 404). The detailed rules and their build-time cross-checks live in R-010.

- **Governing review:** none

