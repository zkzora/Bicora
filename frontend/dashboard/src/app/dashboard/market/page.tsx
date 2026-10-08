import type { Metadata } from 'next';
import Link from 'next/link';
import { getSnapshot } from '@/lib/data';
import { componentColor, fmtInt, fmtUsd, overlapEstimateNote, TRACKED_TVL_LABEL } from '@/lib/format';
import { BandTag, PctDelta, StatTile } from '@/components/ui';
import LineChart from '@/components/charts/LineChart';
import ProtocolLogo from '@/components/ProtocolLogo';
import { dash } from '@/lib/urls';

export const metadata: Metadata = { title: 'Market metrics' };

export default async function MarketPage() {
  const { snapshot } = await getSnapshot();
  const m = snapshot.market;
  const estimate = overlapEstimateNote(m);
  const byTvl = [...snapshot.protocols].sort((a, b) => b.metrics.tvlUsd - a.metrics.tvlUsd);
  const byCategory = new Map<string, { tvl: number; n: number; scores: number[] }>();
  for (const p of snapshot.protocols) {
    const c = byCategory.get(p.category) ?? { tvl: 0, n: 0, scores: [] };
    c.tvl += p.metrics.tvlUsd; c.n++; c.scores.push(p.score.overall);
    byCategory.set(p.category, c);
  }

  return (
    <>
      <div className="grid-cells tiles">
        <StatTile label={TRACKED_TVL_LABEL} value={fmtUsd(m.totalTvlUsd)} sub={<><PctDelta r={m.totalTvlChange7d} suffix="7d" /> · <PctDelta r={m.totalTvlChange30d} suffix="30d" />{estimate && <div className="muted" style={{ marginTop: 4, fontSize: 10.5, lineHeight: 1.4 }}>{estimate}</div>}</>} />
        <StatTile label="Transactions · 7d" value={fmtInt(m.tx7d)} sub="Direct calls to tracked contracts" delay={30} />
        <StatTile label="Active addresses · 7d" value={fmtInt(m.activeAddresses7d)} sub="Unique senders, summed per protocol" delay={60} />
        <StatTile label="Avg. risk score" value={m.avgScore} sub={`${m.bandDistribution.Low} low · ${m.bandDistribution.Moderate} moderate · ${m.bandDistribution.Elevated} elevated · ${m.bandDistribution.High} high`} accent delay={90} />
      </div>

      <div className="card">
        <div className="card-head">
          <span className="k k-ink">{TRACKED_TVL_LABEL} · 90 days</span>
          <span className="muted" style={{ fontSize: 11 }}>Same series as the headline: forward-filled daily sum, no overlap adjustment</span>
        </div>
        <LineChart
          ariaLabel="Tracked protocol TVL over 90 days"
          series={[{ key: 'tvl', label: 'Tracked protocol TVL', color: componentColor.liquidity, area: true, points: m.ecosystemTvlHistory.map((x) => ({ date: x.date, value: x.tvlUsd })) }]}
          formatKind="usd"
          height={240}
        />
      </div>

      <div className="two-up">
        <div className="card">
          <span className="k k-ink">Share of summed TVL · DefiLlama</span>
          <div style={{ display: 'flex', height: 16, borderRadius: 4, overflow: 'hidden', gap: 2 }}>
            {byTvl.map((p, i) => (
              <div key={p.slug} style={{ width: `${(p.metrics.tvlUsd / m.totalTvlUsd) * 100}%`, background: ['var(--ink)', 'var(--color-accent)', 'var(--color-accent-300)', 'var(--color-neutral-400)', 'var(--color-neutral-300)'][i] ?? 'var(--color-neutral-200)' }} title={p.name} />
            ))}
          </div>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Protocol</th><th className="r">TVL · DefiLlama</th><th className="r">Share of sum</th><th className="r">7d</th><th className="r hide-sm">30d</th></tr></thead>
            <tbody>
              {byTvl.map((p, i) => (
                <tr key={p.slug} className="row">
                  <td style={{ fontWeight: 600 }}><i style={{ display: 'inline-block', width: 10, height: 10, marginRight: 8, borderRadius: 2, verticalAlign: -1, background: ['var(--ink)', 'var(--color-accent)', 'var(--color-accent-300)', 'var(--color-neutral-400)', 'var(--color-neutral-300)'][i] ?? 'var(--color-neutral-200)' }} /><Link href={dash(`/protocols/${p.slug}`)} style={{ color: 'var(--color-text)' }}>{p.name}</Link></td>
                  <td className="r mono">{fmtUsd(p.metrics.tvlUsd)}</td>
                  <td className="r mono">{((p.metrics.tvlUsd / m.totalTvlUsd) * 100).toFixed(1)}%</td>
                  <td className="r"><PctDelta r={p.metrics.tvlChange7d} /></td>
                  <td className="r hide-sm"><PctDelta r={p.metrics.tvlChange30d} /></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <span className="k k-ink">By category</span>
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Category</th><th className="r">Protocols</th><th className="r">TVL</th><th className="r">Avg. score</th></tr></thead>
              <tbody>
                {[...byCategory.entries()].sort((a, b) => b[1].tvl - a[1].tvl).map(([cat, c]) => (
                  <tr key={cat}><td className="caps" style={{ fontWeight: 600 }}>{cat}</td><td className="r mono">{c.n}</td><td className="r mono">{fmtUsd(c.tvl)}</td><td className="r mono">{Math.round(c.scores.reduce((s, x) => s + x, 0) / c.scores.length)}</td></tr>
                ))}
              </tbody>
            </table></div>
          </div>
          <div className="card">
            <span className="k k-ink">Activity · 7 days</span>
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Protocol</th><th className="r">Transactions</th><th className="r">Senders</th><th className="hide-sm">Band</th></tr></thead>
              <tbody>
                {[...snapshot.protocols].sort((a, b) => b.metrics.tx7d - a.metrics.tx7d).map((p) => (
                  <tr key={p.slug} className="row">
                    <td style={{ fontWeight: 600 }}><Link href={dash(`/protocols/${p.slug}`)} style={{ color: 'var(--color-text)', display: 'inline-flex', alignItems: 'center', gap: 8 }}><ProtocolLogo slug={p.slug} name={p.name} size={20} radius={4} />{p.name}</Link></td>
                    <td className="r mono">{fmtInt(p.metrics.tx7d)}{p.metrics.activitySampled ? '*' : ''}</td>
                    <td className="r mono">{fmtInt(p.metrics.uniqueSenders7d)}</td>
                    <td className="hide-sm"><BandTag band={p.score.band} /></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            <div className="muted" style={{ fontSize: 11 }}>* extrapolated from a sampled window. Direct calls to registered entry points only; see methodology limitations.</div>
          </div>
        </div>
      </div>
    </>
  );
}
