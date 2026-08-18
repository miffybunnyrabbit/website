# Records

Static reference. Nothing here is generated, validated, or enforced by the build
any more — these files are a frozen account of how the site's copy, figures, and
design were arrived at, kept because the reasoning is worth more than the
machinery that used to check it.

Until 2026-08-18 each of these documents was rendered from a TypeScript model
under `src/config/` and cross-checked on every build: a claim could not publish
without a ledger entry, a case study could not render ahead of its approval, a
logo could not appear without recorded permission. That governance layer did its
job — the copy settled, the figures were verified, the launch review was signed
off — and was removed once it had nothing left to gate. It is recoverable in full
from git history if it is ever needed again:

    git log --diff-filter=D --name-only -- src/config/

## What is here

| Directory | What it holds |
| --- | --- |
| `decisions/` | The twelve §6 ambiguities — currency, attribution, EBITDA, fonts, analytics — each with the recommended default that published and, where one was made, the recorded owner decision. |
| `approvals/queue/` | The content and legal approval queue: every claim, asset, and piece of copy that needed sign-off, what published in draft while it waited, and how it was resolved. |
| `research/` | The R-001…R-012 research records: the live-site audit, design tokens, positioning, tone of voice, claims methodology, the engagement model, SEO and redirects, analytics and privacy, and the per-study case-study dossiers. |
| `research/current-site/` | Full-page screenshots of the previous Webflow site at desktop, tablet, and mobile — the visual reference the rebuild was measured against. |

## Reading them now

Two cautions. The status lines are true as of 2026-08-18 and will not update
again, so an "open" decision means open on that date, not open today. And the
cross-references to `src/config/…` name modules that no longer exist — they point
into git history, not the working tree.

The site's live content now lives in plain models under `src/config/`
(`caseStudies.ts`, `logos.ts`, `hero.ts`, `proofBanner.ts`, `footer.ts`, and the
rest), which say what renders and nothing about who approved it.
