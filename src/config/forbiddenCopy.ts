/**
 * Site-wide forbidden-copy guard (implementation plan §21 `validate:copy`,
 * enforcing the Fixed Requirements in §5 and the Non-goals in §4).
 *
 * The content models each police their own data, but several of the plan's hard
 * rules are about *language that must never reach a visitor* regardless of which
 * component emits it: removed brand names, the abandoned people-led positioning,
 * venture/human counts, and the marketing clichés the tone system bans (§15.3).
 * This module is the single, testable place that knows those rules, so a build
 * step can scan rendered pages (or any copy string) and fail before an
 * unapproved phrase ships.
 *
 * It is pure text analysis: no UI, no I/O. A `validate-forbidden-copy` build
 * script feeds it the emitted HTML/text; the unit tests feed it fixtures.
 *
 * Deliberate exclusions, to avoid false positives:
 *  - "Xylo" is *not* forbidden here. Only its *case study* is removed (D-008);
 *    its logo is legitimately retained in the marquee register (see logos.ts),
 *    and caseStudies.ts already guards Xylo-as-a-case-study. A blanket ban would
 *    flag the approved logo.
 *  - Context-dependent terms the plan only bans "when unsupported by detail"
 *    (e.g. "innovation partner") or "unless intentional" (e.g. "free
 *    consulting") are omitted, because a keyword scan cannot judge intent and
 *    would produce noise. Those remain a human review responsibility (Gate A).
 */

/** A rule describing copy that must never appear in shipped output. */
export interface ForbiddenPattern {
  /** Stable, kebab-case identifier for the rule. */
  id: string;
  /** Case-insensitive matcher. Must NOT carry the global flag (see below). */
  pattern: RegExp;
  /** Why this is forbidden, phrased for a developer reading a failed build. */
  reason: string;
  /** The section of the implementation plan that mandates the rule. */
  planRef: string;
}

/** One occurrence of forbidden copy found in a scanned string. */
export interface CopyViolation {
  /** The `id` of the rule that matched. */
  id: string;
  /** The exact substring that triggered the match. */
  match: string;
  /** Zero-based character index of the match within the scanned text. */
  index: number;
  reason: string;
  planRef: string;
}

/**
 * The rule set. Each `pattern` is case-insensitive and matches on word
 * boundaries where a bare substring would over-match. Whitespace inside phrases
 * is written as `\s+` so line wraps and doubled spaces in rendered HTML still
 * match. Patterns are declared WITHOUT the global flag; the scanner clones each
 * with `g` per call so `lastIndex` is never shared between scans (a classic
 * stateful-RegExp bug).
 */
export const FORBIDDEN_PATTERNS: readonly ForbiddenPattern[] = [
  // --- Removed brands (§5 logo marquee, §8.4). Must not appear as visible copy. ---
  {
    id: "brand-awayco",
    pattern: /\bawayco\b/i,
    reason: 'Awayco was removed from the site; its name must not appear in copy.',
    planRef: "§5 (Logo marquee), §8.4",
  },
  {
    id: "brand-perion",
    pattern: /\bperion\b/i,
    reason: 'Perion was removed from the site; its name must not appear in copy.',
    planRef: "§5 (Logo marquee), §8.4",
  },
  {
    id: "brand-synaptico",
    pattern: /\bsynaptico\b/i,
    reason: 'Synaptico was removed from the site; its name must not appear in copy.',
    planRef: "§5 (Logo marquee), §8.4",
  },

  // --- People-led positioning is abandoned (§5 Institutional positioning, §4). ---
  {
    id: "humans-of-helix",
    pattern: /\bhumans\s+of\s+helix\b/i,
    reason:
      'The "humans of Helix" people-led framing is removed; trade on the business, not individuals.',
    planRef: "§5 (Institutional positioning), §15.3",
  },
  {
    id: "greatest-asset",
    pattern: /\bour\s+people\s+are\s+our\s+greatest\s+asset\b/i,
    reason: 'Founder/people-worship language is banned by the tone system.',
    planRef: "§15.3",
  },

  // --- Venture / human counts must be removed entirely (§5 Proof banner). ---
  // "10+ years" is REQUIRED and intentionally not matched (different noun).
  {
    id: "venture-count",
    pattern: /\b\d+\s*\+?\s+ventures\b/i,
    reason:
      'The venture count is removed; the proof banner shows only "$500m+" and "10+ years".',
    planRef: "§5 (Proof banner), §15.3",
  },
  {
    id: "human-count",
    pattern: /\b\d+\s*\+?\s+humans\b/i,
    reason: 'The human count is removed from the proof banner.',
    planRef: "§5 (Proof banner)",
  },

  // --- Banned positioning clichés (§15.3 words and themes to avoid). ---
  {
    id: "market-domination",
    pattern: /\bmarket\s+domination\b/i,
    reason:
      'The "zero to market domination" framing is replaced by the interactive fit flow.',
    planRef: "§5 (Qualification), §15.3",
  },
  {
    id: "digital-transformation",
    pattern: /\bdigital\s+transformation\b/i,
    reason: 'Generic consultancy cliché the tone system bans.',
    planRef: "§15.3",
  },
  {
    id: "end-to-end-solutions",
    pattern: /\bend[\s-]to[\s-]end\s+solutions?\b/i,
    reason: 'Generic consultancy cliché the tone system bans.',
    planRef: "§15.3",
  },
  {
    id: "world-class",
    pattern: /\bworld[\s-]class\b/i,
    reason: 'Empty superlative the tone system bans.',
    planRef: "§15.3",
  },
  {
    id: "best-in-class",
    pattern: /\bbest[\s-]in[\s-]class\b/i,
    reason: 'Empty superlative the tone system bans.',
    planRef: "§15.3",
  },
  {
    id: "resource-augmentation",
    pattern: /\bresource\s+augmentation\b/i,
    reason:
      'Helix sells enterprise-value growth, not staff/resource augmentation.',
    planRef: "§4, §15.3",
  },

  // --- Claims that overpromise outcomes Helix cannot control (§4, §5, §11.7). ---
  {
    id: "guaranteed-upside",
    pattern: /\bguarantee(?:d|s)?\s+(?:upside|enterprise\s+value|returns?|growth)\b/i,
    reason:
      'The site must never guarantee enterprise-value growth or upside Helix cannot control.',
    planRef: "§4, §5, §15.3",
  },
  {
    id: "forced-exit",
    pattern: /\bforced\s+exit\b/i,
    reason: 'Helix does not force exits; this framing is banned.',
    planRef: "§15.3",
  },
];

