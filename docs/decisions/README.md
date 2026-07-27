# Decisions

This directory is the human-readable home of the open decisions described in
section 6 of `IMPLEMENTATION_PLAN.md`. Under the section 2 source-of-truth
hierarchy, **written owner decisions recorded here outrank the plan, the live
site, and any assumption** — so no important decision should live only in Slack,
email, or a developer's memory.

Implementation and publication **proceed before these are resolved**: every
decision publishes its recommended default until the owner decision lands, then
the affected copy is updated.

## Source of truth

The decisions are defined and validated in code at
[`src/config/decisions.ts`](../../src/config/decisions.ts), following the same
"typed, self-validating content model" pattern as the rest of this repository.
That module is canonical: it lists all twelve section-6 decisions, links each to
the approval-queue item tracking it (section 23) where one exists, and
cross-checks the live content-model gates so the build **fails** if a gate (the
proof-banner currency, the hero performance-linked claim, the engagement-model
review) is marked approved without its decision being recorded as `decided`.

The one-file-per-decision records in this directory (`NNNN-short-title.md`) are
**generated from that model**, not hand-maintained. `decisions.test.ts` asserts
every committed record matches `renderDecisionMarkdown()` and that no orphan
record exists, so the printable decision records can never drift from the code.
`TEMPLATE.md` shows the shape they follow.

To record a decision, edit `src/config/decisions.ts` (flip the entry to `decided`
and add the decision note, date, and decider), update the affected content model
and its approval-queue item, then regenerate these records — do not edit the
`NNNN-*.md` files by hand.

## Status lifecycle

`open` → `decided`. While `open`, the decision publishes its recommended default.
When `decided`, the decision note is recorded here, the affected content model is
updated (and any content gate flipped to approved), and the site is redeployed
with the decided wording.
