'use client';
import { useState } from 'react';
import LineChart, { type LineSeries } from '@/components/charts/LineChart';
import { componentColor } from '@/lib/format';
import type { SnapshotProtocol } from '@/lib/types';

type View = 'score' | 'tvl' | 'liquidity';

/** Historical chart for one protocol with a Score / TVL / Liquidity-score switch. One axis per view. */
export default function ProtocolHistory({ p }: { p: SnapshotProtocol }) {
  const [view, setView] = useState<View>(p.scoreHistory.length > 1 ? 'score' : 'tvl');
  const multiScore = p.scoreHistory.length > 1;

  const series: LineSeries[] =
    view === 'tvl'
      ? [{ key: 'tvl', label: 'TVL', color: componentColor.liquidity, area: true, points: p.tvlHistory.map((x) => ({ date: x.date, value: x.tvlUsd })) }]
      : view === 'liquidity'
        ? [{ key: 'liq', label: 'Liquidity score', color: componentColor.liquidity, area: true, points: p.liquidityScoreHistory.map((x) => ({ date: x.date, value: x.score })) }]
        : [
            { key: 'overall', label: 'Overall', color: componentColor.overall, points: p.scoreHistory.map((x) => ({ date: x.date, value: x.overall })) },
            ...(['liquidity', 'activity', 'collateral', 'transparency'] as const)
              .filter((k) => p.scoreHistory.some((x) => x[k] != null))
              .map((k) => ({ key: k, label: k[0].toUpperCase() + k.slice(1), color: componentColor[k], points: p.scoreHistory.filter((x) => x[k] != null).map((x) => ({ date: x.date, value: x[k] as number })) })),
          ];

  const opts: { v: View; l: string }[] = [
    { v: 'score', l: 'Scores' },
    { v: 'tvl', l: 'TVL' },
    { v: 'liquidity', l: 'Liquidity score' },
  ];

  return (
    <div className="card">
      <div className="card-head">
        <span className="k k-ink">Historical data</span>
        <div className="seg" role="group" aria-label="History view">
          {opts.map((o) => (
            <button key={o.v} className="seg-opt" aria-pressed={view === o.v} onClick={() => setView(o.v)}>{o.l}</button>
          ))}
        </div>
      </div>
      {view === 'score' && !multiScore ? (
        <div className="empty" style={{ padding: '28px 20px' }}>
          Score history accumulates one point per scoring run. Only the current run ({p.scoreHistory[0]?.date}) exists so far — switch to <b>TVL</b> or <b>Liquidity score</b> for 90 days of back-filled history.
        </div>
      ) : (
        <LineChart
          ariaLabel={`${p.name} ${view} history`}
          series={series}
          yDomain={view === 'tvl' ? undefined : [0, 100]}
          formatKind={view === 'tvl' ? 'usd' : 'score'}
          height={236}
        />
      )}
      <div className="legend">
        {series.map((s) => (<span key={s.key}><i style={{ background: s.color }} />{s.label}</span>))}
        {view === 'liquidity' && <span className="muted">Back-filled from the TVL series with the v1.0 liquidity formula</span>}
      </div>
    </div>
  );
}
