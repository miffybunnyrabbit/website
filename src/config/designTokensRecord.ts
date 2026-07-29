/**
 * Typed, self-validating design-token inventory (implementation plan §17.3
 * R-002, output `docs/research/design-tokens.md`; §16 Visual system; decision
 * D-010 font rights).
 *
 * R-002 is the design-token record: the plan (§17.3) requires that every token
 * the design system ships is inventoried and, "for each token", classified by
 * provenance — is the value *exact* from the current site, *approximated* from
 * it pending a computed-value audit, *newly introduced* for this build, or a
 * *licence-pending* placeholder awaiting a rights/audit decision.
 *
 * The tokens themselves already ship: `src/config/designTokens.ts` is the single
 * source of truth for the rendered `:root` block (`src/styles/global.css`). What
 * was missing is the R-002 record that keeps every one of those tokens honest
 * about where its value came from. This module is that source of truth.
 *
 * Following the same convention as `analyticsAndPrivacy.ts` and
 * `claimsMethodology.ts`, it is thin, pure content plus validation: it renders no
 * UI and defines no token. What it *adds* is a governance spine — a provenance
 * entry for every live token, and build-time cross-checks that (a) the inventory
 * covers exactly the live `designTokens.ts` token set, so a token added to the
 * design system with no provenance (or a provenance entry for a token that no
 * longer exists) fails the build; (b) the brand colours are never mislabelled as
 * newly invented; (c) the display/body font tokens — the self-hosted Oswald/Roboto
 * families the 2026-07-29 audit identified — link the real D-010 font-rights
 * decision; and (d) this record may only read "approved" once D-010 is actually
 * decided (it is, as of 2026-07-29, so it does).
 *
 * `docs/research/design-tokens.md` is generated from this model
 * (`renderDesignTokensDoc`) and `designTokensRecord.test.ts` asserts the committed
 * file still matches, so the printable R-002 record cannot drift from the code.
 *
 * This module is pure content plus validation: no UI, no client-side state, no
 * I/O. It invents no owner decision — the font families are the self-hosted
 * Oswald/Roboto set the §16.3 / D-010 audit landed on (2026-07-29), not a guess.
 */

import { REQUIRED_BRAND_COLORS, allTokens, type DesignToken } from "./designTokens";
import { decisions, type DecisionRecord } from "./decisions";

/** Where the generated record lives, for the rendered header. */
export const DESIGN_TOKENS_DOC_PATH = "docs/research/design-tokens.md";

/** The §6 decision that governs the font tokens (D-010 font rights). */
export const GOVERNING_DECISION_ID = "D-0010-font-rights";

/** The body/display font tokens whose value the D-010 font-rights decision governs. */
export const FONT_TOKEN_NAMES: readonly string[] = ["--font-body", "--font-display"];

/**
 * The record's review state. R-002 shipped as the plan's working baseline while it
 * was pending; it now reads `approved` because the 2026-07-29 computed-value audit
 * confirmed the brand colours (§16.1) and the D-010 font-rights decision that
 * governs the font families is recorded (§16.3). `validateDesignTokensRecord` still
 * enforces the gate — the record can never claim `approved` ahead of the D-010
 * decision — so this status tracks the decision rather than pre-empting it.
 */
export const DESIGN_TOKENS_REVIEW = {
  status: "approved" as "pending" | "approved",
} as const;

/**
 * Where a token's value came from (§17.3). A token is one of:
 *
 *   - `exact` — copied unchanged from the current site's computed value;
 *   - `approximated` — taken from the current site but not yet confirmed by a
 *     computed-value browser audit (R-001), so it may still move;
 *   - `new` — newly introduced for this build (a neutral derived from ink/white,
 *     the spacing/motion scales, the sample focus colour);
 *   - `licence-pending` — a safe placeholder awaiting a rights/licensing decision
 *     (no live token uses this now: the font stack was the last, resolved to the
 *     self-hosted Oswald/Roboto families when §16.3 / D-010 landed).
 */
export type Provenance = "exact" | "approximated" | "new" | "licence-pending";

/** The provenance values that are allowed, for validation messages. */
export const PROVENANCE_VALUES: readonly Provenance[] = [
  "exact",
  "approximated",
  "new",
  "licence-pending",
];

/**
 * One token's provenance entry. `name` must be a live `designTokens.ts` token.
 * `governingDecision`, when present, links a token whose value is contingent on
 * an open §6 decision (the font tokens link D-010).
 */
