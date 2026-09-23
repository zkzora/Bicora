# Bicora — risk intelligence for Bitcoin DeFi on Stacks (v0.1)

**Live:** site https://bicora.xyz · dashboard https://app.bicora.xyz · API base (Phase 2): https://api.bicora.xyz
**Repository:** https://github.com/zkzora/Bicora

Risk intelligence infrastructure for Bitcoin DeFi on Stacks. v0.1 proves three things end to end on **live mainnet data**: Stacks DeFi data can be collected, turned into transparent risk indicators with a documented methodology, and published through a public dashboard and API.

```
Stacks data sources ──▶ Indexer ──▶ Store (PostgreSQL | files) ──▶ Scoring engine ──▶ Snapshot ──▶ API ──▶ Dashboard
  DefiLlama · Hiro API     backend/indexer      backend/shared/db        backend/scoring-engine     api      frontend/dashboard
```

## What is in the box

| Path | What it does |
|---|---|
| `config/protocols.json` | Protocol registry: 5 Stacks protocols (Zest, StackingDAO, Granite, Bitflow, ALEX) with verified contract IDs and sourced transparency fields |
| `backend/indexer` | Scheduled job. Pulls TVL / borrowed history and token breakdown from DefiLlama, contract metadata and 14 days of transaction activity from the Hiro Stacks API |
| `backend/scoring-engine` | Pure, unit-tested scoring functions (methodology v1.0.0), data-quality filters, risk-event detection, snapshot builder |
| `backend/shared` | Types, registry loader, store abstraction (file store by default, PostgreSQL via `DATABASE_URL`), SQL schema + migration |
| `api` | Express API: `/v1/protocol-risk`, `/v1/market-health`, `/v1/risk-alerts`, `/v1/methodology`, `/v1/snapshot` |
| `frontend/dashboard` | Next.js 16 app: marketing site (`/`, `/methodology`, `/docs`) and the dashboard app shell (`/dashboard/...`) |
| `docs/risk-methodology.md` | The published scoring methodology |
| `data/` | File-store output of the last pipeline run (raw records, scores, events, snapshot) |

## Quick start (no database needed)

```bash
git clone https://github.com/zkzora/Bicora.git && cd Bicora
npm install
npm run pipeline      # 1) index live Stacks data  2) score it  -> data/snapshot.json + frontend snapshot
npm run dashboard     # http://localhost:3000
```

The indexer takes 2–5 minutes because the public Hiro API is rate-limited; set `HIRO_API_KEY` in `.env` for higher limits. The committed `frontend/dashboard/src/data/snapshot.json` lets the dashboard build and deploy even without running the pipeline.

Optional live API:

```bash
npm run api           # http://localhost:4000/v1/protocol-risk
API_URL=http://localhost:4000 npm run dashboard   # dashboard reads the API, revalidating every 5 min
```

## With PostgreSQL

```bash
docker compose up -d postgres
cp .env.example .env               # DATABASE_URL=postgres://bicora:bicora@localhost:5432/bicora
npm run db:migrate                 # applies backend/shared/db/schema.sql
npm run pipeline && npm run api
```

Every service picks PostgreSQL automatically when `DATABASE_URL` is set; nothing else changes. Schedule `npm run pipeline` with cron / a GitHub Action / a worker every hour or day; scores and events accumulate per protocol per day.

## Scripts

| Command | Description |
|---|---|
| `npm run index [slug]` | Index all protocols, or one |
| `npm run score` | Compute scores, detect events, write snapshot |
| `npm run pipeline` | Both, in order |
| `npm run api` | Start the API (port `API_PORT`, default 4000) |
| `npm run dashboard` | Next.js dev server |
| `npm run build` | Production build of the dashboard (static + SSG) |
| `npm test` | Scoring-engine unit tests |
| `npm run db:migrate` | Apply the PostgreSQL schema |

## Risk scoring in one paragraph

`overall = 0.30·Liquidity + 0.25·Activity + 0.25·Collateral + 0.20·Transparency`, each 0–100, higher is safer. Liquidity uses TVL depth (log scale), 30-day trend and stability; Activity uses 7-day transactions, unique senders, week-over-week trend and success rate on the protocol's registered entry-point contracts; Collateral uses utilisation and its 7-day change for lending markets (weight redistributed elsewhere); Transparency is a rubric over on-chain source, audits, repo, docs, contract age, governance and bug bounty. Bands: Low 75–100 · Moderate 60–74 · Elevated 40–59 · High 0–39. Full definitions, mappings, data-quality rules and limitations: [docs/risk-methodology.md](docs/risk-methodology.md).

## Adding a protocol

1. Add an entry to `config/protocols.json`: `llamaSlug` (must exist on DefiLlama with a Stacks chain), user-facing entry-point `contracts` (verify each with `https://api.hiro.so/extended/v1/contract/<id>`), and transparency fields with a public source.
2. `npm run index <slug> && npm run score`.
3. The dashboard picks it up automatically (`generateStaticParams`).

## Deployment

- **Frontend**: one Next.js codebase, two Vercel projects from this repo (Root Directory `frontend/dashboard`):
  - *Site* project → domain `bicora.xyz`, env `NEXT_PUBLIC_MODE=site`. Serves `/`, `/methodology`, `/docs`; `/dashboard/*` redirects to the app.
  - *App* project → domain `app.bicora.xyz`, env `NEXT_PUBLIC_MODE=app`. Serves the dashboard at the root (`/`, `/protocols/zest`, `/alerts`, …); `/methodology` and `/docs` redirect to the site.
  - Optional `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_APP_URL` override the defaults above. With no env set (local dev, previews) everything runs on one origin under `/dashboard`.
  - Without `API_URL` both builds serve the committed snapshot, refreshed by the scheduled GitHub Action.
- **API + pipeline**: any Node 20+ host with PostgreSQL (Railway, Fly, Render, a VM). Run the pipeline on a schedule and expose the API; point the dashboard at it with `API_URL`.

## Status against M1

- [x] Working public dashboard (marketing site + dashboard app, 15 static routes)
- [x] Indexed Stacks protocol data (5 protocols, live DefiLlama + Hiro)
- [x] Documented scoring methodology (`docs/risk-methodology.md`, `/methodology`, `/v1/methodology`)
- [x] Required pages: protocol risk overview, individual protocol analysis, methodology, ecosystem metrics (+ alerts, API docs)
- [ ] Initial user testing — next step; the dashboard is ready to share

Phase 2 (per spec): wallet exposure (`/dashboard/wallet` is a documented placeholder), automated alert delivery, hosted API keys.
