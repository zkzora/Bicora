/**
 * Bicora Risk Layer — Scoring Engine
 *
 * Reads ProtocolRaw records from the store, computes risk scores (methodology v1.0.0),
 * detects risk events, and writes a denormalised Snapshot that the API and dashboard serve.
 *
 * Run: npm run score
 * Also writes frontend/dashboard/src/data/snapshot.json so the dashboard can be built statically.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { createStore, loadRegistry, log, pctChange, REPO_ROOT, METHODOLOGY_VERSION } from '@btcfi/shared';
import type { Band, RiskEvent, Snapshot, SnapshotProtocol, TvlPoint } from '@btcfi/shared';
import { backfillLiquidity, band, cleanTvlHistory, pointDaysAgo, scoreProtocol } from './scoring.js';
import { detectEvents } from './events.js';

const info = log('scoring');

async function main() {
  const store = await createStore();
  const registry = loadRegistry();
  const raws = await store.getAllRaw();
  const now = new Date();
  info(`store: ${store.kind}; raw records: ${raws.length}`);
  if (!raws.length) {
    info('nothing to score — run the indexer first (npm run index)');
    await store.close();
    process.exitCode = 1;
    return;
  }

  const protocols: SnapshotProtocol[] = [];
  const allEvents: RiskEvent[] = [];
  const scores = [];

  for (const cfg of registry) {
    const raw = raws.find((r) => r.slug === cfg.slug);
    if (!raw) {
      info(`${cfg.slug}: no raw data, skipped`);
      continue;
    }
    const history = await store.getScoreHistory(cfg.slug, 120);
    const previous = history.filter((p) => p.date < now.toISOString().slice(0, 10)).at(-1);
    const score = scoreProtocol(cfg, raw, now);
    scores.push(score);
    const events = detectEvents(raw, score, previous, cfg.name);
    allEvents.push(...events);

    const clean = cleanTvlHistory(raw.tvl.history);
    const h = clean.history;
    const ago7 = history.filter((p) => p.date <= new Date(now.getTime() - 7 * 864e5).toISOString().slice(0, 10)).at(-1);
    const borrowed = raw.tvl.borrowedUsd;
    protocols.push({
      slug: cfg.slug,
      name: cfg.name,
      category: cfg.category,
      description: cfg.description,
      website: cfg.website,
      docs: cfg.docs,
      github: cfg.github,
      assets: cfg.assets,
      contracts: raw.contracts,
      hasCollateral: cfg.hasCollateral,
      metrics: {
        tvlUsd: raw.tvl.currentUsd,
        borrowedUsd: borrowed,
        utilization: borrowed != null && raw.tvl.currentUsd + borrowed > 0 ? borrowed / (raw.tvl.currentUsd + borrowed) : null,
        tvlChange24h: pctChange(raw.tvl.currentUsd, pointDaysAgo(h, 1)?.tvlUsd),
        tvlChange7d: pctChange(raw.tvl.currentUsd, pointDaysAgo(h, 7)?.tvlUsd),
        tvlChange30d: pctChange(raw.tvl.currentUsd, pointDaysAgo(h, 30)?.tvlUsd),
        tx7d: raw.activity.current7d.txCount,
        uniqueSenders7d: raw.activity.current7d.uniqueSenders,
        activitySampled: raw.activity.current7d.sampled,
        tokens: raw.tvl.tokens,
      },
      dataQuality: { excludedTvlPoints: clean.excluded, note: clean.note, activitySampled: raw.activity.current7d.sampled, warnings: raw.errors },
      score,
      delta7d: ago7 ? score.overall - ago7.overall : null,
      tvlHistory: h.slice(-90),
      liquidityScoreHistory: backfillLiquidity(h, 90),
      scoreHistory: [...history.filter((p) => p.date !== now.toISOString().slice(0, 10)), {
        date: now.toISOString().slice(0, 10),
        overall: score.overall,
        liquidity: score.components[0].score,
        activity: score.components[1].score,
        collateral: score.components[2].score,
        transparency: score.components[3].score,
      }],
      events,
    });
    info(`${cfg.slug}: overall ${score.overall} (${score.band}) — ` + score.components.map((c) => `${c.key}=${c.score ?? 'n/a'}`).join(' '));
  }

  // Ecosystem aggregates.
  protocols.sort((a, b) => b.score.overall - a.score.overall);
  // Sum protocol TVL on a common daily calendar; adapters skip days, so forward-fill each series.
  const days = Array.from({ length: 91 }, (_, i) => new Date(now.getTime() - (90 - i) * 864e5).toISOString().slice(0, 10));
  const complete: TvlPoint[] = days.map((date) => ({ date, tvlUsd: 0 }));
  for (const p of protocols) {
    const full = cleanTvlHistory(raws.find((r) => r.slug === p.slug)!.tvl.history).history;
    let j = 0;
    let last: number | null = null;
    for (const d of complete) {
      while (j < full.length && full[j].date <= d.date) last = full[j++].tvlUsd;
      if (last != null) d.tvlUsd += last;
    }
  }
  // Use the live figure for today so the series ends at the same number the tiles show.
  complete[complete.length - 1].tvlUsd = protocols.reduce((s, p) => s + p.metrics.tvlUsd, 0);
  const totalTvl = protocols.reduce((s, p) => s + p.metrics.tvlUsd, 0);
  const bandDistribution: Record<Band, number> = { Low: 0, Moderate: 0, Elevated: 0, High: 0 };
  for (const p of protocols) bandDistribution[p.score.band]++;

  // Bicora Risk Index: mean of protocol scores per day, from each protocol's stored score history.
  const byDate = new Map<string, number[]>();
  for (const p of protocols) for (const pt of p.scoreHistory) byDate.set(pt.date, [...(byDate.get(pt.date) ?? []), pt.overall]);
  const indexHistory = [...byDate.entries()]
    .filter(([, v]) => v.length === protocols.length) // only days where every protocol was scored
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, v]) => ({ date, score: Math.round(v.reduce((s, x) => s + x, 0) / v.length) }));
  const indexScore = Math.round(protocols.reduce((s, p) => s + p.score.overall, 0) / protocols.length);
  const today = now.toISOString().slice(0, 10);
  const indexAt = (daysAgo: number) => {
    const target = new Date(now.getTime() - daysAgo * 864e5).toISOString().slice(0, 10);
    const pts = indexHistory.filter((x) => x.date <= target);
    return pts.length ? pts[pts.length - 1].score : null;
  };
  const previousIdx = indexHistory.filter((x) => x.date < today).at(-1)?.score ?? null;
  const idx7 = indexAt(7);
  const idx30 = indexAt(30);

  // Persist events from this run (deduplicated by id in the store) and gather the recent feed.
  await store.saveScores(scores);
  const known = new Set((await store.getEvents()).map((e) => e.id));
  await store.saveEvents(allEvents.filter((e) => !known.has(e.id)));
  const feed = (await store.getEvents(new Date(now.getTime() - 30 * 864e5).toISOString())).slice(0, 100);

  const snapshot: Snapshot = {
    generatedAt: now.toISOString(),
    methodologyVersion: METHODOLOGY_VERSION,
    market: {
      protocolsTracked: protocols.length,
      totalTvlUsd: totalTvl,
      totalTvlChange7d: pctChange(totalTvl, pointDaysAgo(complete, 7)?.tvlUsd),
      totalTvlChange30d: pctChange(totalTvl, pointDaysAgo(complete, 30)?.tvlUsd),
      activeAddresses7d: protocols.reduce((s, p) => s + p.metrics.uniqueSenders7d, 0),
      tx7d: protocols.reduce((s, p) => s + p.metrics.tx7d, 0),
      avgScore: indexScore,
      index: {
        score: indexScore,
        band: band(indexScore),
        previous: previousIdx,
        change7d: idx7 == null ? null : indexScore - idx7,
        change30d: idx30 == null ? null : indexScore - idx30,
        history: indexHistory.slice(-180),
      },
      bandDistribution,
      ecosystemTvlHistory: complete.slice(-90),
    },
    protocols,
    events: feed,
  };

  await store.saveSnapshot(snapshot);
  const out = path.join(REPO_ROOT, 'frontend', 'dashboard', 'src', 'data');
  mkdirSync(out, { recursive: true });
  writeFileSync(path.join(out, 'snapshot.json'), JSON.stringify(snapshot));
  await store.recordRun('scoring', 'ok', `${protocols.length} protocols scored, ${allEvents.length} events`);
  info(`snapshot written (${protocols.length} protocols, ${feed.length} events in feed) -> ${path.join(out, 'snapshot.json')}`);
  await store.close();
}

main();