export interface TokenProvenance {
  /** Custom-property name including the leading `--`; must be a live token. */
  name: string;
  /** Where this token's value came from (§17.3). */
  provenance: Provenance;
  /** Short justification, rendered in the record beside the token. */
  note: string;
  /** The §6 decision this token's value waits on, if any. */
  governingDecision?: string;
}

/**
 * The provenance of every live token, in `designTokens.ts` declaration order.
 * Validation asserts this list covers exactly the live token set, so a new token
 * with no provenance — or a provenance for a token that was removed — fails the
 * build. The classification is honest about the plan's caveats: §16.1 marks the
 * observed brand mint/ink as needing a computed-value audit — since confirmed by
 * the 2026-07-29 audit, so `exact` — plain white is unambiguous (`exact`), every
 * neutral/scale value is `new`, and the audited Oswald/Roboto font families are
 * `exact`, governed by the now-decided D-010.
 */
export const tokenProvenance: readonly TokenProvenance[] = [
  // --- Colour: §16.1 brand (observed) and §16.2 neutrals (derived). ---
  {
    name: "--color-helix-mint",
    provenance: "exact",
    note: "Confirmed by the 2026-07-29 computed-value audit of the live site: defined there as `--helix-green: #5affba` and rendered on the CTA and section backgrounds as rgb(90, 255, 186).",
  },
  {
    name: "--color-helix-ink",
    provenance: "exact",
    note: "Corrected by the 2026-07-29 computed-value audit: the live site's ink is pure black (`--black: black`; body background and heading/body text compute to rgb(0, 0, 0)). The earlier #231f20 estimate appears nowhere in the live stylesheet.",
  },
  {
    name: "--color-white",
    provenance: "exact",
    note: "Unambiguous #ffffff; nothing to audit.",
  },
  {
    name: "--color-ink-900",
    provenance: "new",
    note: "Neutral derived from the brand ink (§16.2).",
  },
  {
    name: "--color-ink-800",
    provenance: "exact",
    note: "Near-black #1c1c1e taken from the live stylesheet in the 2026-07-29 audit (§16.2).",
  },
  {
    name: "--color-ink-100",
    provenance: "exact",
    note: "Border/divider grey #dddddd taken from the live stylesheet in the 2026-07-29 audit (§16.2).",
  },
  {
    name: "--color-surface",
    provenance: "new",
    note: "Page surface, set to white (§16.2).",
  },
  {
    name: "--color-surface-soft",
    provenance: "exact",
    note: "Light section background #f3f3f3 taken from the live stylesheet in the 2026-07-29 audit (§16.2).",
  },
  {
    name: "--color-accent",
    provenance: "new",
    note: "Accent alias of the brand mint (§16.2).",
  },
  {
    name: "--color-focus",
    provenance: "new",
    note: "Sample focus colour introduced for the design system; contrast-checked against white in designTokens.test.ts (§16.2).",
  },
  {
    name: "--color-text",
    provenance: "new",
    note: "Body-text colour, set to the brand ink (§16.2).",
  },

  // --- Typography: self-hosted Oswald/Roboto per the §16.3 audit / D-010 (P3-003). ---
  {
    name: "--font-body",
    provenance: "exact",
    note: "Roboto (400–700), the body family the 2026-07-29 live-site audit identified; self-hosted latin woff2 under the D-010 decision (Apache 2.0 licence).",
    governingDecision: GOVERNING_DECISION_ID,
  },
  {
    name: "--font-display",
    provenance: "exact",
    note: "Oswald 700, the uppercase display family the 2026-07-29 live-site audit identified (h1 58/58, h2 ~40/36); self-hosted latin woff2 under the D-010 decision (SIL OFL 1.1 licence).",
    governingDecision: GOVERNING_DECISION_ID,
  },
  {
    name: "--font-weight-regular",
    provenance: "new",
    note: "Standard 400 weight for the design system.",
  },
  {
    name: "--font-weight-bold",
    provenance: "new",
    note: "Standard 700 weight for the design system.",
  },
  {
    name: "--line-height-display",
    provenance: "new",
    note: "Tight display leading for oversized statements (§16.4).",
  },
  {
    name: "--line-height-heading",
    provenance: "new",
    note: "Heading leading (§16.4).",
  },
  {
    name: "--line-height-body",
    provenance: "new",
    note: "Comfortable body leading (§16.4).",
  },
  {
    name: "--letter-spacing-eyebrow",
    provenance: "new",
    note: "Tracking for uppercase eyebrows (§16.4).",
  },
  {
    name: "--letter-spacing-label",
    provenance: "new",
    note: "Tracking for uppercase micro-labels — progress, stage, kicker (§16.4).",
  },
  {
    name: "--letter-spacing-action",
    provenance: "new",
    note: "Tracking for bold CTAs and emphatic statements (§16.4).",
  },
  {
    name: "--font-size-xs",
    provenance: "new",
    note: "Type-scale step: fine print, eyebrow labels (§16.4).",
  },
  {
    name: "--font-size-sm",
    provenance: "new",
    note: "Type-scale step: small labels, legal copy (§16.4).",
  },
  {
    name: "--font-size-lg",
    provenance: "new",
    note: "Type-scale step: lead paragraphs (§16.4).",
  },
  {
    name: "--font-size-xl",
    provenance: "new",
    note: "Type-scale step: prompts, metric multiples (§16.4).",
  },
  {
    name: "--font-size-h3",
    provenance: "new",
    note: "Fluid type-scale step: prominent outcome numbers (§16.4).",
  },
  {
    name: "--font-size-h2",
    provenance: "new",
    note: "Fluid type-scale step: section headings (§16.4).",
  },
  {
    name: "--font-size-h1",
    provenance: "new",
    note: "Fluid type-scale step: hero headline (§16.4).",
  },
  {
    name: "--font-size-display",
    provenance: "new",
    note: "Fluid type-scale step: oversized proof figures (§16.4).",
  },

  // --- Spacing: generous vertical-rhythm scale (§16.4). ---
  { name: "--space-1", provenance: "new", note: "Spacing scale step (§16.4)." },
  { name: "--space-2", provenance: "new", note: "Spacing scale step (§16.4)." },
  { name: "--space-3", provenance: "new", note: "Spacing scale step (§16.4)." },
  { name: "--space-4", provenance: "new", note: "Spacing scale step (§16.4)." },
  { name: "--space-5", provenance: "new", note: "Spacing scale step (§16.4)." },
  { name: "--space-6", provenance: "new", note: "Spacing scale step (§16.4)." },
  { name: "--space-8", provenance: "new", note: "Spacing scale step (§16.4)." },
  { name: "--space-10", provenance: "new", note: "Spacing scale step (§16.4)." },
  { name: "--space-12", provenance: "new", note: "Spacing scale step (§16.4)." },
  { name: "--space-16", provenance: "new", note: "Spacing scale step (§16.4)." },

  // --- Layout: shared container and measure widths (§16.4). ---
  {
    name: "--width-container",
    provenance: "new",
    note: "Shared max content width (§16.4).",
  },
  {
    name: "--width-text",
    provenance: "new",
    note: "Readable measure for body copy (§16.4).",
  },

  // --- Radii: rounded case-study visuals (§16.4). ---
  { name: "--radius-sm", provenance: "new", note: "Radius scale step (§16.4)." },
  { name: "--radius-md", provenance: "new", note: "Radius scale step (§16.4)." },
  { name: "--radius-lg", provenance: "new", note: "Radius scale step (§16.4)." },

  // --- Motion: one shared easing and duration scale (P3-005). ---
  {
    name: "--ease-standard",
    provenance: "new",
    note: "Shared easing curve for section reveal and CTA response (P3-005).",
  },
  {
    name: "--duration-fast",
    provenance: "new",
    note: "Transition duration scale step (P3-005).",
  },
  {
    name: "--duration-base",
    provenance: "new",
    note: "Transition duration scale step (P3-005).",
  },
  {
    name: "--duration-slow",
    provenance: "new",
    note: "Transition duration scale step (P3-005).",
  },
];

