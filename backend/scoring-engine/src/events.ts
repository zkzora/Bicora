/**
 * Risk event detection. Compares the freshly computed score and raw metrics against the
 * previous run (when available) and fixed thresholds, producing human-readable events.
 */
import { createHash } from 'node:crypto';
import { pctChange } from '@btcfi/shared';
import type { ProtocolRaw, RiskEvent, RiskScore, ScorePoint, Severity } from '@btcfi/shared';
import { pointDaysAgo } from './scoring.js';

const id = (parts: string[]) => createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 16);
const pct = (r: number) => `${r >= 0 ? '+' : '−'}${Math.abs(r * 100).toFixed(1)}%`;

export function detectEvents(raw: ProtocolRaw, score: RiskScore, previous: ScorePoint | undefined, name: string): RiskEvent[] {
  const ts = score.computedAt;
  const day = ts.slice(0, 10);
  const out: RiskEvent[] = [];
  const push = (kind: RiskEvent['kind'], severity: Severity, message: string, delta: number | null, key: string) =>
    out.push({ id: id([raw.slug, day, kind, key]), slug: raw.slug, ts, kind, severity, message, delta });

  // Score movement vs previous run (different day).
  if (previous && previous.date !== day) {
    const d = score.overall - previous.overall;
    if (Math.abs(d) >= 3) push('score', Math.abs(d) >= 8 ? 'alert' : 'watch', `${name} overall score ${d > 0 ? 'up' : 'down'} ${Math.abs(d)} points to ${score.overall}`, d, 'delta');
  }

  // Liquidity: 24h and 7d TVL moves.
  const h = raw.tvl.history;
  const c1 = pctChange(raw.tvl.currentUsd, pointDaysAgo(h, 1)?.tvlUsd);
  const c7 = pctChange(raw.tvl.currentUsd, pointDaysAgo(h, 7)?.tvlUsd);
  if (c1 != null && Math.abs(c1) >= 0.1) push('liquidity', Math.abs(c1) >= 0.25 ? 'alert' : 'watch', `${name} TVL ${pct(c1)} in 24h`, c1, '24h');
  else if (c7 != null && Math.abs(c7) >= 0.15) push('liquidity', Math.abs(c7) >= 0.35 ? 'alert' : 'watch', `${name} TVL ${pct(c7)} over 7 days`, c7, '7d');

  // Collateral: utilisation thresholds.
  const util = score.components.find((c) => c.key === 'collateral')?.factors.find((f) => f.key === 'utilization')?.raw;
  if (util != null) {
    if (util >= 0.9) push('collateral', 'alert', `${name} utilisation at ${(util * 100).toFixed(0)}% — thin available liquidity`, util, 'util90');
    else if (util >= 0.8) push('collateral', 'watch', `${name} utilisation crossed 80% (${(util * 100).toFixed(0)}%)`, util, 'util80');
  }

  // Activity: week-over-week swings and failure rates.
  const a = raw.activity;
  if (a.prior7d && a.prior7d.txCount >= 20) {
    const t = a.current7d.txCount / a.prior7d.txCount - 1;
    if (Math.abs(t) >= 0.4) push('activity', 'watch', `${name} weekly transactions ${pct(t)} vs prior week`, t, 'wow');
  }
  if (a.current7d.txCount >= 20 && a.current7d.successRate < 0.85)
    push('activity', 'watch', `${name} transaction success rate ${(a.current7d.successRate * 100).toFixed(0)}% over 7 days`, a.current7d.successRate, 'fail');

  // Transparency: contracts missing from the chain (registry drift).
  const missing = raw.contracts.filter((c) => !c.found);
  if (missing.length) push('transparency', 'watch', `${name}: ${missing.length} registered contract(s) not found on-chain`, missing.length, 'missing');

  return out;
}