/**
 * Scan a single string and return every forbidden-copy occurrence, in the order
 * they appear. An empty array means the text is clean.
 */
export function scanForbiddenCopy(
  text: string,
  patterns: readonly ForbiddenPattern[] = FORBIDDEN_PATTERNS,
): CopyViolation[] {
  const violations: CopyViolation[] = [];

  for (const rule of patterns) {
    // Clone with the global flag so we can walk every occurrence without
    // mutating the shared, declared pattern's `lastIndex`.
    const flags = rule.pattern.flags.includes("g")
      ? rule.pattern.flags
      : rule.pattern.flags + "g";
    const re = new RegExp(rule.pattern.source, flags);
    for (let m = re.exec(text); m !== null; m = re.exec(text)) {
      violations.push({
        id: rule.id,
        match: m[0],
        index: m.index,
        reason: rule.reason,
        planRef: rule.planRef,
      });
      // Guard against zero-width matches looping forever.
      if (m.index === re.lastIndex) {
        re.lastIndex += 1;
      }
    }
  }

  return violations.sort((a, b) => a.index - b.index);
}

/** True when the text contains no forbidden copy. */
export function isCopyClean(
  text: string,
  patterns: readonly ForbiddenPattern[] = FORBIDDEN_PATTERNS,
): boolean {
  return scanForbiddenCopy(text, patterns).length === 0;
}

/** A named chunk of copy to scan — e.g. one rendered page. */
export interface CopySource {
  /** Human-readable label, such as a route or file path. */
  label: string;
  text: string;
}

/**
 * Assert that none of the supplied sources contain forbidden copy, throwing a
 * single readable report listing every violation. Intended for the
 * `validate-forbidden-copy` build step so a banned phrase fails the build
 * before it can ship (§21).
 */
export function assertNoForbiddenCopy(
  sources: readonly CopySource[],
  patterns: readonly ForbiddenPattern[] = FORBIDDEN_PATTERNS,
): void {
  const lines: string[] = [];
  for (const source of sources) {
    for (const v of scanForbiddenCopy(source.text, patterns)) {
      lines.push(
        `${source.label}: "${v.match}" [${v.id}] — ${v.reason} (${v.planRef})`,
      );
    }
  }
  if (lines.length > 0) {
    throw new Error(`Forbidden copy found:\n- ${lines.join("\n- ")}`);
  }
}

/* ---------------------------------------------------------------------------
 * §11.7 commercial-promise wording.
 *
 * A second, narrower ruleset with a different job from the vocabulary above.
 * Those rules retire copy the repositioning dropped; these prevent the site
 * misrepresenting the commercial relationship — implying an employment
 * relationship, guaranteeing an enterprise-value result or an instrument,
 * making the "get paid when you get paid" claim universal, presenting a company
 * sale as mandatory, or asserting a fiduciary, agency, or directorship role.
 *
 * They lived in the engagement-model research record until 2026-08-18 and moved
 * here when it was retired: the record was reference material, but this is a
 * guard on what ships, and `renderedProhibitedWording.test.ts` runs it over the
 * assembled page.
 * ------------------------------------------------------------------------- */


