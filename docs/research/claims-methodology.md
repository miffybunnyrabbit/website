# Claims methodology (R-005)

<!-- Generated from src/config/claimsMethodology.ts — do not edit by hand. -->

**Plan references:** §15 (claims discipline), §17.6 R-005.
**Review status:** pending — this document is the plan's working baseline; its application to each figure is signed off through the category-B claim approval-queue items the claims ledger tracks (Q-0001..Q-0005, Q-0007).

This record defines what every quantified claim on the site means before any
figure is published. It invents no verified figures; the per-claim evidence
lives in `docs/research/claims-ledger.csv`, generated from `claimsLedger.ts`.

## Definitions

### 1. What “enterprise value created” means

Helix retains the strategic phrase “enterprise value” in the hero, but every quantified case-study statement is reviewed by finance and legal before publication. Where a disclosed figure is an equity or post-money valuation rather than enterprise value in the strict finance sense, the ledger records which measure the figure is and the copy uses “value” or “company value” rather than asserting enterprise value.

- **Governing decision:** D-0002-enterprise-value-terminology

### 2. Attribution standard

Claims are phrased as “value created during Helix’s engagement, with Helix contributing through…” and never as “Helix created $X” implying sole causation. The defensible claim is bounded to the engagement window; Helix is never credited with the entire valuation movement unless the evidence supports that.

- **Governing decision:** D-0003-attribution

### 3. Currency treatment

The $500M+ headline publishes deliberately currency-neutral. A case-study figure uses A$ where it is an Australian-dollar valuation and the actual local currency where the source is in another currency. Mixed currencies are never aggregated into a single figure without a documented conversion rate and its date.

- **Governing decision:** D-0001-currency

### 4. Valuation-date convention

Every figure records the date and source of the value it cites and distinguishes value at engagement start, value at end of engagement, and current value. The default measure is value created across the engagement window — entry to end-of-engagement — not value movement after Helix left.

- **Governing decision:** none

### 5. How a multiple is calculated

A stated multiple is end-of-engagement value divided by entry value for the same measure and the same currency. The measure (equity valuation, enterprise value, or another) is recorded alongside it. A multiple never mixes measures or currencies.

- **Governing decision:** none

### 6. How debt, cash, and funding facilities are treated

Debt raised, cash, funding facilities, securitisation programmes, assets financed through a platform, and total capital deployed are not company valuation and are never presented as such (the Ferovinum guardrail, §9.2). Enterprise value is computed as equity value plus net debt only where that computation is evidenced; otherwise the copy states the measure that is actually available.

- **Governing decision:** none

### 7. Whether a current post-engagement value may be cited

A current, post-engagement valuation may be cited only as dated context, clearly separated from the engagement-window claim and never phrased to imply continuous Helix involvement after the engagement ended.

- **Governing decision:** none

### 8. What counts toward the $500M+ headline

A case study’s value-created figure counts toward the $500M+ headline only when it is at least internally verified, not rejected, and expressed on (or converted to) the headline’s currency basis. The headline is a sum of per-engagement value-created figures — never equity valuations, funding capacity, or assets financed.

- **Governing decision:** none

### 9. How double counting is prevented

Each engagement contributes its value-created figure to the headline at most once. Overlapping measures for the same company (for example a valuation and a value-created figure) are never both counted; the ledger’s one-claim-per-target rule enforces a single governed figure per piece of published copy.

- **Governing decision:** none

### 10. Minimum evidence required for publication

No figure publishes as approved without a dated source for entry and end-of-engagement value, the measure and currency, the attribution basis, and finance, legal, and owner sign-off (approval category B). Until then the claim publishes in its best-available, tracked wording under an open approval-queue item (§20.1, §23) rather than being represented as approved.

- **Governing decision:** none

## Metric-type glossary

### `enterprise-value` — Enterprise value created

- **Meaning:** The value created for a single company, subject to the enterprise-value definition and finance/legal review of the measure actually used.
- **Calculation:** End-of-engagement value minus entry value for the agreed, recorded measure (D-002); reviewed before publication.

### `value-created` — Value created during the engagement

- **Meaning:** The value-creation figure attributed to the engagement window, phrased under the attribution standard.
- **Calculation:** Recorded as value created during Helix’s engagement (D-003), bounded to the engagement window and not subsequent movement.

### `value-multiple` — Value multiple

- **Meaning:** The growth multiple in value over the engagement.
- **Calculation:** End-of-engagement value divided by entry value for the same measure and currency (see the multiple-calculation rule).

### `portfolio-enterprise-value` — Portfolio enterprise value created ($500M+)

- **Meaning:** The aggregate headline figure across engagements.
- **Calculation:** Sum of internally-verified, non-rejected per-engagement value-created figures on one currency basis, with no double counting (see the portfolio-headline-inclusion and double-counting-prevention rules).

