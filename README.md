# Helix Collective Website

Rebuild of the Helix Collective marketing site as a locally runnable, Git-managed
static website. See [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) for the
full brief, decisions, and phase plan.

## Stack

- **Astro** — static HTML generation
- **React** — the interactive "Are we a fit?" qualifier island
- **TypeScript** — strict mode
- **Vitest** — unit tests

## Requirements

Node.js `>=20.3` (see `.nvmrc`). The plan targets Node 24 LTS in CI/Cloudflare;
local development currently pins to the installed Node 20 LTS.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Astro dev server |
| `npm run build` | Build the static site to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | `astro check` + `tsc --noEmit` |
| `npm test` | Run unit tests once |
| `npm run test:watch` | Run unit tests in watch mode |

## Status

Early scaffold. Implemented so far:

- Project scaffold (Astro + React + TypeScript strict + Vitest) with a base
  layout, homepage, and branded 404.
- Pure fit-qualifier state graph (`src/components/fit/fitFlow.ts`) with unit
  tests covering every branch (plan §12.2 / §20.4, P5-001).

Upcoming work follows the phases in `IMPLEMENTATION_PLAN.md`.
