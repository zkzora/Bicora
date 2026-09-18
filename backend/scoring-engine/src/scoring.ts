/**
 * Risk scoring methodology v1.0.0 — see docs/risk-methodology.md.
 * Every function here is pure: raw inputs in, factors and scores out.
 * All scores are 0–100 where HIGHER = LOWER RISK.
 */
import { clamp, round1, pctChange, METHODOLOGY_VERSION } from '@btcfi/shared';
import type { Band, ComponentScore, Factor, ProtocolConfig, ProtocolRaw, RiskScore, TvlPoint } from '@btcfi/shared';

export const WEIGHTS = { liquidity: 0.3, activity: 0.25, collateral: 0.25, transparency: 0.2 } as const;

export const band = (score: number): Band => (score >= 75 ? 'Low' : score >= 60 ? 'Moderate' : score >= 40 ? 'Elevated' : 'High');

/** Piecewise-linear interpolation over sorted [x, y] breakpoints, clamped at the ends. */
export function piecewise(x: number, pts: [number, number][]): number {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return pts[pts.length - 1][1];
}

const fmtUsd = (n: number) =>
  n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n.toFixed(0)}`;
const fmtPct = (r: number | null) => (r == null ? 'n/a' : `${r >= 0 ? '+' : ''}${(r * 100).toFixed(1)}%`);

/** Weighted mean of available factors; null when nothing is available. */
export function weightedMean(factors: Factor[]): number | null {
  const avail = factors.filter((f) => f.score != null);
  const w = avail.reduce((s, f) => s + f.weight, 0);
  if (!w) return null;
  return round1(avail.reduce((s, f) => s + (f.score as number) * f.weight, 0) / w);
}

// ------------------------------------------------------------- statistics

export function pointDaysAgo(history: TvlPoint[], days: number): TvlPoint | undefined {
  if (!history.length) return undefined;
  const last = history[history.length - 1];
  const target = new Date(Date.parse(last.date) - days * 864e5).toISOString().slice(0, 10);
  // closest point at or before target
  let best: TvlPoint | undefined;
  for (const p of history) {
    if (p.date <= target) best = p;
    else break;
  }
  return best;
}

export function maxDrawdown(values: number[]): number {
  let peak = -Infinity;
  let dd = 0;
  for (const v of values) {
    peak = Math.max(peak, v);
    if (peak > 0) dd = Math.max(dd, (peak - v) / peak);
  }
  return dd;
}

export function dailyVolatility(values: number[]): number {
  const rets: number[] = [];
  for (let i = 1; i < values.length; i++) if (values[i - 1] > 0) rets.push(values[i] / values[i - 1] - 1);
  if (rets.length < 2) return 0;
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  return Math.sqrt(rets.reduce((a, r) => a + (r - mean) ** 2, 0) / (rets.length - 1));
}

// ------------------------------------------------------------ data quality

export interface CleanResult {
  history: TvlPoint[];
  excluded: number;
  note: string | null;
}

/**
 * Removes transient adapter outliers: points below 5% of the 90-day median while the series
 * has since recovered above 50% of it. A genuine, ongoing collapse (series still low) is kept.
 */
export function cleanTvlHistory(history: TvlPoint[]): CleanResult {
  if (history.length < 10) return { history, excluded: 0, note: null };
  const recent = history.slice(-90).map((p) => p.tvlUsd).sort((a, b) => a - b);
  const median = recent[Math.floor(recent.length / 2)];
  const last = history[history.length - 1].tvlUsd;
  if (!(median > 0) || last < 0.5 * median) return { history, excluded: 0, note: null };
  const kept = history.filter((p) => p.tvlUsd >= 0.05 * median);
  const excluded = history.length - kept.length;
  return {
    history: kept,
    excluded,
    note: excluded ? `${excluded} daily point(s) below 5% of the 90-day median were excluded as adapter outliers.` : null,
  };
}

// -------------------------------------------------------- 1. liquidity 30%

/** Liquidity score from a TVL series ending "today". Reused to backfill history. */
export function liquidityFactors(history: TvlPoint[], currentUsd: number): Factor[] {
  const last30 = history.slice(-31).map((p) => p.tvlUsd);
  const ago30 = pointDaysAgo(history, 30);
  const trend = pctChange(currentUsd, ago30?.tvlUsd);
  const dd = last30.length >= 5 ? maxDrawdown(last30) : null;
  const vol = last30.length >= 5 ? dailyVolatility(last30) : null;
  return [
    {
      key: 'depth',
      label: 'Liquidity depth (TVL)',
      value: fmtUsd(currentUsd),
      raw: currentUsd,
      // log scale: $100K -> 0, $1M -> 25, $10M -> 50, $100M -> 75, $1B -> 100
      score: currentUsd > 0 ? round1(clamp(((Math.log10(currentUsd) - 5) / 4) * 100)) : 0,
      weight: 0.5,
    },
    {
      key: 'trend30d',
      label: '30-day TVL trend',
      value: fmtPct(trend),
      raw: trend,
      score: trend == null ? null : round1(piecewise(trend, [[-0.5, 0], [-0.2, 30], [0, 65], [0.2, 90], [0.5, 100]])),
      weight: 0.25,
    },
    {
      key: 'stability',
      label: '30-day stability (drawdown, volatility)',
      value: dd == null || vol == null ? 'n/a' : `dd ${(dd * 100).toFixed(1)}% · vol ${(vol * 100).toFixed(1)}%/d`,
      raw: dd,
      score:
        dd == null || vol == null
          ? null
          : round1(
              0.6 * piecewise(dd, [[0.02, 100], [0.1, 80], [0.25, 45], [0.5, 10], [0.8, 0]]) +
                0.4 * piecewise(vol, [[0.01, 100], [0.03, 80], [0.06, 50], [0.12, 15], [0.25, 0]]),
            ),
      weight: 0.25,
    },
  ];
}

// --------------------------------------------------------- 2. activity 25%

export function activityFactors(raw: ProtocolRaw['activity']): Factor[] {
  const c = raw.current7d;
  const p = raw.prior7d;
  // Extrapolate to a full window when pagination was capped before reaching 7 days of history.
  const scale = c.sampled && c.coverageDays > 0 && c.coverageDays < c.days ? c.days / c.coverageDays : 1;
  const tx = Math.round(c.txCount * scale);
  const senders = Math.round(c.uniqueSenders * scale);
  const trend = p && p.txCount > 0 ? c.txCount / p.txCount - 1 : null;
  const est = scale > 1 ? ' (est.)' : '';
  return [
    {
      key: 'tx7d',
      label: 'Transactions, 7 days',
      value: tx.toLocaleString() + est,
      raw: tx,
      // log scale: 10 -> 0, 100 -> 33, 1,000 -> 67, 10,000 -> 100
      score: round1(clamp(((Math.log10(tx + 1) - 1) / 3) * 100)),
      weight: 0.4,
      note: c.sampled ? `Sampled: ${c.coverageDays} of ${c.days} days covered by the pagination cap.` : undefined,
    },
    {
      key: 'senders7d',
      label: 'Unique senders, 7 days',
      value: senders.toLocaleString() + est,
      raw: senders,
      // log scale: 5 -> 0, 50 -> 37, 500 -> 74, 2,000 -> 96, 2,500+ -> 100
      score: round1(clamp(((Math.log10(senders + 1) - 0.7) / 2.7) * 100)),
      weight: 0.35,
    },
    {
      key: 'trend7d',
      label: '7-day transaction trend vs prior week',
      value: fmtPct(trend),
      raw: trend,
      score: trend == null ? null : round1(piecewise(trend, [[-0.6, 10], [-0.3, 35], [0, 60], [0.3, 85], [1, 100]])),
      weight: 0.15,
      note: trend == null ? 'Prior week not covered in this run; factor excluded.' : undefined,
    },
    {
      key: 'success',
      label: 'Transaction success rate',
      value: `${(c.successRate * 100).toFixed(1)}%`,
      raw: c.successRate,
      score: round1(piecewise(c.successRate, [[0.7, 0], [0.85, 40], [0.95, 80], [0.99, 100]])),
      weight: 0.1,
    },
  ];
}

// -------------------------------------------------------- 3. collateral 25%

export function collateralFactors(cfg: ProtocolConfig, raw: ProtocolRaw): Factor[] | null {
  if (!cfg.hasCollateral) return null;
  const borrowed = raw.tvl.borrowedUsd;
  if (borrowed == null) return [];
  const supplied = raw.tvl.currentUsd + borrowed; // DefiLlama TVL for lending excludes borrowed
  const util = supplied > 0 ? borrowed / supplied : 0;
  const ago7 = pointDaysAgo(raw.tvl.history, 7);
  const utilAgo = ago7?.borrowedUsd != null && ago7.tvlUsd + ago7.borrowedUsd > 0 ? ago7.borrowedUsd / (ago7.tvlUsd + ago7.borrowedUsd) : null;
  const utilDelta = utilAgo == null ? null : util - utilAgo;
  return [
    {
      key: 'utilization',
      label: 'Utilisation (borrowed / supplied)',
      value: `${(util * 100).toFixed(1)}%`,
      raw: util,
      score: round1(piecewise(util, [[0.5, 100], [0.8, 60], [0.95, 20], [1, 0]])),
      weight: 0.7,
    },
    {
      key: 'utilTrend7d',
      label: 'Utilisation change, 7 days',
      value: utilDelta == null ? 'n/a' : `${utilDelta >= 0 ? '+' : ''}${(utilDelta * 100).toFixed(1)} pts`,
      raw: utilDelta,
      score: utilDelta == null ? null : round1(piecewise(utilDelta, [[-0.1, 100], [0, 80], [0.1, 40], [0.2, 10]])),
      weight: 0.3,
    },
  ];
}

// ----------------------------------------------------- 4. transparency 20%

export function transparencyFactors(cfg: ProtocolConfig, raw: ProtocolRaw): Factor[] {
  const found = raw.contracts.filter((c) => c.found && (c.sourceBytes ?? 0) > 0).length;
  const total = raw.contracts.length || 1;
  const audits = cfg.audits.length;
  const deployed = raw.contracts.map((c) => (c.deployedAt ? Date.parse(c.deployedAt) : NaN)).filter(Number.isFinite);
  const ageMonths = deployed.length ? (Date.now() - Math.min(...deployed)) / (30.44 * 864e5) : null;
  const gov = cfg.governance;
  const ok = (b: boolean) => (b ? 'yes' : 'no');
  return [
    { key: 'source', label: 'Contract source verifiable on-chain', value: `${found}/${total} contracts`, raw: found / total, score: round1((found / total) * 100), weight: 0.2 },
    { key: 'audits', label: 'Public audits listed', value: String(audits), raw: audits, score: audits >= 2 ? 100 : audits === 1 ? 60 : 0, weight: 0.25 },
    { key: 'github', label: 'Public source repository', value: ok(!!cfg.github), raw: cfg.github ? 1 : 0, score: cfg.github ? 100 : 0, weight: 0.15 },
    { key: 'docs', label: 'Public documentation', value: ok(!!cfg.docs), raw: cfg.docs ? 1 : 0, score: cfg.docs ? 100 : 0, weight: 0.1 },
    {
      key: 'age',
      label: 'Oldest tracked contract age',
      value: ageMonths == null ? 'n/a' : `${ageMonths.toFixed(0)} months`,
      raw: ageMonths,
      score: ageMonths == null ? null : round1(piecewise(ageMonths, [[0, 0], [6, 35], [12, 65], [24, 100]])),
      weight: 0.15,
    },
    {
      key: 'governance',
      label: 'Governance / upgrade control',
      value: gov,
      raw: null,
      note: cfg.governanceNote,
      score: gov === 'dao' || gov === 'governance-contract' ? 100 : gov === 'multisig' ? 60 : 0,
      weight: 0.1,
    },
    { key: 'bounty', label: 'Bug bounty programme', value: ok(!!cfg.bugBounty), raw: cfg.bugBounty ? 1 : 0, score: cfg.bugBounty ? 100 : 0, weight: 0.05 },
  ];
}

// ---------------------------------------------------------------- overall

export function scoreProtocol(cfg: ProtocolConfig, raw: ProtocolRaw, now = new Date()): RiskScore {
  const clean = cleanTvlHistory(raw.tvl.history);
  const liq = liquidityFactors(clean.history, raw.tvl.currentUsd);
  const act = activityFactors(raw.activity);
  const col = collateralFactors(cfg, raw);
  const tra = transparencyFactors(cfg, raw);

  const components: ComponentScore[] = [
    { key: 'liquidity', label: 'Liquidity Health', weight: WEIGHTS.liquidity, score: weightedMean(liq), factors: liq, note: clean.note ?? undefined },
    { key: 'activity', label: 'Protocol Activity', weight: WEIGHTS.activity, score: weightedMean(act), factors: act },
    {
      key: 'collateral',
      label: 'Collateral Health',
      weight: WEIGHTS.collateral,
      score: col ? weightedMean(col) : null,
      factors: col ?? [],
      note: !cfg.hasCollateral
        ? 'Not applicable: protocol has no collateralised borrowing. Weight redistributed.'
        : col && !col.length
          ? 'No borrowed-value data available from the adapter. Weight redistributed.'
          : undefined,
    },
    { key: 'transparency', label: 'Security & Transparency', weight: WEIGHTS.transparency, score: weightedMean(tra), factors: tra },
  ];

  const avail = components.filter((c) => c.score != null);
  const totalW = avail.reduce((s, c) => s + c.weight, 0);
  const effectiveWeights: Record<string, number> = {};
  for (const c of components) effectiveWeights[c.key] = c.score == null ? 0 : round1((c.weight / totalW) * 1000) / 10;
  const overall = Math.round(avail.reduce((s, c) => s + (c.score as number) * (c.weight / totalW), 0));

  return {
    slug: cfg.slug,
    computedAt: now.toISOString(),
    methodologyVersion: METHODOLOGY_VERSION,
    overall,
    band: band(overall),
    components,
    effectiveWeights,
  };
}

/** Recomputes the liquidity component for each day in the last `days` days from TVL history alone. */
export function backfillLiquidity(history: TvlPoint[], days = 90): { date: string; score: number }[] {
  const out: { date: string; score: number }[] = [];
  const start = Math.max(0, history.length - days);
  for (let i = start; i < history.length; i++) {
    const slice = history.slice(0, i + 1);
    const s = weightedMean(liquidityFactors(slice, slice[i].tvlUsd));
    if (s != null) out.push({ date: slice[i].date, score: s });
  }
  return out;
}
