/**
 * Site-wide document-head metadata and structured data (implementation plan
 * §7.2 routes, P7-001 metadata, P7-002 canonical domain, and P7-004 structured
 * data).
 *
 * The shared `BaseLayout` head was bare — a title and description only. This
 * module is the single, testable source for the rest of what every page needs
 * to be shareable and indexable honestly:
 *
 *  - one canonical origin (P7-002) so the site never advertises two competing
 *    URLs for the same page;
 *  - default title/description copy (P7-001);
 *  - Open Graph and Twitter fields for link unfurling;
 *  - conservative `Organization` and `WebSite` JSON-LD (P7-004).
 *
 * P7-004 is explicit about what must NOT appear in the structured data: no
 * individual founder/person schema, no fabricated ratings, no unverified
 * founding dates, no unverified employee counts, and no case-study valuation
 * data. Those are the institutional-positioning and unsupported-claim rules of
 * §4/§5 expressed as schema. `validateStructuredData` enforces them so a future
 * edit that reintroduces `founder` or `aggregateRating` fails the build rather
 * than shipping an unapproved claim in a machine-readable format search engines
 * trust.
 *
 * This module is pure configuration plus validation: no UI, no I/O. The
 * social-preview artwork (P7-003 `og:image`) lives in its own validated model,
 * `socialCard.ts`, which the layout references; its final designed form is
 * signed off through the standing launch review (Q-0009).
 */

/**
 * The one canonical origin (P7-002). Must match `site` in `astro.config.mjs`;
 * `canonicalUrl` builds every page's canonical link from it so the apex/www
 * decision lives in exactly one place.
 */
export const SITE_ORIGIN = "https://www.helixcollective.com";

/** Working title (P7-001), reused as the head `<title>` default. */
export const DEFAULT_TITLE = "Helix Collective — Enterprise Value Growth Partner";

/** Working meta description (P7-001). */
export const DEFAULT_DESCRIPTION =
  "Helix Collective partners deeply with businesses to create meaningful growth in enterprise value through product, technology and commercial execution.";

/** The institutional name used across metadata and structured data (§5). */
export const ORGANIZATION_NAME = "Helix Collective";

/** Open Graph locale, matching the document's `en-AU` language. */
export const SITE_LOCALE = "en_AU";

/**
 * JSON-LD keys that must never appear in the site's structured data (P7-004).
 * These encode the institutional-positioning rule (no people, §5) and the
 * unsupported-claim rule (no unverified counts, dates, or ratings, §4). The list
 * is lowercase; matching is case-insensitive and recursive.
 */
export const FORBIDDEN_JSONLD_KEYS: readonly string[] = [
  "founder",
  "founders",
  "foundingdate",
  "employee",
  "employees",
  "numberofemployees",
  "aggregaterating",
  "review",
  "member",
];

/** Draft markers that must never reach a production build (case-insensitive). */
const META_DRAFT_MARKERS: readonly string[] = [
  "draft",
  "not for publication",
  "todo",
  "tbd",
  "placeholder",
  "lorem ipsum",
  "[verify",
  "[decide",
  "[approve",
];

/** Per-page metadata resolved by the layout. */
export interface PageMeta {
  /** Document title. */
  title: string;
  /** Meta description. */
  description: string;
  /**
   * Site-root-relative path of the page (for the canonical URL), e.g. "/".
   * Must begin with "/".
   */
  canonicalPath: string;
  /**
   * When true, the page asks not to be indexed and carries no canonical link or
   * structured data (used for the 404 page). Defaults to false.
   */
  noindex?: boolean;
}

/**
 * Build the absolute canonical URL for a root-relative `path` (P7-002). The
 * origin is fixed to {@link SITE_ORIGIN}; the path is normalised to start with a
 * single "/". Query strings and fragments are dropped — a canonical URL points
 * at the indexable resource, not a parameterised view.
 */
