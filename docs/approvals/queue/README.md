# Content and legal approval queue

This directory is the human-readable home of the approval queue described in
section 23 of `IMPLEMENTATION_PLAN.md`. Approval is **asynchronous and never
blocks building or publishing the site** — every item here publishes in its
current best-available draft form and the queue only keeps the open work visible.

## Source of truth

The queue is defined and validated in code at
[`src/config/approvalQueue.ts`](../../../src/config/approvalQueue.ts), following
the same "typed, self-validating content model" pattern as the rest of this
repository. That module is canonical: it cross-checks the live content models
(`caseStudies`, `proofBanner`, `logos`) so the build **fails** if any content
that still needs sign-off has no open queue item tracking it, and it **warns**
(non-fatally) with a list of everything currently publishing in draft form.

The one-file-per-item records in this directory (`Q-NNNN-short-title.md`) are
**generated from that model**, not hand-maintained. `approvalQueue.test.ts`
asserts every committed record matches `renderQueueItemMarkdown()` and that no
orphan record exists, so the printable/exportable approver copies can never drift
from the code. `TEMPLATE.md` shows the shape they follow.

To add or change a queue item, edit `src/config/approvalQueue.ts` and its tests,
then regenerate the records (do not edit the `Q-*.md` files by hand). The code
model remains the authority.

## Categories and required approvers (section 23)

| Category | Covers | Required approvers |
|---|---|---|
| A — Strategic copy | hero, partnership model, fit criteria, CTA, no-fit humour, profanity | Helix owner |
| B — Financial claims | `$500m+`, every case-study valuation, multiples, value-created, EV terminology, currency | finance owner, legal reviewer, Helix owner |
| C — Client representation | logos, screenshots, role descriptions, fundraising/valuation claims | relevant client or authorised owner |
| D — Launch review | product/strategy, design, development, copy, finance/legal, final owner | all six reviewers |

## Status lifecycle

`open` → `changes-requested` → `open` → `approved` (or `withdrawn`). When an item
is approved, mark its content model approved and redeploy with the approved
wording. When changes are requested, revise the copy, redeploy, and return the
item to `open`.