/**
 * §17.3 also lists shadows, breakpoints, and z-index layers. The design system
 * deliberately introduces none of these yet — the homepage sections use flat
 * fields, a single fluid container, and no stacked overlays — so there is nothing
 * to inventory. Recording the omissions here keeps R-002 complete against §17.3
 * (the category was considered and intentionally left empty, not forgotten) and
 * flags what a future designer would add a token group for.
 */
export interface OmittedCategory {
  /** The §17.3 category name. */
  category: string;
  /** Why the design system introduces no token for it yet. */
  reason: string;
}

/** The §17.3 categories the token model intentionally does not (yet) cover. */
export const OMITTED_CATEGORIES: readonly OmittedCategory[] = [
  {
    category: "Shadows",
    reason:
      "The design uses flat ink/white/mint fields (§16.4), not elevation; no shadow token exists until a design need appears.",
  },
  {
    category: "Breakpoints",
    reason:
      "Sections lay out with intrinsic CSS (fluid widths, `auto-fit` grids), so there is no shared breakpoint scale to tokenise yet.",
  },
  {
    category: "Z-index layers",
    reason:
      "There is no stacked overlay, modal, or sticky header on the page, so no z-index scale is needed yet.",
  },
];

/** Draft markers that must never appear in a documented note. */
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

