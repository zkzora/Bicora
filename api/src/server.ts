/**
 * Bicora Risk Layer — public API (v1)
 *
 *   GET /health
 *   GET /v1/snapshot                       full denormalised snapshot (what the dashboard renders)
 *   GET /v1/protocol-risk?protocol=&window= protocol scores, components, history
 *   GET /v1/market-health                  ecosystem aggregates
 *   GET /v1/risk-alerts?since=&kind=       detected risk events
 *   GET /v1/methodology                    weights, bands, version
 *
 * Reads the latest snapshot from the store (PostgreSQL when DATABASE_URL is set, otherwise ./data).
 */
import express from 'express';
import { createStore, log, METHODOLOGY_VERSION } from '@bicora/shared';
import type { Snapshot } from '@bicora/shared';

const info = log('api');
const app = express();
const PORT = Number(process.env.API_PORT ?? 4000);
const CACHE_MS = 60_000;

const store = await createStore();
let cache: { at: number; snap: Snapshot | null } = { at: 0, snap: null };

async function snapshot(): Promise<Snapshot | null> {
  if (Date.now() - cache.at > CACHE_MS) cache = { at: Date.now(), snap: await store.getSnapshot() };
  return cache.snap;
}

app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=60');
  next();
});

app.get('/health', async (_req, res) => {
  const snap = await snapshot();
  res.json({ ok: true, store: store.kind, snapshotAt: snap?.generatedAt ?? null, methodology: METHODOLOGY_VERSION });
});

app.get('/v1/snapshot', async (_req, res) => {
  const snap = await snapshot();
  if (!snap) return res.status(503).json({ error: 'no snapshot yet — run the pipeline' });
  res.json(snap);
});

app.get('/v1/protocol-risk', async (req, res) => {
  const snap = await snapshot();
  if (!snap) return res.status(503).json({ error: 'no snapshot yet' });
  const window = ({ '7d': 7, '30d': 30, '90d': 90 } as Record<string, number>)[String(req.query.window ?? '30d')] ?? 30;
  const slug = req.query.protocol ? String(req.query.protocol) : null;
  const list = snap.protocols.filter((p) => !slug || p.slug === slug);
  if (slug && !list.length) return res.status(404).json({ error: `unknown protocol '${slug}'` });
  res.json({
    updated_at: snap.generatedAt,
    methodology_version: snap.methodologyVersion,
    protocols: list.map((p) => ({
      protocol: p.slug,
      name: p.name,
      category: p.category,
      overall_score: p.score.overall,
      band: p.score.band,
      liquidity_score: p.score.components[0].score,
      activity_score: p.score.components[1].score,
      collateral_health: p.score.components[2].score,
      transparency_score: p.score.components[3].score,
      effective_weights: p.score.effectiveWeights,
      liquidity_usd: p.metrics.tvlUsd,
      borrowed_usd: p.metrics.borrowedUsd,
      utilization: p.metrics.utilization,
      tx_7d: p.metrics.tx7d,
      unique_senders_7d: p.metrics.uniqueSenders7d,
      score_delta_7d: p.delta7d,
      components: p.score.components,
      tvl_history: p.tvlHistory.slice(-window),
      score_history: p.scoreHistory.slice(-window),
    })),
  });
});

app.get('/v1/market-health', async (_req, res) => {
  const snap = await snapshot();
  if (!snap) return res.status(503).json({ error: 'no snapshot yet' });
  const m = snap.market;
  res.json({
    updated_at: snap.generatedAt,
    protocols: m.protocolsTracked,
    liquidity_usd: m.totalTvlUsd,
    liquidity_change_7d: m.totalTvlChange7d,
    liquidity_change_30d: m.totalTvlChange30d,
    active_addresses_7d: m.activeAddresses7d,
    transactions_7d: m.tx7d,
    avg_risk_score: m.avgScore,
    band_distribution: m.bandDistribution,
    tvl_history: m.ecosystemTvlHistory,
  });
});

app.get('/v1/risk-alerts', async (req, res) => {
  const since = req.query.since ? String(req.query.since) : undefined;
  const kind = req.query.kind ? String(req.query.kind) : undefined;
  const events = (await store.getEvents(since)).filter((e) => !kind || e.kind === kind).slice(0, 200);
  res.json({ events });
});

app.get('/v1/methodology', (_req, res) => {
  res.json({
    version: METHODOLOGY_VERSION,
    scale: '0-100, higher is safer',
    weights: { liquidity: 0.3, activity: 0.25, collateral: 0.25, transparency: 0.2 },
    bands: { Low: '75-100', Moderate: '60-74', Elevated: '40-59', High: '0-39' },
    docs: 'https://bicora.xyz/methodology',
  });
});

app.listen(PORT, () => info(`listening on http://localhost:${PORT} (store: ${store.kind})`));
