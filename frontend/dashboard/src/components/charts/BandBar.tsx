import type { Band } from '@/lib/types';

const ORDER: Band[] = ['Low', 'Moderate', 'Elevated', 'High'];
const COLOR: Record<Band, string> = {
  Low: 'var(--status-low)',
  Moderate: 'var(--status-moderate)',
  Elevated: 'var(--status-elevated)',
  High: 'var(--status-high)',
};

/** Distribution of protocols across risk bands as one segmented bar with a labelled legend. */
export default function BandBar({ distribution }: { distribution: Record<Band, number> }) {
  const total = ORDER.reduce((s, b) => s + distribution[b], 0) || 1;
  return (
    <div>
      <div style={{ display: 'flex', height: 16, borderRadius: 4, overflow: 'hidden', gap: 2, background: 'var(--color-neutral-200)' }}>
        {ORDER.filter((b) => distribution[b] > 0).map((b) => (
          <div key={b} style={{ width: `${(distribution[b] / total) * 100}%`, background: COLOR[b] }} title={`${b}: ${distribution[b]}`} />
        ))}
      </div>
      <div className="legend" style={{ marginTop: 10, gap: '8px 16px' }}>
        {ORDER.map((b) => (
          <span key={b}>
            <i style={{ background: COLOR[b] }} />
            {b} <b className="tnum" style={{ color: 'var(--color-text)' }}>{distribution[b]}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