/**
 * Validate the R-002 record and cross-check it against the live token model and
 * the decisions register. Returns the list of problems; an empty list means the
 * inventory is well-formed and complete. The production build treats any
 * non-empty result as fatal.
 */
export function validateDesignTokensRecord(
  provenance: readonly TokenProvenance[] = tokenProvenance,
  tokens: readonly DesignToken[] = allTokens(),
): string[] {
  const errors: string[] = [];

  // --- Inventory must cover exactly the live token set, once each. ---
  const liveNames = tokens.map((t) => t.name);
  const documented = provenance.map((p) => p.name);
  const documentedSet = new Set(documented);
  if (documentedSet.size !== documented.length) {
    const dupes = documented.filter((n, i) => documented.indexOf(n) !== i);
    errors.push(
      `Token provenance lists duplicate token(s): [${[...new Set(dupes)].join(", ")}].`,
    );
  }
  if (!sameSet(documented, liveNames)) {
    const missing = liveNames.filter((n) => !documentedSet.has(n));
    const liveSet = new Set(liveNames);
    const extra = documented.filter((n) => !liveSet.has(n));
    errors.push(
      `Token provenance must cover exactly the live designTokens.ts tokens.${
        missing.length ? ` Missing: [${missing.join(", ")}].` : ""
      }${extra.length ? ` Extra: [${extra.join(", ")}].` : ""}`,
    );
  }

  // --- Each entry: valid provenance, a note, real decision link. ---
  const decisionIds = new Set(decisions.map((d: DecisionRecord) => d.id));
  const brandNames = new Set(Object.keys(REQUIRED_BRAND_COLORS));
  const fontNames = new Set(FONT_TOKEN_NAMES);
  const fontDecisionResolved =
    decisions.find((d: DecisionRecord) => d.id === GOVERNING_DECISION_ID)
      ?.status === "decided";

  for (const entry of provenance) {
    if (!PROVENANCE_VALUES.includes(entry.provenance)) {
      errors.push(
        `Token "${entry.name}" has an invalid provenance "${entry.provenance}"; expected one of [${PROVENANCE_VALUES.join(", ")}].`,
      );
    }
    if (!entry.note.trim()) {
      errors.push(`Token "${entry.name}" is missing a provenance note.`);
    }
    if (hasDraftMarker(entry.note)) {
      errors.push(`Token "${entry.name}" note still contains a draft marker.`);
    }
    if (entry.governingDecision && !decisionIds.has(entry.governingDecision)) {
      errors.push(
        `Token "${entry.name}" links decision "${entry.governingDecision}", which is not in the decisions register.`,
      );
    }

    // A brand colour comes from the current site — it may be exact or awaiting
    // an audit, but never labelled "newly introduced".
    if (brandNames.has(entry.name) && !["exact", "approximated"].includes(entry.provenance)) {
      errors.push(
        `Brand colour "${entry.name}" must be "exact" or "approximated" (it comes from the current site), not "${entry.provenance}".`,
      );
    }

    // The font tokens are gated on D-010: licence-pending placeholders while it
    // is open; once it is decided the audited families ship and the entries are
    // exact. Either way they must keep linking the governing decision.
    if (fontNames.has(entry.name)) {
      if (!fontDecisionResolved && entry.provenance !== "licence-pending") {
        errors.push(
          `Font token "${entry.name}" must be "licence-pending" until §16.3 / ${GOVERNING_DECISION_ID} resolves, not "${entry.provenance}".`,
        );
      }
      if (fontDecisionResolved && entry.provenance !== "exact") {
        errors.push(
          `Font token "${entry.name}" must be "exact" now that ${GOVERNING_DECISION_ID} is decided, not "${entry.provenance}".`,
        );
      }
      if (entry.governingDecision !== GOVERNING_DECISION_ID) {
        errors.push(
          `Font token "${entry.name}" must be governed by ${GOVERNING_DECISION_ID}.`,
        );
      }
    }
  }

  // --- Omitted §17.3 categories must be recorded with a reason. ---
  for (const omitted of OMITTED_CATEGORIES) {
    if (!omitted.category.trim() || !omitted.reason.trim()) {
      errors.push("An omitted-category entry is missing its category or reason.");
    }
  }

  // --- Review state may not outrun the governing decision. ---
  const governing = decisions.find(
    (d: DecisionRecord) => d.id === GOVERNING_DECISION_ID,
  );
  if (!governing) {
    errors.push(
      `Governing decision "${GOVERNING_DECISION_ID}" is missing from the decisions register.`,
    );
  } else if (DESIGN_TOKENS_REVIEW.status === "approved" && governing.status !== "decided") {
    errors.push(
      `R-002 is marked approved but its governing decision ${GOVERNING_DECISION_ID} is still ${governing.status}.`,
    );
  }

  return errors;
}

