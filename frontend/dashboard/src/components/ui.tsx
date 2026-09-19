import Link from 'next/link';
import type { Band, RiskEvent, SnapshotProtocol } from '@/lib/types';
import { fmtDateTime, fmtDelta, fmtInt, fmtPct, fmtScore, fmtUsd } from '@/lib/format';
import ProtocolLogo from './ProtocolLogo';
import { dash } from '@/lib/urls';

/** Risk band as colour + dot + text (never colour alone). */
export function BandTag({ band, score }: { band: Band; score?: number }) {
  return (
    <span className={`tag tag-${band}`}>
      <span className={`dot dot-${band}`} aria-hidden />
      {score != null && <span className="tnum">{score}</span>}
      {score != null ? ' · ' : ''}
      {band}
    </span>
  );
}

export function StatTile({ label, value, sub, accent, delay = 0 }: { label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: boolean; delay?: number }) {
  return (
    <div className="cell stag" style={{ animationDelay: `${delay}ms` }}>
      <div className={`k ${accent ? '' : 'k-muted'}`}>{label}</div>
      <div className="stat-value" style={accent ? { color: 'var(--color-accent)' } : undefined}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function ScoreDelta({ d }: { d: number | null }) {
  const color = d == null || d === 0 ? 'var(--color-neutral-600)' : d > 0 ? 'var(--status-low)' : 'var(--status-elevated)';
  return <span className="mono" style={{ color }}>{fmtDelta(d)}</span>;
}

export function PctDelta({ r, suffix }: { r: number | null; suffix?: string }) {
  const color = r == null || Math.abs(r) < 0.0005 ? 'var(--color-neutral-600)' : r > 0 ? 'var(--status-low)' : 'var(--status-elevated)';
  return (
    <span className="mono" style={{ color }}>
      {fmtPct(r)}
      {suffix ? ` ${suffix}` : ''}
    </span>
  );
}

const KIND: Record<RiskEvent['kind'], string> = { liquidity: 'Liquidity', activity: 'Activity', collateral: 'Collateral', transparency: 'Transparency', score: 'Score' };

export function EventList({ events, names, limit, showProtocol = true }: { events: RiskEvent[]; names: Record<string, string>; limit?: number; showProtocol?: boolean }) {
  const list = limit ? events.slice(0, limit) : events;
  if (!list.length) {
    return <div className="empty">No risk events detected in the last 30 days. Events appear when TVL, utilisation, activity or scores cross documented thresholds.</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {list.map((e) => {
        const name = names[e.slug] ?? e.slug;
        const text = e.message.startsWith(name) ? e.message.slice(name.length).replace(/^[\s:—-]+/, '') : e.message;
        return (
          <div key={e.id} className="event-row">
            <span className="mono muted" style={{ fontSize: 11, paddingTop: 2 }}>{fmtDateTime(e.ts).replace(' UTC', '')}</span>
            <span>
              {showProtocol && (
                <Link href={dash(`/protocols/${e.slug}`)} style={{ color: 'var(--color-text)', fontWeight: 600 }}>{name}</Link>
              )}
              {showProtocol ? ' — ' : ''}
              {text}
            </span>
            <span style={{ display: 'flex', gap: 6 }}>
              <span className={`tag tag-${e.severity}`}>{e.severity}</span>
              <span className="tag tag-outline">{KIND[e.kind]}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ProtocolTable({ protocols, compact = false }: { protocols: SnapshotProtocol[]; compact?: boolean }) {
  return (
    <div className="table-wrap">
      <table className="table" style={{ minWidth: compact ? 0 : 860 }}>
        <thead>
          <tr>
            <th>#</th>
            <th>Protocol</th>
            <th>Category</th>
            <th className="r">Liquidity</th>
            {!compact && <th className="r">7d TVL</th>}
            <th>Overall</th>
            {!compact && (
              <>
                <th className="r">Liq.</th>
                <th className="r">Act.</th>
                <th className="r">Coll.</th>
                <th className="r">Transp.</th>
                <th className="r">Tx 7d</th>
                <th className="r">7d Δ</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {protocols.map((p, i) => {
            const c = (k: string) => p.score.components.find((x) => x.key === k)?.score;
            return (
              <tr key={p.slug} className="row stag" style={{ animationDelay: `${i * 25}ms` }}>
                <td className="mono muted">{i + 1}</td>
                <td style={{ fontWeight: 600 }}>
                  <Link href={dash(`/protocols/${p.slug}`)} style={{ color: 'var(--color-text)', display: 'inline-flex', alignItems: 'center', gap: 8 }}><ProtocolLogo slug={p.slug} name={p.name} size={20} radius={4} />{p.name}</Link>
                </td>
                <td className="caps muted">{p.category}</td>
                <td className="r mono">{fmtUsd(p.metrics.tvlUsd)}</td>
                {!compact && <td className="r"><PctDelta r={p.metrics.tvlChange7d} /></td>}
                <td><BandTag band={p.score.band} score={p.score.overall} /></td>
                {!compact && (
                  <>
                    <td className="r mono">{fmtScore(c('liquidity'))}</td>
                    <td className="r mono">{fmtScore(c('activity'))}</td>
                    <td className="r mono">{fmtScore(c('collateral'))}</td>
                    <td className="r mono">{fmtScore(c('transparency'))}</td>
                    <td className="r mono">{fmtInt(p.metrics.tx7d)}{p.metrics.activitySampled ? '*' : ''}</td>
                    <td className="r"><ScoreDelta d={p.delta7d} /></td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
