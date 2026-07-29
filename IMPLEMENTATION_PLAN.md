# Helix Collective Website — Remaining Work to a Fully Working Dev Site

**Status:** Active. This plan replaces the original full rebuild plan and lists *only* what is still outstanding to have the site complete and correct in local development. The full original plan (architecture rationale, copy architecture, content models, acceptance criteria, launch phases) is preserved in git history — see `git log --follow IMPLEMENTATION_PLAN.md`, in particular commits `7e967eb` (original) and `b7d1996` (approval-queue rework).

**Operating model (unchanged):** the site builds and publishes with best-available draft content; nothing blocks on approval. Every pending item is tracked in `docs/approvals/queue/` and content updates when items are approved or revised.

---

## 1. What is already done (do not redo)

- Astro + React + TypeScript scaffold; typecheck, Vitest (851 tests, 62 files), pre-commit hook, CI workflow file.
- All validated content models (`src/config/`) and all nine homepage sections rendering from them, plus 404, robots, sitemap, security headers, redirects, OG social card.
- Fit qualifier: pure state graph, accessible React UI, keyboard operation, no-JS fallback, analytics adapter.
- Build gates: forbidden copy, claims ledger, §24 acceptance criteria, performance budget, document-structure accessibility, approval-queue coverage.
- Research records R-001 through R-012 in `docs/research/`; all 12 decision files in `docs/decisions/`; 11 approval-queue items in `docs/approvals/queue/`.
- Design tokens defined in `src/config/designTokens.ts` and emitted to `src/styles/global.css` (mint `#5affba`, ink `#231f20`, white, neutrals, type scale, spacing).

## 2. What "working in dev" means here

`npm run dev` (or `npm run build && npm run preview`) serves a site that is visually on-brand, correct at every viewport from 320 px up, and complete except for content that is *deliberately* withheld pending approval (proof banner, logo marquee). Deployment, domain, and hosting are explicitly out of scope (section 6).

---

## 3. Priority 1 — Research and inputs the visual work depends on

### RW-001 — Validate the design tokens against the real brand
`docs/research/design-tokens.md` (R-002) was captured from the plan's observed values, not re-verified against the live Webflow site. Verify mint `#5affba`, ink `#231f20`, the neutral ramp, the type scale, and section rhythm against `helixcollective.com` (requires someone with browser access to the live site). Correct `src/config/designTokens.ts` where they differ. **Everything in Priority 2 consumes these values — do this first.**

### RW-002 — Capture current-site screenshots
Create `docs/research/current-site/{desktop,tablet,mobile}/` with full-page screenshots of the live site (R-001 called for these; only the written audit exists). These are the visual-fidelity reference for RW-101 and the section-by-section restyle.

### RW-003 — Decide the typeface (D-010)
`docs/decisions/0010-font-rights.md` is open, so the site renders in a system font stack. Identify the current site's typeface, confirm whether it can be licensed for self-hosting; if not, pick a metrically similar approved fallback. Record the decision, then implement in VD-103.

### RW-004 — Collect real assets
`public/` contains only a favicon and the social card. Per `docs/research/asset-register.csv`: collect client logo files (Canva, Google, 13SICK, BCG, CommBank — all currently `permission: "pending"`), any case-study imagery, and font files (after RW-003). Store approved assets locally; never hotlink Webflow. Rights confirmations flow through Q-0006.

### RW-005 — Work the open decisions that change visible copy
All 12 decision files are open and publishing their recommended defaults. The ones that alter what dev renders, in order of visible impact:
1. **D-001 currency** and **D-004 EBITA/EBITDA** — the fit-flow question wording (`A$1m–A$10m… EBITA`).
2. **D-005 capacity-no branch** — confirm the outcome copy now shipping.
3. **D-010 fonts** (see RW-003).
Record each decision in its existing file; the config models already publish defaults, so each decision is a small copy/config edit.

### RW-006 — Keep the approval queue moving (parallel, non-blocking)
The proof banner and logo marquee intentionally render **empty** until Q-0007 ($500m+ figure) and Q-0006 (logo permissions) are approved. Nothing in dev blocks on this, but the homepage is not visually complete until at least these two are resolved or their draft-safe fallbacks are approved for display. Owner action, not developer action.

---

## 4. Priority 2 — Visual design: apply the brand

The token layer exists but **no component consumes it** — every section still uses its own monochrome scoped styles, which is why the site renders black-on-white with no mint. This is the core remaining build work.

### VD-101 — Wire every component to the token system
Replace hard-coded colors, font sizes, and spacing in the scoped styles of `BaseLayout.astro`, `Header`, `Hero`, `ProofBanner`, `LogoMarquee`, `WhyHelix`, `HowWeWork`, `CaseStudies`, `Fit`/`FitQualifier`, `FinalCta`, and `Footer` with `var(--…)` tokens from `global.css`. No component-local hex values.