/**
 * Assert the R-002 record is valid and complete, throwing on failure. Intended
 * for build time so a token added without a provenance entry, a mislabelled brand
 * colour, a dangling decision link, or a record claiming sign-off ahead of D-010
 * fails the build.
 */
export function assertDesignTokensRecordValid(
  provenance: readonly TokenProvenance[] = tokenProvenance,
  tokens: readonly DesignToken[] = allTokens(),
): void {
  const errors = validateDesignTokensRecord(provenance, tokens);
  if (errors.length > 0) {
    throw new Error(`Invalid design-token inventory:\n- ${errors.join("\n- ")}`);
  }
}

const DOC_COMMENT =
  "<!-- Generated from src/config/designTokensRecord.ts — do not edit by hand. -->";

/** Human labels for the provenance values, used in the rendered record. */
const PROVENANCE_LABELS: Readonly<Record<Provenance, string>> = {
  exact: "Exact",
  approximated: "Approximated",
  new: "New",
  "licence-pending": "Licence-pending",
};

/**
 * Render the exact markdown text of `docs/research/design-tokens.md` from this
 * model. `designTokensRecord.test.ts` asserts the committed file still matches, so
 * the printable R-002 record cannot drift from the code. Every token is listed
 * with its live value (from `designTokens.ts`) and its provenance. Ends with a
 * trailing newline.
 */
export function renderDesignTokensDoc(
  provenance: readonly TokenProvenance[] = tokenProvenance,
  tokens: readonly DesignToken[] = allTokens(),
): string {
  const valueByName = new Map(tokens.map((t) => [t.name, t.value]));

  const lines: string[] = [
    "# Design-token inventory (R-002)",
    "",
    DOC_COMMENT,
    "",
    "**Plan references:** §17.3 R-002, §16 Visual system, decision D-010 (font rights).",
    `**Review status:** ${DESIGN_TOKENS_REVIEW.status} — the 2026-07-29 computed-value audit confirmed the brand colours (§16.1) and the font-rights decision that governs the font families (${GOVERNING_DECISION_ID}, §16.3) is recorded, so this record reads approved; the build still blocks it from reading approved ahead of that decision.`,
    "",
    "The tokens ship from `src/config/designTokens.ts` (rendered to",
    "`src/styles/global.css`). This record inventories every one of them and, per",
    "§17.3, classifies where each value came from:",
    "",
    "- **Exact** — copied unchanged from the current site's computed value.",
    "- **Approximated** — from the current site, pending a computed-value audit (R-001).",
    "- **New** — newly introduced for this build (a derived neutral, a scale step).",
    "- **Licence-pending** — a safe placeholder awaiting a rights decision (unused now the font stack resolved under D-010).",
    "",
    "## Token inventory",
    "",
    "| Token | Value | Provenance | Note |",
    "| --- | --- | --- | --- |",
  ];

  for (const entry of provenance) {
    const value = valueByName.get(entry.name) ?? "";
    const label = PROVENANCE_LABELS[entry.provenance];
    const decision = entry.governingDecision ? ` (${entry.governingDecision})` : "";
    lines.push(
      `| \`${entry.name}\` | \`${value}\` | ${label}${decision} | ${entry.note} |`,
    );
  }

  lines.push(
    "",
    "## Categories intentionally not tokenised (§17.3)",
    "",
    "§17.3 also lists shadows, breakpoints, and z-index layers. The design system",
    "introduces none of these yet; each is recorded here so the omission is tracked,",
    "not forgotten.",
    "",
  );
  for (const omitted of OMITTED_CATEGORIES) {
    lines.push(`- **${omitted.category}** — ${omitted.reason}`);
  }

  return lines.join("\n") + "\n";
}