export function canonicalUrl(path: string = "/"): string {
  const cleaned = path.split(/[?#]/, 1)[0].trim();
  const withSlash = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  // Collapse any accidental double slashes in the path portion.
  const normalised = withSlash.replace(/\/{2,}/g, "/");
  return `${SITE_ORIGIN}${normalised === "/" ? "/" : normalised.replace(/\/$/, "")}`;
}

/** Stable JSON-LD `@id` for the organisation node, so `WebSite` can reference it. */
export const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;

/** Stable JSON-LD `@id` for the website node. */
export const WEBSITE_ID = `${SITE_ORIGIN}/#website`;

/**
 * Conservative `Organization` JSON-LD (P7-004). Name, canonical URL, and the
 * approved proposition description only — deliberately no `founder`,
 * `foundingDate`, `numberOfEmployees`, or `aggregateRating`.
 */
export function organizationSchema(): Record<string, unknown> {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: ORGANIZATION_NAME,
    url: `${SITE_ORIGIN}/`,
    description: DEFAULT_DESCRIPTION,
  };
}

/**
 * Conservative `WebSite` JSON-LD (P7-004), linked to the organisation as its
 * publisher. No `SearchAction` — the site has no on-site search.
 */
export function websiteSchema(): Record<string, unknown> {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: ORGANIZATION_NAME,
    url: `${SITE_ORIGIN}/`,
    publisher: { "@id": ORGANIZATION_ID },
    inLanguage: "en-AU",
  };
}

/**
 * The site's structured-data graph: one `Organization` and one `WebSite` node
 * under a single `@context`. Rendered as one `<script type="application/ld+json">`.
 */
export function structuredDataGraph(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [organizationSchema(), websiteSchema()],
  };
}

/** Recursively collect every object key in a JSON-LD value, lowercased. */
function collectKeys(value: unknown, into: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, into);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      into.add(key.toLowerCase());
      collectKeys(child, into);
    }
  }
}

/**
 * Validate a structured-data graph against the P7-004 exclusions. Returns the
 * list of problems; an empty list means the graph is clean. The production build
 * should treat any non-empty result as fatal so an edit that reintroduces a
 * forbidden node (a founder, a rating, an employee count) cannot ship.
 */
export function validateStructuredData(
  graph: Record<string, unknown> = structuredDataGraph(),
): string[] {
  const errors: string[] = [];

  if (graph["@context"] !== "https://schema.org") {
    errors.push('Structured data must declare `"@context": "https://schema.org"`.');
  }

  const keys = new Set<string>();
  collectKeys(graph, keys);
  for (const forbidden of FORBIDDEN_JSONLD_KEYS) {
    if (keys.has(forbidden)) {
      errors.push(
        `Structured data contains forbidden key "${forbidden}" (P7-004 bars people, ratings, and unverified counts from schema).`,
      );
    }
  }

  // A crude but effective guard: no bare valuation figures in the schema. P7-004
  // keeps case-study numbers out of structured data until reviewed.
  const serialised = JSON.stringify(graph);
  if (/\$\s?\d/.test(serialised) || /\b\d+\s?m\b/i.test(serialised)) {
    errors.push(
      "Structured data appears to contain a monetary/valuation figure; case-study numbers must not ship in schema (P7-004).",
    );
  }

  return errors;
}

/**
 * Assert the structured-data graph is valid, throwing on failure. Intended for
 * use at render/build time.
 */
export function assertStructuredDataValid(
  graph: Record<string, unknown> = structuredDataGraph(),
): void {
  const errors = validateStructuredData(graph);
  if (errors.length > 0) {
    throw new Error(`Invalid structured data:\n- ${errors.join("\n- ")}`);
  }
}

/**
 * Validate per-page metadata (P7-001/P7-002). Returns the list of problems; an
 * empty list means the metadata is well-formed.
 */
export function validatePageMeta(meta: PageMeta): string[] {
  const errors: string[] = [];

  if (!meta.title.trim()) {
    errors.push("Page title is missing.");
  }
  if (!meta.description.trim()) {
    errors.push("Page description is missing.");
  }
  if (!meta.canonicalPath.startsWith("/")) {
    errors.push(
      `canonicalPath "${meta.canonicalPath}" must be root-relative and start with "/".`,
    );
  }

  const haystack = `${meta.title} ${meta.description}`.toLowerCase();
  for (const marker of META_DRAFT_MARKERS) {
    if (haystack.includes(marker)) {
      errors.push(`Page metadata contains a forbidden draft marker "${marker}".`);
    }
  }

  return errors;
}

/**
 * Assert per-page metadata is valid, throwing on failure. Intended for use at
 * render/build time so a page shipping a placeholder title or an off-root
 * canonical path fails the build.
 */
export function assertPageMetaValid(meta: PageMeta): void {
  const errors = validatePageMeta(meta);
  if (errors.length > 0) {
    throw new Error(`Invalid page metadata:\n- ${errors.join("\n- ")}`);
  }
}
