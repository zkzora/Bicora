import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ProtocolConfig, ProtocolRaw, TvlPoint } from '@btcfi/shared';
import { activityFactors, band, collateralFactors, liquidityFactors, maxDrawdown, piecewise, scoreProtocol, weightedMean } from './scoring.js';

const day = (i: number) => new Date(Date.UTC(2026, 7, 1) + i * 864e5).toISOString().slice(0, 10);
const series = (n: number, f: (i: number) => number, borrowed?: (i: number) => number): TvlPoint[] =>
  Array.from({ length: n }, (_, i) => ({ date: day(i), tvlUsd: f(i), ...(borrowed ? { borrowedUsd: borrowed(i) } : {}) }));

const cfg: ProtocolConfig = {
  slug: 'x', name: 'X', category: 'Lending', description: '', website: 'https://x', docs: 'https://docs', github: 'https://gh',
  llamaSlug: 'x', hasCollateral: true, assets: [], contracts: [{ id: 'SP1.a', role: 'core' }],
  audits: [{ name: 'a', url: 'u' }, { name: 'b', url: 'u' }], governance: 'dao', bugBounty: null,
};
const raw = (over: Partial<ProtocolRaw> = {}): ProtocolRaw => ({
  slug: 'x', fetchedAt: day(40), errors: [],
  tvl: { currentUsd: 50e6, borrowedUsd: 10e6, history: series(40, () => 50e6, () => 10e6), tokens: {} },
  activity: {
    current7d: { days: 7, txCount: 1000, uniqueSenders: 300, successRate: 0.98, coverageDays: 7, sampled: false, byContract: {} },
    prior7d: { days: 7, txCount: 900, uniqueSenders: 280, successRate: 0.98, coverageDays: 7, sampled: false, byContract: {} },
  },
  contracts: [{ id: 'SP1.a', role: 'core', found: true, sourceBytes: 1000, deployedAt: '2024-01-01T00:00:00Z', blockHeight: 1 }],
  ...over,
});

test('piecewise interpolates and clamps', () => {
  const pts: [number, number][] = [[0, 0], [10, 100]];
  assert.equal(piecewise(5, pts), 50);
  assert.equal(piecewise(-1, pts), 0);
  assert.equal(piecewise(11, pts), 100);
});

test('bands follow the published thresholds', () => {
  assert.equal(band(75), 'Low');
  assert.equal(band(74), 'Moderate');
  assert.equal(band(60), 'Moderate');
  assert.equal(band(59), 'Elevated');
  assert.equal(band(39), 'High');
});

test('liquidity depth is log-scaled: $10M -> 50, $100M -> 75', () => {
  const f10 = liquidityFactors(series(40, () => 10e6), 10e6).find((f) => f.key === 'depth')!;
  const f100 = liquidityFactors(series(40, () => 100e6), 100e6).find((f) => f.key === 'depth')!;
  assert.equal(f10.score, 50);
  assert.equal(f100.score, 75);
});

test('a 40% TVL crash scores worse than a flat series', () => {
  const flat = weightedMean(liquidityFactors(series(40, () => 50e6), 50e6))!;
  const crash = weightedMean(liquidityFactors(series(40, (i) => (i < 30 ? 50e6 : 30e6)), 30e6))!;
  assert.ok(crash < flat - 20, `crash ${crash} should be well below flat ${flat}`);
});

test('max drawdown', () => {
  assert.equal(maxDrawdown([100, 80, 90, 50, 70]), 0.5);
  assert.equal(maxDrawdown([1, 2, 3]), 0);
});

test('collateral: utilisation over 90% scores low; no borrowed data -> empty factors', () => {
  const hot = collateralFactors(cfg, raw({ tvl: { currentUsd: 5e6, borrowedUsd: 95e6, history: [], tokens: {} } }))!;
  assert.ok(hot.find((f) => f.key === 'utilization')!.score! <= 20);
  const none = collateralFactors(cfg, raw({ tvl: { currentUsd: 5e6, borrowedUsd: null, history: [], tokens: {} } }))!;
  assert.equal(none.length, 0);
  assert.equal(collateralFactors({ ...cfg, hasCollateral: false }, raw()), null);
});

test('activity extrapolates sampled windows and excludes trend when prior week is missing', () => {
  const f = activityFactors({
    current7d: { days: 7, txCount: 500, uniqueSenders: 100, successRate: 1, coverageDays: 3.5, sampled: true, byContract: {} },
    prior7d: null,
  });
  assert.equal(f.find((x) => x.key === 'tx7d')!.raw, 1000);
  assert.equal(f.find((x) => x.key === 'trend7d')!.score, null);
});

test('overall redistributes weight when collateral is not applicable', () => {
  const s = scoreProtocol({ ...cfg, hasCollateral: false }, raw());
  assert.equal(s.effectiveWeights.collateral, 0);
  const sum = Object.values(s.effectiveWeights).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 100) < 0.5, `weights sum to ${sum}`);
  assert.ok(s.overall >= 0 && s.overall <= 100);
  assert.equal(s.band, band(s.overall));
});

test('overall equals the weighted mean of components', () => {
  const s = scoreProtocol(cfg, raw());
  const expected = Math.round(s.components.reduce((acc, c) => acc + (c.score ?? 0) * (s.effectiveWeights[c.key] / 100), 0));
  assert.equal(s.overall, expected);
});

test('transient adapter outliers are excluded, an ongoing collapse is kept', async () => {
  const { cleanTvlHistory } = await import('./scoring.js');
  const outage = series(60, (i) => (i >= 20 && i < 40 ? 0.1e6 : 30e6));
  const c = cleanTvlHistory(outage);
  assert.equal(c.excluded, 20);
  assert.equal(c.history.length, 40);
  const collapse = series(60, (i) => (i >= 40 ? 0.1e6 : 30e6));
  assert.equal(cleanTvlHistory(collapse).excluded, 0);
});
