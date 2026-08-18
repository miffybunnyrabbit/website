# D-0005-capacity-no-branch — Missing “No” branch for the capacity question


- **Status:** decided
- **Approval-queue item:** Q-0008-strategic-copy
- **Content gate:** none

## Ambiguity

The fit flow does not define the outcome when an in-range business cannot double sales through added delivery capacity.

## Recommended default (published until decided)

Show a polite “not the right growth lever today” outcome with the Redfern address; do not route the visitor into the “great idea” path.

## Decision

Adopt the recommended default, confirmed with the strategic copy via Q-0008: an in-range business that cannot double sales on added capacity lands on the `not-current-fit` outcome (“WE MAY NOT BE THE RIGHT GROWTH LEVER—YET.”) with the Redfern address and no booking push, and is never re-routed into the 0 → 1 idea branch. `fitFlow.ts` already implements exactly this.

- **Decision date:** 2026-08-18
- **Decided by:** Helix owner (jeeva@helixcollective.com)
