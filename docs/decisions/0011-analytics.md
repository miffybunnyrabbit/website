# D-0011-analytics — Analytics


- **Status:** open
- **Approval-queue item:** none (see notes)
- **Content gate:** none

## Ambiguity

Whether launch needs Cloudflare Web Analytics, an existing GA/GTM property, or no analytics is unconfirmed (see the no-op analytics adapter).

## Recommended default (published until decided)

Ship the no-op-safe analytics adapter that collects nothing until a provider is chosen; never send qualification answers as personally identifiable data.

## Notes

Engineering/privacy call with no content/legal-approval queue item; tracked here and in src/utils/analytics.ts, not in the approval queue.

## Decision

_No decision recorded yet — this item is open and publishing its recommended default._
