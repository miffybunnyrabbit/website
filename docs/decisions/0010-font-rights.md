# D-0010-font-rights — Font rights


- **Status:** decided
- **Approval-queue item:** none (see notes)
- **Content gate:** none

## Ambiguity

The live site's actual font family and licensing must be audited before any commercial font is self-hosted.

## Recommended default (published until decided)

Use a high-quality, approved, metrically similar fallback unless the original font can legally be used.

## Notes

Design/engineering licensing call with no content/legal-approval queue item; tracked here and in the design-token work, not in the approval queue.

## Decision

Self-host the live site's own families, identified by the 2026-07-29 computed-value audit: Oswald 700 (display) and Roboto 400–700 (body). Both are Google Fonts under open licences (Oswald: SIL OFL 1.1; Roboto: Apache 2.0), so self-hosting is permitted; latin woff2 subsets are committed under public/fonts/ and preloaded per P3-003.

- **Decision date:** 2026-07-29
- **Decided by:** Helix owner (jeeva@helixcollective.com)
