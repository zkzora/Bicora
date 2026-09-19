/**
 * Risk Explanation Engine.
 * Deterministic, rule-based prose derived from the same factors that produce the numbers, so every
 * score on the dashboard can answer "why?". No model calls: the text is reproducible from the data.
 */
import type { ComponentScore, Factor, RiskEvent, Severity } from '@btcfi/shared';

const usd = (n: number) => (n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n.toFixed(0)}`);
const pct = (r: number) => `${r >= 0 ? '+' : '−'}${Math.abs(r * 100).toFixed(1)}%`;
const f = (c: ComponentScore, key: string) => c.factors.find((x) => x.key === key);

export function explainFactor(component: ComponentScore['key'], factor: Factor): string {
  const v = factor.raw;
  const s = factor.score;
  switch (factor.key) {
    case 'depth':
      if (v == null) return 'No liquidity figure available.';
      return s != null && s >= 70 ? `Deep liquidity: ${usd(v)} locked places it among the largest pools on Stacks.`
        : s != null && s >= 45 ? `Mid-sized liquidity (${usd(v)}): adequate for normal flows, thinner under stress.`
        : `Thin liquidity (${usd(v)}) limits exit capacity under stress.`;
    case 'trend30d':
      if (v == null) return 'Not enough history for a 30-day trend.';
      return v > 0.1 ? `TVL grew ${pct(v)} over 30 days, attracting capital.` : v < -0.1 ? `TVL declined ${pct(v)} over 30 days, signalling capital leaving.` : `TVL was broadly flat over 30 days (${pct(v)}).`;
    case 'stability':
      if (v == null) return 'Not enough history to assess stability.';
      return v > 0.25 ? `A ${(v * 100).toFixed(0)}% drawdown inside 30 days shows unstable capital.` : v > 0.1 ? `Moderate swings: ${(v * 100).toFixed(0)}% max drawdown in 30 days.` : `Capital has been stable (max drawdown ${(v * 100).toFixed(0)}%).`;
    case 'tx7d':
      return v == null ? '' : v >= 1000 ? `${Math.round(v).toLocaleString('en-US')} transactions in 7 days: sustained usage.` : v >= 100 ? `${Math.round(v).toLocaleString('en-US')} transactions in 7 days: moderate usage.` : `Only ${Math.round(v ?? 0)} transactions in 7 days on the tracked entry points: low direct usage.`;
    case 'senders7d':
      return v == null ? '' : v >= 500 ? `${Math.round(v).toLocaleString('en-US')} distinct addresses interacted: broad participation.` : v >= 50 ? `${Math.round(v)} distinct addresses interacted: a modest user base.` : `${Math.round(v ?? 0)} distinct addresses interacted: activity is concentrated in few users.`;
    case 'trend7d':
      return v == null ? 'Prior week not covered; trend excluded from the score.' : v > 0.3 ? `Weekly transactions up ${pct(v)} versus the prior week.` : v < -0.3 ? `Weekly transactions down ${pct(v)} versus the prior week.` : `Weekly transactions stable (${pct(v)}) versus the prior week.`;
    case 'success':
      return v == null ? '' : v >= 0.95 ? `${(v * 100).toFixed(0)}% of transactions succeeded.` : `${((1 - v) * 100).toFixed(0)}% of transactions failed, which can indicate liquidation bots, front-running or UX issues.`;
    case 'utilization':
      return v == null ? '' : v < 0.5 ? `Utilisation of ${(v * 100).toFixed(0)}% leaves ample liquidity available for withdrawals.` : v < 0.8 ? `Utilisation of ${(v * 100).toFixed(0)}% is healthy but reduces the withdrawal buffer.` : `Utilisation of ${(v * 100).toFixed(0)}% is high: withdrawals could be constrained and rates volatile.`;
    case 'utilTrend7d':
      return v == null ? 'No prior utilisation reading.' : v > 0.05 ? `Utilisation rose ${(v * 100).toFixed(1)} points in 7 days.` : v < -0.05 ? `Utilisation fell ${(Math.abs(v) * 100).toFixed(1)} points in 7 days.` : 'Utilisation is unchanged over 7 days.';
    case 'source':
      return v == null ? '' : v >= 1 ? 'All tracked contracts are found on-chain with readable Clarity source.' : `${Math.round(v * 100)}% of tracked contracts were verified on-chain.`;
    case 'audits':
      return v == null ? '' : v >= 2 ? `${v} public audits listed.` : v === 1 ? 'One public audit listed.' : 'No public audit reference found.';
    case 'github':
      return v ? 'Source repository is public.' : 'No public source repository.';
    case 'docs':
      return v ? 'Public documentation is available.' : 'No public documentation found.';
    case 'age':
      return v == null ? 'Deployment date unknown.' : v >= 24 ? `Contracts have been live for ${Math.round(v)} months.` : v >= 12 ? `Contracts have ${Math.round(v)} months of production history.` : `Contracts are young (${Math.round(v)} months live).`;
    case 'governance':
      return factor.value.startsWith('dao') || factor.value.startsWith('governance') ? 'Upgrades are controlled by an on-chain governance contract or DAO.' : factor.value.startsWith('multisig') ? 'Upgrades are controlled by a multisig; less transparent than on-chain governance.' : 'Upgrade control is not publicly verified: treated as a transparency gap.';
    case 'bounty':
      return v ? 'A public bug bounty programme is in place.' : 'No public bug bounty programme.';
    default:
      return `${factor.label}: ${factor.value}.`;
  }
}

export function explainComponent(c: ComponentScore): string {
  if (c.score == null) return c.note ?? 'Not applicable for this protocol.';
  const parts: string[] = [];
  switch (c.key) {
    case 'liquidity':
      for (const k of ['depth', 'trend30d', 'stability']) { const x = f(c, k); if (x) parts.push(explainFactor(c.key, x)); }
      break;
    case 'activity':
      for (const k of ['tx7d', 'senders7d', 'trend7d', 'success']) { const x = f(c, k); if (x && (k !== 'success' || (x.raw ?? 1) < 0.95)) parts.push(explainFactor(c.key, x)); }
      break;
    case 'collateral':
      for (const k of ['utilization', 'utilTrend7d']) { const x = f(c, k); if (x) parts.push(explainFactor(c.key, x)); }
      break;
    case 'transparency': {
      const weak = c.factors.filter((x) => (x.score ?? 100) < 60);
      const strong = c.factors.filter((x) => (x.score ?? 0) >= 60);
      if (strong.length >= 4) parts.push('Strong public information: ' + strong.map((x) => x.label.toLowerCase()).slice(0, 3).join(', ') + '.');
      for (const x of weak) parts.push(explainFactor(c.key, x));
      if (!weak.length) parts.push('No transparency gaps detected in the rubric.');
      break;
    }
  }
  return parts.filter(Boolean).join(' ');
}

export const IMPACT: Record<Severity, 'Low' | 'Medium' | 'High'> = { info: 'Low', watch: 'Medium', alert: 'High' };
export const REASON: Record<RiskEvent['kind'], string> = {
  liquidity: 'TVL movement detected',
  collateral: 'Utilisation threshold crossed',
  activity: 'Activity change detected',
  transparency: 'Registry drift detected',
  score: 'Composite score change',
};