### VD-102 — Apply the brand color system (§16 of the original plan)
- Ink text on white as the base; mint `#5affba` as the accent: primary CTA buttons, section eyebrow labels, key highlights, and the section treatments the current site uses mint-block backgrounds for (use RW-002 screenshots as reference).
- Keep contrast AA-compliant: ink-on-mint for text on accent surfaces (mint-on-white fails contrast for text; it is a surface/graphic color, not a text color).
- Use the neutral ramp for borders and soft surfaces already defined in the tokens.

### VD-103 — Typography
Implement the RW-003 decision: self-hosted `@font-face` files in `public/fonts/` (preload critical weights, `font-display: swap`), or the chosen fallback stack, expressed through `--font-display`/`--font-body`. Verify the display scale matches the current site's headline presence.

### VD-104 — Shared primitives
Extract the repeated patterns into shared styles/components so sections stop diverging: section shell (width, padding, rhythm), primary CTA button, proof-metric figure, responsive media frame, accessible external-link treatment.

### VD-105 — Motion system
One shared easing/duration scale; marquee scroll and fit-flow transitions use it; `prefers-reduced-motion` collapses to static layout (marquee already has the static fallback pattern — verify it once logos render).

### VD-106 — Style-guide page (Phase 3 gate, kept)
Add a dev-only `/dev/style-guide` route (excluded from production builds) demonstrating every token and primitive at desktop and mobile widths. This is the acceptance gate for VD-101…VD-105.

---

## 5. Priority 3 — Defects and functional gaps in dev

### FX-201 — Mobile horizontal overflow (confirmed bug)
At a 320 px viewport the page renders 503 px wide. Culprits measured: `.site-header__cta` (extends to x=503), `.hero__cta`, `.final-cta__button` — long CTA labels never wrap or shrink. Fix (wrap, clamp, or restyle at narrow widths) and add a regression check: `document.documentElement.scrollWidth <= clientWidth` at 320 px and 375 px. Also reproduces at 375 px.

### FX-202 — Fit qualifier presentation modes — RESOLVED (2026-07-29): unified presentation stands
§12.5 of the original plan called for a desktop flowchart-style presentation and a mobile stepper. **Decision: the single accessible stepper stands for every viewport.** Rationale: (1) §12.4 requires one keyboard-operable, screen-reader-announced, no-hover-hidden surface — a second viewport-forked interactive view doubles the DOM to keep accessible and can drift from the stepper; (2) the whole-tree "flowchart" intent is already served without extra interactive DOM by the `<noscript>` fallback in `Fit.astro`, which lays every question and outcome out as a flowchart-in-prose; (3) the graph is small (four questions → five outcomes), so the stepper reads cleanly at desktop widths too. The decision is held by `src/components/fit/fitPresentation.test.ts` (interactive island reveals one question at a time; a single qualifier root with no `--desktop`/`--mobile` fork) alongside the existing `Fit.test.ts` fallback coverage. Reopen deliberately if a live-site visual pass (RW-002) shows the flowchart is load-bearing for brand fidelity.

### FX-203 — Dev environment ergonomics
- Commit a `.env.example` documenting `PUBLIC_CALENDLY_URL` (build warns and renders an unlinked CTA without it; host must be `calendly.com`).
- README quick-start: `nvm use`, `npm ci`, `npm run dev`; note the approval-queue report printed by every build and what intentionally renders empty in the meantime.

### FX-204 — Manual visual pass at the end
After VD-101…VD-106 and FX-201: re-run the full manual sweep — desktop 1440, mobile 320/375, keyboard-only fit flow, no-JS fallback, reduced motion, zero console errors — and compare against the RW-002 screenshots for brand fidelity.

---

## 6. Explicitly out of scope for "working in dev"

Preserved in the original plan (git history) and untouched by this one: GitHub remote + branch protection, Cloudflare Pages deployment and preview privacy, canonical domain / DNS cutover / Webflow rollback, Playwright e2e + axe + visual-regression suites, and completion of the approval queue itself (Q-0001…Q-0011 keep moving in parallel; the site updates as they land).

---

## 7. Suggested order of work

1. RW-001, RW-002 (unblocks all visual work) — then RW-003/RW-004 in parallel with VD-101.
2. VD-101 → VD-102 → VD-104 → VD-103 → VD-105 → VD-106.
3. FX-201 alongside VD-101 (same stylesheets).
4. RW-005 decisions and RW-006 approvals whenever owners are available — never blocking.
5. FX-202, FX-203, then FX-204 as the closing gate.