/** One occurrence of prohibited wording found in scanned copy. */
export interface ProhibitedWordingHit {
  /** The `id` of the rule that matched. */
  id: string;
  /** Label of the copy source the match was found in. */
  source: string;
  /** The exact substring that triggered the match. */
  match: string;
  reason: string;
}

/**
 * Wording that must never reach the "How we work"/"We're different" copy (§11.7
 * accuracy and legal guardrails). These complement the site-wide
 * `forbiddenCopy.ts` rules with the engagement-model-specific promises §11.7
 * bans: an employment relationship, a guaranteed result, a universal payment
 * claim, a mandatory sale, a fiduciary/agency/directorship representation, or an
 * over-specified/guaranteed back-end instrument.
 *
 * Patterns are case-insensitive and declared WITHOUT the global flag; the scanner
 * clones each with `g` per call so `lastIndex` is never shared between scans.
 */
/** A phrase that must never reach the site's commercial copy (§11.7). */
export interface ProhibitedPhrase {
  /** Stable, kebab-case identifier for the rule. */
  id: string;
  /** Case-insensitive matcher. Declared WITHOUT the global flag (see scanner). */
  pattern: RegExp;
  /** Why the §11.7 guardrails forbid it, phrased for a failed build. */
  reason: string;
}

/** One occurrence of prohibited wording found in scanned copy. */
export interface ProhibitedWordingHit {
  /** The `id` of the rule that matched. */
  id: string;
  /** Label of the copy source the match was found in. */
  source: string;
  /** The exact substring that triggered the match. */
  match: string;
  reason: string;
}

export const PROHIBITED_WORDING: readonly ProhibitedPhrase[] = [
  {
    id: "employment-relationship",
    pattern:
      /\b(?:as|become|becoming|are|join(?:ing)?\s+as)\s+(?:your\s+|full[\s-]time\s+)*employees?\b/i,
    reason:
      "\"Part of the operating team\" must not imply an employment relationship (§11.7).",
  },
  {
    id: "on-your-payroll",
    pattern: /\bon\s+your\s+payroll\b/i,
    reason: "Embedded delivery must not be described as being on the payroll (§11.7).",
  },
  {
    id: "guaranteed-result",
    pattern:
      /\bguarantee(?:d|s)?\s+(?:a\s+|the\s+)?(?:result|outcome|valuation|multiple|success)\w*\b/i,
    reason: "The site must never guarantee an enterprise-value result (§11.7, §4).",
  },
  {
    id: "universal-payment-claim",
    pattern: /\bwe\s+(?:only\s+)?get\s+paid\s+when\s+you\s+get\s+paid\b/i,
    reason:
      "\"Get paid when you get paid\" is not true of every engagement; keep payment wording instrument-neutral (§11.7).",
  },
  {
    id: "mandatory-sale",
    pattern:
      /\b(?:must|required\s+to|have\s+to|obligated\s+to)\s+sell\s+(?:the|your)\s+(?:company|business)\b/i,
    reason: "\"Exit\" must not imply a mandatory sale of the company (§11.7).",
  },
  {
    id: "sale-required",
    pattern: /\b(?:requires?|mandatory|guaranteed)\s+(?:a\s+)?(?:company\s+)?(?:sale|liquidity\s+event)\b/i,
    reason:
      "A company sale or liquidity event must never be presented as required or inevitable (§11.7).",
  },
  {
    id: "fiduciary-agency-directorship",
    pattern:
      /\b(?:as|acting\s+as|serving\s+as)\s+(?:your\s+)?(?:fiduciary|agent|directors?)\b/i,
    reason:
      "Embedded delivery must not assert a fiduciary, agency, or directorship representation (§11.7).",
  },
  {
    id: "guaranteed-instrument",
    pattern: /\bguaranteed\s+(?:equity|options?|carry|gain[\s-]share|shares?|warrants?)\b/i,
    reason:
      "The back-end instrument varies per engagement and must never be described as guaranteed (§11.7).",
  },
];

/**
 * Scan one copy string for every prohibited-wording occurrence. An empty array
 * means the copy is clean. Mirrors the safe-clone approach in `forbiddenCopy.ts`.
 */
export function scanProhibitedWording(
  source: string,
  text: string,
  rules: readonly ProhibitedPhrase[] = PROHIBITED_WORDING,
): ProhibitedWordingHit[] {
  const hits: ProhibitedWordingHit[] = [];
  for (const rule of rules) {
    const flags = rule.pattern.flags.includes("g")
      ? rule.pattern.flags
      : rule.pattern.flags + "g";
    const re = new RegExp(rule.pattern.source, flags);
    for (let m = re.exec(text); m !== null; m = re.exec(text)) {
      hits.push({ id: rule.id, source, match: m[0], reason: rule.reason });
      if (m.index === re.lastIndex) re.lastIndex += 1;
    }
  }
  return hits;
}
