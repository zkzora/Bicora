import Link from 'next/link';
import { getSnapshot } from '@/lib/data';
import { componentColor, ecosystemTvl, fmtInt, fmtUsd } from '@/lib/format';
import { dash } from '@/lib/urls';
import { AlertCard, ChartCard, MetricCard, RiskScoreCard } from '@/components/cards';
import { PctDelta, ProtocolTable } from '@/components/ui';
import GroupedBars from '@/components/charts/GroupedBars';
import BandBar from '@/components/charts/BandBar';
import LineChart from '@/components/charts/LineChart';

const COMPONENTS = [
  { key: 'liquidity', label: 'Liquidity' },
  { key: 'activity', label: 'Activity' },
  { key: 'collateral', label: 'Collateral' },
  { key: 'transparency', label: 'Transparency' },
] as const;

export default async function OverviewPage() {
  const { snapshot } = await getSnapshot();
  const m = snapshot.market;
  const eco = ecosystemTvl(m);
  const names = Object.fromEntries(snapshot.protocols.map((p) => [p.slug, p.name]));
  const sampled = snapshot.protocols.some((p) => p.metrics.activitySampled);
  const lending = snapshot.protocols.filter((p) => p.metrics.utilization != null);
  const avgUtil = lending.length ? lending.reduce((s, p) => s + (p.metrics.utilization ?? 0), 0) / lending.length : null;

  return (
    <>
      {/* PRIMARY — the ecosystem risk condition */}
      <div className="dash-order-1">
        <RiskScoreCard
          score={m.index.score}
          band={m.index.band}
          previous={m.index.previous}
          change7d={m.index.change7d}
          change30d={m.index.change30d}
          updatedAt={snapshot.generatedAt}
          protocols={m.protocolsTracked}
          liquidityUsd={eco.value}
          liquidityLabel={eco.label}
          liquidityNote={eco.note}
          liquidityChange7d={m.totalTvlChange7d}
          activeAddresses={m.activeAddresses7d}
          history={m.index.history}
        />
      </div>

      {/* SECONDARY — market context */}
      <div className="dash-secondary dash-order-9" data-tour="tiles">
        <MetricCard label={eco.label} value={fmtUsd(eco.value)} sub={<><span className="muted">{eco.note}</span> <PctDelta r={m.totalTvlChange7d} suffix="sum 7d" /><PctDelta r={m.totalTvlChange30d} suffix="sum 30d" /></>} />
        <MetricCard label="Transactions · 7d" value={fmtInt(m.tx7d)} sub={sampled ? 'includes extrapolated windows' : 'direct calls to tracked contracts'} delay={30} />
        <MetricCard label="Protocols by band" value={<span style={{ fontSize: 18 }}><span className="c-Low">{m.bandDistribution.Low} low</span> · <span className="c-Moderate">{m.bandDistribution.Moderate} mod</span> · <span className="c-Elevated">{m.bandDistribution.Elevated} elev</span> · <span className="c-High">{m.bandDistribution.High} high</span></span>} sub="risk distribution" delay={60} />
        <MetricCard label="Avg. utilisation" value={avgUtil == null ? '—' : `${(avgUtil * 100).toFixed(1)}%`} sub={`${lending.length} lending market${lending.length === 1 ? '' : 's'} with borrow data`} delay={90} />
      </div>

      {/* TERTIARY — ranking + events */}
      <div className="dash-tertiary dash-balance">
        <div className="dash-order-2 dash-split" data-tour="ranking">
          <div className="section-head">
            <span className="k k-ink">Protocol ranking</span>
            <span className="sub">Sorted by overall score · open a protocol for its factor breakdown{sampled ? ' · * extrapolated activity' : ''}</span>
          </div>
          <div className="card dash-fill-table" style={{ padding: 0 }}>
            <ProtocolTable protocols={snapshot.protocols} compact />
          </div>
        </div>
        <div className="dash-order-3 dash-split" data-tour="events">
          <div className="section-head">
            <span className="k k-ink">Recent risk events</span>
            <Link href={dash('/alerts')} style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase' }}>All alerts →</Link>
          </div>
          {snapshot.events.length ? (
            <div className="acards">{snapshot.events.slice(0, 2).map((e) => (<AlertCard key={e.id} e={e} name={names[e.slug] ?? e.slug} />))}</div>
          ) : (
            <div className="empty">No risk events in the last 30 days. Events appear when TVL, utilisation, activity or scores cross documented thresholds.</div>
          )}
        </div>
      </div>

      {/* TERTIARY — charts */}
      <div className="dash-balance dash-order-9">
        <ChartCard title="Component scores by protocol" sub="Hatched bar = not applicable, weight redistributed" tour="components" aside={<div className="legend">{COMPONENTS.map((c) => (<span key={c.key}><i style={{ background: componentColor[c.key] }} />{c.label}</span>))}</div>}>
          <GroupedBars
            fill
            ariaLabel="Component scores by protocol"
            groups={snapshot.protocols.map((p) => ({ label: p.name, values: COMPONENTS.map((c) => ({ key: c.key, label: c.label, color: componentColor[c.key], value: p.score.components.find((x) => x.key === c.key)?.score ?? null })) }))}
          />
        </ChartCard>
        <div className="dash-stack">
          <ChartCard title="Sum of protocol TVL · DefiLlama · 90 days" sub="Daily sum, not de-duplicated: receipt tokens and their backing both count">
            <LineChart ariaLabel="Sum of protocol TVL over 90 days" series={[{ key: 'tvl', label: 'Sum of protocol TVL', color: componentColor.liquidity, area: true, points: m.ecosystemTvlHistory.map((x) => ({ date: x.date, value: x.tvlUsd })) }]} formatKind="usd" width={640} height={160} />
          </ChartCard>
          <ChartCard title="Risk distribution" sub={`${m.protocolsTracked} protocols across four bands`}>
            <BandBar distribution={m.bandDistribution} />
          </ChartCard>
        </div>
      </div>
    </>
  );
}
