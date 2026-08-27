/**
 * Minimal, no-op-safe analytics adapter (implementation plan P5-006, R-011).
 *
 * The whole site funnels to one conversion event, so the launch needs to be able
 * to *measure* that funnel — but which provider (if any) does the measuring is
 * still open (decision D-011 is unresolved). This module therefore ships the
 * mechanism, not a provider: it defines the closed set of events the site is
 * allowed to emit and a `track()` that delivers them to a configured sink. Until
 * `configureAnalytics()` installs a sink, every `track()` call is a silent no-op,
 * exactly as P5-006 requires. When D-011 lands, a single `configureAnalytics(...)`
 * call in the layout wires the chosen provider and the whole funnel lights up
 * without touching any component.
 *
 * Privacy is structural (R-011, D-011): an event is a bare name from a fixed
 * enum and carries no payload, so it is impossible for this adapter to send a
 * visitor's name, email, free text, entered revenue figure, or Calendly form
 * data. The fit qualifier reports *which outcome* a visitor reached — a category,
 * never their answers as identifying data.
 *
 * The module is pure and side-effect-free apart from `trackAnalyticsClicks()`,
 * whose only job is to attach one delegated click listener; all of its decision
 * logic lives in the pure `analyticsEventFromAttribute()` so it can be tested
 * without a DOM.
 */

import type { NodeId } from "../components/fit/fitFlow";

/**
 * The complete set of events the site may emit. This is the R-011 recommended
 * list, extended with `fit_result_not_current_fit` so every one of the five fit
 * outcomes has a discrete event (the recommended list named only four). Nothing
 * outside this set can be tracked — `track()` rejects unknown names — so the
 * analytics surface stays auditable.
 */
export const ANALYTICS_EVENTS = [
  "cta_click",
  "fit_flow_started",
  "fit_flow_completed",
  "fit_result_growth",
  "fit_result_idea",
  "fit_result_community",
  "fit_result_not_current_fit",
  "fit_result_no_fit",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

/** A sink receives each tracked event. Provider wiring lives entirely here. */
export type AnalyticsSink = (event: AnalyticsEvent) => void;

/** Minimal Google tag API shape used by this adapter. */
export type GoogleTag = (command: "event", event: AnalyticsEvent) => void;

const ALLOWED_EVENTS: ReadonlySet<string> = new Set(ANALYTICS_EVENTS);

/**
 * The installed sink, or `null` when analytics is disabled. Module-level state
 * is deliberate: there is one analytics pipeline for the whole page.
 */
let sink: AnalyticsSink | null = null;

/** True when `name` is one of the allowed events. */
export function isAnalyticsEvent(name: string): name is AnalyticsEvent {
  return ALLOWED_EVENTS.has(name);
}

/**
 * Install (or, with `null`, remove) the analytics sink. Called once from the
 * layout when decision D-011 selects a provider; until then no sink is set and
 * tracking is a no-op.
 */
export function configureAnalytics(next: AnalyticsSink | null): void {
  sink = next;
}

/**
 * Install a GA4 event sink when the Google tag script is present. Page views are
 * sent by the inline `gtag("config", ...)` snippet in `BaseLayout`; this sink
 * sends the site's explicit funnel events such as `cta_click`.
 */
export function configureGoogleAnalytics(
  global: { gtag?: unknown } = globalThis as { gtag?: unknown },
): boolean {
  if (typeof global.gtag !== "function") {
    configureAnalytics(null);
    return false;
  }

  const gtag = global.gtag as GoogleTag;
  configureAnalytics((event) => gtag("event", event));
  return true;
}

/** Whether a sink is currently installed. */
export function isAnalyticsEnabled(): boolean {
  return sink !== null;
}

/**
 * Deliver an event to the configured sink. Returns whether it was delivered.
 *
 * Three guarantees the callers rely on:
 *  - it is a no-op (returns `false`) when analytics is disabled, so components
 *    can call it unconditionally;
 *  - it silently ignores an unknown event name rather than throwing, guarding
 *    against a stray string reaching it from untyped/DOM code;
 *  - a throwing sink can never break the page — analytics is best-effort and is
 *    caught here.
 */
export function track(event: AnalyticsEvent): boolean {
  if (!isAnalyticsEvent(event)) return false;
  const current = sink;
  if (!current) return false;
  try {
    current(event);
    return true;
  } catch {
    return false;
  }
}

/**
 * Map a fit-flow result node to its analytics event. Returns `null` for a
 * question node (or any non-result id), so callers can pass any node id safely.
 */
export function fitResultEvent(nodeId: NodeId): AnalyticsEvent | null {
  switch (nodeId) {
    case "growth-fit":
      return "fit_result_growth";
    case "idea-fit":
      return "fit_result_idea";
    case "community-fit":
      return "fit_result_community";
    case "not-current-fit":
      return "fit_result_not_current_fit";
    case "no-fit":
      return "fit_result_no_fit";
    default:
      return null;
  }
}

/**
 * Resolve a `data-analytics-event` attribute value to a valid event, or `null`
 * when it is missing or not an allowed event. Pure so the click delegation can
 * be tested without a DOM.
 */
export function analyticsEventFromAttribute(
  value: string | null | undefined,
): AnalyticsEvent | null {
  if (!value) return null;
  return isAnalyticsEvent(value) ? value : null;
}

/** Minimal shape of the elements the click delegation touches. */
interface AnalyticsClickTarget {
  closest(selectors: string): { getAttribute(name: string): string | null } | null;
}

/**
 * Attach one delegated click listener that tracks any element carrying a
 * `data-analytics-event` attribute (every primary CTA does). One listener
 * covers static Astro CTAs and the hydrated fit-qualifier CTA alike, so no
 * component needs its own click handler for `cta_click`.
 *
 * Returns a cleanup function that removes the listener. The heavy lifting is the
 * pure `analyticsEventFromAttribute()`; this shell only reads the DOM.
 */
export function trackAnalyticsClicks(
  root: Pick<Document, "addEventListener" | "removeEventListener"> = document,
): () => void {
  const handler = (event: Event) => {
    const target = event.target as unknown as AnalyticsClickTarget | null;
    if (!target || typeof target.closest !== "function") return;
    const el = target.closest("[data-analytics-event]");
    const name = analyticsEventFromAttribute(el?.getAttribute("data-analytics-event"));
    if (name) track(name);
  };

  root.addEventListener("click", handler);
  return () => root.removeEventListener("click", handler);
}
