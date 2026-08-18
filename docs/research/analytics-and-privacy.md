# Analytics and privacy (R-011)

<!-- Generated from src/config/analyticsAndPrivacy.ts — do not edit by hand. -->

**Plan references:** §17.12 R-011, §12.4 (no personal data in the fit qualifier), decision D-011.
**Review status:** pending — this document is the plan's working baseline; the provider choice is the open D-0011-analytics decision, and this record may only be marked approved once that decision is recorded.

The mechanism ships in `src/utils/analytics.ts`: a no-op-safe adapter whose
closed `ANALYTICS_EVENTS` enum is the only thing the site can emit. Until a
provider is chosen and wired, the site collects nothing.

## Current state and launch plan

### Current analytics

None in production. `src/utils/analytics.ts` ships a no-op-safe adapter: until `configureAnalytics()` installs a sink, every `track()` call is a silent no-op, so the site collects and transmits nothing.

- **Governing decision:** none

### Desired launch analytics

Unconfirmed — whether the launch needs Cloudflare Web Analytics, an existing Google Analytics/Tag Manager property, or no analytics at all is the open D-011 decision. The recommended default is to ship the no-op adapter and collect only the minimum funnel events once a provider is chosen; a single `configureAnalytics(...)` call in the layout then wires it without touching any component.

- **Governing decision:** D-0011-analytics

### Cookie implications

The no-op adapter sets no cookies and stores nothing, so the launch default has no cookie or consent obligation. A chosen provider's cookie behaviour must be assessed before it is wired; a cookie-setting provider may require a consent mechanism and a privacy page (see below). Cloudflare Web Analytics is cookie-free, which is why it is the recommended provider if any is needed.

- **Governing decision:** D-0011-analytics

### Privacy-policy requirements

`/privacy` is optional (§7): it is only required if analytics, legal advice, or the chosen Calendly treatment demands it. Because the launch default collects nothing, no privacy page is required until a data-collecting provider (or a Calendly treatment that sets cookies) is introduced.

- **Governing decision:** D-0011-analytics

### Data-retention requirements

Nothing is collected at launch, so there is nothing to retain. Once a provider is chosen, retention is set to the minimum the funnel needs, documented here, and never applied to any of the never-tracked data below.

- **Governing decision:** D-0011-analytics

## Events to track

Exactly the adapter's `ANALYTICS_EVENTS`; each carries no payload — a bare
name from a fixed enum.

- `cta_click` — A visitor opened the single booking CTA — the primary conversion event.
- `fit_flow_started` — A visitor began the interactive fit qualifier.
- `fit_flow_completed` — A visitor reached any fit outcome.
- `fit_result_growth` — The qualifier resolved to the growth-fit outcome (a category, never the answers).
- `fit_result_idea` — The qualifier resolved to the idea-fit outcome.
- `fit_result_community` — The qualifier resolved to the community/builder-energy outcome.
- `fit_result_not_current_fit` — The qualifier resolved to the not-current-fit outcome.
- `fit_result_no_fit` — The qualifier resolved to the no-fit outcome.

## Events never tracked

Structurally impossible for the adapter to send (§17.12, §12.4). The fit
qualifier reports which outcome category a visitor reached, never their
answers.

- A visitor's name
- An email address
- Any free text a visitor types
- A revenue or EBITDA figure a visitor enters in the fit qualifier
- Any Calendly booking-form data
