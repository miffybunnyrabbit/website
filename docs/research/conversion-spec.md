# Conversion specification (R-009)

<!-- Generated from src/config/conversionSpec.ts — do not edit by hand. -->

**Plan references:** §17.10 R-009, §13 (final CTA), §20.3 (single CTA configuration), decision D-006.
**Review status:** pending — this document is the plan's working baseline; the exact Calendly URL, event type, UTMs, and email fallback are the open D-0006-calendly decision, and this record may only be marked approved once that decision is recorded.

The site funnels to one conversion event: a qualified visitor opens the
approved Helix Calendly booking page. The mechanism ships in `src/config/cta.ts`
as the single `primaryCta` — one label, one analytics event, and a booking URL
injected at build time — read by the hero, the final CTA, and every fit outcome.

## Fixed configuration

- **CTA label:** LET’S CREATE ENTERPRISE VALUE
- **Conversion event:** `cta_click`
- **Approved booking hosts:** calendly.com
- **Booking URL source:** `PUBLIC_CALENDLY_URL` (injected at build time; never committed)

## Specification

### Exact Calendly URL

Not committed to source. The booking URL is injected at build time from the `PUBLIC_CALENDLY_URL` environment variable (Phase 9.3), so the approved production link is never in the repository and can differ between preview and production. The exact production path and event type are the open D-006 decision; `assertConfiguredCtaValid()` already fails the build if a configured URL is insecure or off an approved Calendly host.

- **Governing decision:** D-0006-calendly

### CTA label

One label site-wide: “LET’S CREATE ENTERPRISE VALUE” (§13). It lives once in `cta.ts` as `PRIMARY_CTA_LABEL`; the hero, final CTA, and every fit outcome read it from `primaryCta`, and `findInconsistentCtaLabels()` catches any component that ships its own wording.

- **Governing decision:** none

### Target behaviour

Same tab. The rendered CTA is a plain outbound link with no `target`, so the visitor navigates to Calendly in place — D-006's recommended default. It is an external link, not an embedded iframe (§5, Booking).

- **Governing decision:** D-0006-calendly

### UTM convention

None applied yet. Any UTM parameters belong on the approved `PUBLIC_CALENDLY_URL`, so they are part of the open D-006 decision rather than assembled in component code. When chosen, they are baked into the single injected URL so every CTA carries the same attribution.

- **Governing decision:** D-0006-calendly

### Analytics event

One event, `cta_click` (§20.3), fired by the delegated click listener in `src/utils/analytics.ts` whenever any element carrying `data-analytics-event="cta_click"` is clicked. Every primary CTA carries that attribute from `primaryCta.analyticsEvent`, and the no-op-safe adapter means the call is a silent no-op until a provider is wired (D-011).

- **Governing decision:** none

### Fallback email

D-006's recommended default is a visible email fallback in the footer for when Calendly is unavailable. No such address is a recorded owner decision yet, so the footer carries no contact email today; it will be added as an approved footer identity fact (tracked with the other footer facts under Q-0010) once the address is confirmed. Until then the footer renders no fallback rather than an invented one.

- **Governing decision:** D-0006-calendly

### Shared outcome event

Yes — all three positive fit outcomes (growth-fit, idea-fit, community-fit) use the same conversion event. Each renders the single `primaryCta`, so each fires the shared `cta_click` on booking, while additionally emitting its own discrete `fit_result_*` event so the funnel can tell the outcomes apart without tracking a visitor's answers (§12.4).

- **Governing decision:** none

### Expected Calendly confirmation behaviour

Owned by Calendly, not this site. After booking, Calendly shows its own confirmation and sends its own emails; the site's responsibility ends at the outbound link. The exact event type and its confirmation copy are part of the D-006 decision and must be checked during the test booking below.

- **Governing decision:** D-0006-calendly

### Test booking procedure

Before launch, set `PUBLIC_CALENDLY_URL` to the approved link, build, and complete a real test booking from a production-like environment: confirm the CTA opens the correct event in the same tab, the confirmation screen and emails arrive, and the booking reaches the intended recipients. Record the result against D-006.

- **Governing decision:** D-0006-calendly

### Who receives booking notifications

Configured in Calendly, outside this repository. Who is notified of a booking is part of the D-006 decision and is verified by the test booking rather than encoded in the site.

- **Governing decision:** D-0006-calendly

## Positive fit outcomes share the conversion event

All three positive outcomes render the single `primaryCta`, so each fires the
shared conversion event on booking, while additionally emitting its own
discrete outcome event (a category, never a visitor's answers):

- `growth-fit` → `fit_result_growth` + `cta_click`
- `idea-fit` → `fit_result_idea` + `cta_click`
- `community-fit` → `fit_result_community` + `cta_click`

