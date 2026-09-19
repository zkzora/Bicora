import Link from 'next/link';
import { getSnapshot } from '@/lib/data';
import { componentColor, fmtInt, fmtUsd } from '@/lib/format';
import { EventList, PctDelta, ProtocolTable, StatTile } from '@/components/ui';
import GroupedBars from '@/components/charts/GroupedBars';
import BandBar from '@/components/charts/BandBar';
import { dash } from '@/lib/urls';

const COMPONENTS = [
  { key: 'liquidity', label: 'Liquidity' },
  { key: 'activity', label: 'Activity' },
  { key: 'collateral', label: 'Collateral' },
  { key: 'transparency', label: 'Transparency' },
] as const;

export default async function OverviewPage() {
  const { snapshot } = await getSnapshot();
  const m = snapshot.market;
  const names = Object.fromEntries(snapshot.protocols.map((p) => [p.slug, p.name]));
  const sampled = snapshot.protocols.some((p) => p.metrics.activitySampled);

  return (
    <>
      <div className="grid-cells tiles" data-tour="tiles">
        <StatTile label="Protocols tracked" value={m.protocolsTracked} sub="Stacks mainnet" />
        <StatTile label="Liquidity tracked" value={fmtUsd(m.totalTvlUsd)} sub={<><PctDelta r={m.totalTvlChange7d} suffix="7d" /> · <PctDelta r={m.totalTvlChange30d} suffix="30d" /></>} delay={30} />
        <StatTile label="Active addresses · 7d" value={fmtInt(m.activeAddresses7d)} sub={`${fmtInt(m.tx7d)} transactions on tracked contracts`} delay={60} />
        <StatTile label="Avg. risk score" value={m.avgScore} sub="0–100 · higher is safer" accent delay={90} />
      </div>

      <div className="two-up">
        <div className="card" data-tour="components">
          <div className="card-head">
            <span className="k k-ink">Component scores by protocol</span>
            <div className="legend">
              {COMPONENTS.map((c) => (<span key={c.key}><i style={{ background: componentColor[c.key] }} />{c.label}</span>))}
            </div>
          </div>
          <GroupedBars
            ariaLabel="Component scores by protocol"
            groups={snapshot.protocols.map((p) => ({
              label: p.name,
              values: COMPONENTS.map((c) => ({ key: c.key, label: c.label, color: componentColor[c.key], value: p.score.components.find((x) => x.key === c.key)?.score ?? null })),
            }))}
          />
          <div className="muted" style={{ fontSize: 11 }}>Hatched bar = component not applicable (weight redistributed). Exact values in the ranking table below.</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <span className="k k-ink">Risk distribution</span>
            <BandBar distribution={m.bandDistribution} />
          </div>
          <div className="card" style={{ flex: 1 }} data-tour="events">
            <div className="card-head">
              <span className="k k-ink">Recent risk events</span>
              <Link href={dash('/alerts')} style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase' }}>All alerts →</Link>
            </div>
            <EventList events={snapshot.events} names={names} limit={5} />
          </div>
        </div>
      </div>

      <div data-tour="ranking">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <span className="k k-ink">Protocol ranking</span>
          <span className="muted" style={{ fontSize: 12 }}>Sorted by overall risk score · click a row for the full factor breakdown{sampled ? ' · * activity extrapolated from a sampled window' : ''}</span>
        </div>
        <ProtocolTable protocols={snapshot.protocols} />
      </div>
    </>
  );
}
