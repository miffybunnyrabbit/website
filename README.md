# Helix Collective Website

Rebuild of the Helix Collective marketing site as a locally runnable, Git-managed
static website. The build plan it was written against is retired — the brief,
decisions, and phase plan live in git history (`git log --follow --
IMPLEMENTATION_PLAN.md`). The live governance records are the ones the build
itself validates: `docs/decisions/`, `docs/approvals/queue/`, and
`docs/research/`.

## Stack

- **Astro** — static HTML generation
- **React** — the interactive "Are we a fit?" qualifier island
- **TypeScript** — strict mode
- **Vitest** — unit tests

## Requirements

Node.js `>=20.3` (see `.nvmrc`). The plan targets Node 24 LTS in CI/Cloudflare;
local development currently pins to the installed Node 20 LTS.

## Quick start

```sh
nvm use              # Node 20, per .nvmrc
npm ci               # install exactly the locked dependencies
cp .env.example .env # then edit .env if you have a booking URL (see below)
npm run dev          # serve the site at http://localhost:4321
```

`.env` is optional. `PUBLIC_CALENDLY_URL` is the booking link behind the single
site-wide CTA and is injected at build time — see
[`.env.example`](./.env.example) for the constraints (https, on an approved
Calendly host). Without it the build only **warns** and the CTA renders without a
link; a set-but-insecure or off-host value **fails** the build.

Analytics are optional and env-driven. Set `PUBLIC_GA_MEASUREMENT_ID` in
Cloudflare Pages to load GA4 page views and custom funnel events such as
`cta_click`; set `PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` to load Cloudflare Web
Analytics for visit measurement. Without those values, the provider scripts are
not rendered and the local site remains no-op-safe.

Every build prints an **approval queue** report: the content still awaiting
sign-off (`docs/approvals/queue/`) that publishes in draft form. Two homepage
areas intentionally render **empty** until their queue items are approved — the
proof banner's `$500m+` figure (Q-0007) and the client logo marquee (Q-0006).
That is expected in dev, not a bug.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Astro dev server |
| `npm run build` | Build the static site to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | `astro check` + `tsc --noEmit` |
| `npm test` | Run unit tests once |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run verify` | Full gate: typecheck + tests + build (what CI runs) |

## Status

Early scaffold. Implemented so far:

- Project scaffold (Astro + React + TypeScript strict + Vitest) with a base
  layout, homepage, and branded 404.
- Pure fit-qualifier state graph (`src/components/fit/fitFlow.ts`) with unit
  tests covering every branch (plan §12.2 / §20.4, P5-001).
- GitHub Actions CI (`.github/workflows/ci.yml`) that runs `npm run verify` on
  every push to `main` and pull request, rendered from a validated model
  (`src/config/ci.ts`, plan §9.1).

Outstanding work is whatever the build reports: every run prints the open
approval-queue items and the §6 decisions still publishing a recommended
default.
