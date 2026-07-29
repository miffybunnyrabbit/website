# Design-token inventory (R-002)

<!-- Generated from src/config/designTokensRecord.ts — do not edit by hand. -->

**Plan references:** §17.3 R-002, §16 Visual system, decision D-010 (font rights).
**Review status:** pending — this document is the plan's working baseline; the brand colours are observed-not-audited (§16.1) and the font families are the open §16.3 audit (D-0010-font-rights), so this record may only be marked approved once that decision is recorded.

The tokens ship from `src/config/designTokens.ts` (rendered to
`src/styles/global.css`). This record inventories every one of them and, per
§17.3, classifies where each value came from:

- **Exact** — copied unchanged from the current site's computed value.
- **Approximated** — from the current site, pending a computed-value audit (R-001).
- **New** — newly introduced for this build (a derived neutral, a scale step).
- **Licence-pending** — a safe placeholder awaiting a rights decision (the font stack, D-010).

## Token inventory

| Token | Value | Provenance | Note |
| --- | --- | --- | --- |
| `--color-helix-mint` | `#5affba` | Exact | Confirmed by the 2026-07-29 computed-value audit of the live site: defined there as `--helix-green: #5affba` and rendered on the CTA and section backgrounds as rgb(90, 255, 186). |
| `--color-helix-ink` | `#000000` | Exact | Corrected by the 2026-07-29 computed-value audit: the live site's ink is pure black (`--black: black`; body background and heading/body text compute to rgb(0, 0, 0)). The earlier #231f20 estimate appears nowhere in the live stylesheet. |
| `--color-white` | `#ffffff` | Exact | Unambiguous #ffffff; nothing to audit. |
| `--color-ink-900` | `#000000` | New | Neutral derived from the brand ink (§16.2). |
| `--color-ink-800` | `#1c1c1e` | Exact | Near-black #1c1c1e taken from the live stylesheet in the 2026-07-29 audit (§16.2). |
| `--color-ink-100` | `#dddddd` | Exact | Border/divider grey #dddddd taken from the live stylesheet in the 2026-07-29 audit (§16.2). |
| `--color-surface` | `#ffffff` | New | Page surface, set to white (§16.2). |
| `--color-surface-soft` | `#f3f3f3` | Exact | Light section background #f3f3f3 taken from the live stylesheet in the 2026-07-29 audit (§16.2). |
| `--color-accent` | `#5affba` | New | Accent alias of the brand mint (§16.2). |
| `--color-focus` | `#00a864` | New | Sample focus colour introduced for the design system; contrast-checked against white in designTokens.test.ts (§16.2). |
| `--color-text` | `#000000` | New | Body-text colour, set to the brand ink (§16.2). |
| `--font-body` | `system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif` | Licence-pending (D-0010-font-rights) | Safe system stack. The 2026-07-29 live-site audit identifies the body family as Roboto (400/500) — a Google Font — but self-hosting waits on the D-010 rights decision. |
| `--font-display` | `var(--font-body)` | Licence-pending (D-0010-font-rights) | Aliases the body stack. The 2026-07-29 live-site audit identifies the display family as Oswald 700, uppercase (h1 58/58, h2 ~40/36) — a Google Font — pending the D-010 rights decision to self-host. |
| `--font-weight-regular` | `400` | New | Standard 400 weight for the design system. |
| `--font-weight-bold` | `700` | New | Standard 700 weight for the design system. |
| `--line-height-display` | `1.05` | New | Tight display leading for oversized statements (§16.4). |
| `--line-height-heading` | `1.2` | New | Heading leading (§16.4). |
| `--line-height-body` | `1.5` | New | Comfortable body leading (§16.4). |
| `--letter-spacing-eyebrow` | `0.12em` | New | Tracking for uppercase eyebrows (§16.4). |
| `--letter-spacing-label` | `0.08em` | New | Tracking for uppercase micro-labels — progress, stage, kicker (§16.4). |
| `--letter-spacing-action` | `0.04em` | New | Tracking for bold CTAs and emphatic statements (§16.4). |
| `--font-size-xs` | `0.75rem` | New | Type-scale step: fine print, eyebrow labels (§16.4). |
| `--font-size-sm` | `0.875rem` | New | Type-scale step: small labels, legal copy (§16.4). |
| `--font-size-lg` | `1.125rem` | New | Type-scale step: lead paragraphs (§16.4). |
| `--font-size-xl` | `1.25rem` | New | Type-scale step: prompts, metric multiples (§16.4). |
| `--font-size-h3` | `clamp(1.5rem, 3.5vw, 2.25rem)` | New | Fluid type-scale step: prominent outcome numbers (§16.4). |
| `--font-size-h2` | `clamp(1.75rem, 4vw, 2.75rem)` | New | Fluid type-scale step: section headings (§16.4). |
| `--font-size-h1` | `clamp(2rem, 5vw, 3.5rem)` | New | Fluid type-scale step: hero headline (§16.4). |
| `--font-size-display` | `clamp(2.5rem, 6vw, 4rem)` | New | Fluid type-scale step: oversized proof figures (§16.4). |
| `--space-1` | `0.25rem` | New | Spacing scale step (§16.4). |
| `--space-2` | `0.5rem` | New | Spacing scale step (§16.4). |
| `--space-3` | `0.75rem` | New | Spacing scale step (§16.4). |
| `--space-4` | `1rem` | New | Spacing scale step (§16.4). |
| `--space-5` | `1.25rem` | New | Spacing scale step (§16.4). |
| `--space-6` | `1.5rem` | New | Spacing scale step (§16.4). |
| `--space-8` | `2rem` | New | Spacing scale step (§16.4). |
| `--space-10` | `2.5rem` | New | Spacing scale step (§16.4). |
| `--space-12` | `3rem` | New | Spacing scale step (§16.4). |
| `--space-16` | `4rem` | New | Spacing scale step (§16.4). |
| `--width-container` | `72rem` | New | Shared max content width (§16.4). |
| `--width-text` | `48ch` | New | Readable measure for body copy (§16.4). |
| `--radius-sm` | `0.375rem` | New | Radius scale step (§16.4). |
| `--radius-md` | `0.75rem` | New | Radius scale step (§16.4). |
| `--radius-lg` | `1.5rem` | New | Radius scale step (§16.4). |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | New | Shared easing curve for section reveal and CTA response (P3-005). |
| `--duration-fast` | `120ms` | New | Transition duration scale step (P3-005). |
| `--duration-base` | `240ms` | New | Transition duration scale step (P3-005). |
| `--duration-slow` | `480ms` | New | Transition duration scale step (P3-005). |

## Categories intentionally not tokenised (§17.3)

§17.3 also lists shadows, breakpoints, and z-index layers. The design system
introduces none of these yet; each is recorded here so the omission is tracked,
not forgotten.

- **Shadows** — The design uses flat ink/white/mint fields (§16.4), not elevation; no shadow token exists until a design need appears.
- **Breakpoints** — Sections lay out with intrinsic CSS (fluid widths, `auto-fit` grids), so there is no shared breakpoint scale to tokenise yet.
- **Z-index layers** — There is no stacked overlay, modal, or sticky header on the page, so no z-index scale is needed yet.
