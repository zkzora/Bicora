# Bicora

Risk intelligence for Bitcoin DeFi on Stacks.

## Why

As Bitcoin liquidity moves into Stacks DeFi through sBTC, there is no standardized, transparent way to assess protocol risk. Bicora turns on-chain and protocol data into explainable risk scores: every score is built from published factors and weights, and every factor shows the observed value behind it.

## Who it's for

- **Capital providers and LPs**: compare protocols on liquidity, activity, collateral and transparency before allocating.
- **Protocol teams**: see how your protocol is scored, which factors weigh on it, and what data the score is based on.
- **Wallet and app developers**: use standardized risk indicators from the v1 API (self-hosted today) in your own product.
- **Analysts and researchers**: work from a documented methodology and an open, reproducible pipeline.

## Live

- Site: https://bicora.xyz
- Dashboard: https://app.bicora.xyz

Current release: v0.1, methodology v1.0.0. Five protocols are tracked: Zest, StackingDAO, Granite, Bitflow and ALEX. Data refreshes every 6 hours.

![Bicora dashboard overview](docs/assets/dashboard.png)

*Dashboard overview at app.bicora.xyz, captured 2026-09-23.*

## How it works

v0.1 proves three things end to end on live mainnet data: Stacks DeFi data can be collected, turned into transparent risk indicators with a documented methodology, and published through a public dashboard and a v1 API that you can run locally or self-host.

```
Stacks data sources ──▶ Indexer ──▶ Store (PostgreSQL | files) ──▶ Scoring engine ──▶ Snapshot ──▶ API ──▶ Dashboard
  DefiLlama · Hiro API     backend/indexer      backend/shared/db        backend/scoring-engine     api      frontend/dashboard
```

A scheduled GitHub Action (`.github/workflows/update-data.yml`) runs the indexer and scoring engine every 6 hours and commits the new snapshot; each commit triggers a rebuild of the site and dashboard.

## Risk scoring

`overall = 0.30·Liquidity + 0.25·Activity + 0.25·Collateral + 0.20·Transparency`, each 0–100, higher is safer. Liquidity uses TVL depth (log scale), 30-day trend and stability; Activity uses 7-day transactions, unique senders, week-over-week trend and success rate on the protocol's registered entry-point contracts; Collateral uses utilisation and its 7-day change for lending markets (weight redistributed elsewhere); Transparency is a rubric over on-chain source, audits, repo, docs, contract age, governance and bug bounty. Bands: Low 75–100 · Moderate 60–74 · Elevated 40–59 · High 0–39. Full definitions, mappings, data-quality rules and limitations: [docs/risk-methodology.md](docs/risk-methodology.md).

Scores have known limitations (for example, activity counts only direct calls to registered contracts); see [Known limitations](docs/risk-methodology.md#5-known-limitations-v01).

## API

The v1 API currently runs locally or self-hosted. A hosted public API is on the [roadmap](#roadmap).

| Endpoint | Returns |
|---|---|
| `GET /health` | Service status, store type, snapshot time, methodology version |
| `GET /v1/snapshot` | The full snapshot the dashboard renders |
| `GET /v1/protocol-risk?protocol=&window=` | Scores, components with every factor, effective weights and history. `protocol` is a slug (omit for all); `window` is `7d`, `30d` (default) or `90d` |
| `GET /v1/market-health` | Ecosystem totals, average score, band distribution, 90-day TVL series |
| `GET /v1/risk-alerts?since=&kind=` | Detected risk events; `since` is ISO 8601, `kind` is `liquidity`, `activity`, `collateral`, `transparency` or `score` |
| `GET /v1/methodology` | Methodology version, weights and bands |

Example, run against the committed data:

```bash
npm run api
curl "http://localhost:4000/v1/protocol-risk?protocol=zest&window=7d"
```

Response (real output; `components`, `factors`, `tvl_history` and `score_history` trimmed to their first entry):

```json
{
  "updated_at": "2026-09-23T04:55:28.805Z",
  "methodology_version": "1.0.0",
  "protocols": [
    {
      "protocol": "zest",
      "name": "Zest Protocol",
      "category": "Lending",
      "overall_score": 74,
      "band": "Moderate",
      "liquidity_score": 71.5,
      "activity_score": 39.6,
      "collateral_health": 94.2,
      "transparency_score": 93.8,
      "effective_weights": { "liquidity": 30, "activity": 25, "collateral": 25, "transparency": 20 },
      "liquidity_usd": 73998112.4128,
      "borrowed_usd": 14922635.02884,
      "utilization": 0.16781949610392047,
      "tx_7d": 104,
      "unique_senders_7d": 34,
      "score_delta_7d": null,
      "components": [
        {
          "key": "liquidity",
          "label": "Liquidity Health",
          "weight": 0.3,
          "score": 71.5,
          "factors": [
            {
              "key": "depth",
              "label": "Liquidity depth (TVL)",
              "value": "$74.0M",
              "raw": 73998112.4128,
              "score": 71.7,
              "weight": 0.5,
              "explanation": "Deep liquidity: $74.0M locked places it among the largest pools on Stacks."
            }
          ],
          "explanation": "Deep liquidity: $74.0M locked places it among the largest pools on Stacks. TVL was broadly flat over 30 days (+3.2%). Moderate swings: 15% max drawdown in 30 days."
        }
      ],
      "tvl_history": [{ "date": "2026-09-23", "tvlUsd": 73998112, "borrowedUsd": 14922635 }],
      "score_history": [{ "date": "2026-09-23", "overall": 74, "liquidity": 71.5, "activity": 39.6, "collateral": 94.2, "transparency": 93.8 }]
    }
  ]
}
```

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

## Repository structure

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
| `.github/workflows/update-data.yml` | Runs the pipeline every 6 hours and commits the refreshed snapshot |

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

## Roadmap

### M1: Risk Intelligence Index MVP

- [x] Public dashboard
- [x] 5 protocols indexed
- [x] Documented methodology
- [x] Repository and technical docs
- [ ] Protocol-level and wallet-level exposure metrics
- [ ] User testing (target: 100 unique users or analyzed wallets)

### M2: Risk API and Developer Infrastructure

- [ ] Hosted public API with documentation
- [ ] API keys and rate limits
- [ ] Risk monitoring and alerts (webhook, Telegram)
- [ ] External developer testing (target: 3+ projects, 1,000+ API requests)
- [ ] Public progress report

### M3: Ecosystem Adoption and Production Readiness

- [ ] Production monitoring and reliability
- [ ] Expanded protocol coverage
- [ ] Wallet exposure for lending positions
- [ ] 5+ active ecosystem users or integrations
- [ ] Public adoption report

## Disclaimer

Bicora scores are analytics, not financial advice or a security audit. Scores reflect public data and a published methodology, and can be wrong or incomplete.

## License

[MIT](LICENSE)

## Contact

Open an issue at [github.com/zkzora/Bicora/issues](https://github.com/zkzora/Bicora/issues), or email [zkzora01@gmail.com](mailto:zkzora01@gmail.com).
