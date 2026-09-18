'use client';
import { useState } from 'react';

export interface BarGroup {
  label: string;
  href?: string;
  values: { key: string; label: string; color: string; value: number | null }[];
}

interface Props {
  groups: BarGroup[];
  height?: number;
  ariaLabel: string;
}

const M = { top: 14, right: 12, bottom: 26, left: 36 };

/** Grouped bars, 0–100 scale, per-bar hover tooltip. Null values render as a hatched placeholder. */
export default function GroupedBars({ groups, height = 210, ariaLabel }: Props) {
  const width = 640;
  const [hover, setHover] = useState<{ g: number; s: number } | null>(null);
  const plotW = width - M.left - M.right;
  const plotH = height - M.top - M.bottom;
  const gw = plotW / Math.max(groups.length, 1);
  const nS = groups[0]?.values.length ?? 1;
  const bw = Math.min(16, (gw * 0.7) / nS);
  const gap = 2;
  const y = (v: number) => M.top + (1 - v / 100) * plotH;
  const tip = hover ? groups[hover.g].values[hover.s] : null;
  const tipX = hover ? M.left + hover.g * gw + gw / 2 - ((nS - 1) * (bw + gap)) / 2 + hover.s * (bw + gap) : 0;

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label={ariaLabel}>
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-neutral-400)" strokeWidth="1.5" />
          </pattern>
        </defs>
        {[0, 25, 50, 75, 100].map((t) => (
          <g key={t}>
            <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke="var(--color-text)" strokeOpacity={t === 0 ? 0.5 : 0.1} strokeDasharray={t === 0 ? undefined : '3 3'} />
            <text x={M.left - 8} y={y(t) + 3} fontSize={9} textAnchor="end" fill="var(--color-neutral-600)">{t}</text>
          </g>
        ))}
        {groups.map((g, gi) => {
          const cx = M.left + gi * gw + gw / 2;
          const start = cx - ((nS - 1) * (bw + gap)) / 2;
          return (
            <g key={g.label}>
              {g.values.map((v, si) => {
                const x = start + si * (bw + gap) - bw / 2;
                const h = v.value == null ? 0 : (v.value / 100) * plotH;
                const active = hover && hover.g === gi && hover.s === si;
                return (
                  <g key={v.key} onMouseEnter={() => setHover({ g: gi, s: si })} onMouseLeave={() => setHover(null)}>
                    <rect x={x - 3} y={M.top} width={bw + 6} height={plotH} fill="transparent" />
                    {v.value == null ? (
                      <rect x={x} y={y(12)} width={bw} height={(12 / 100) * plotH} fill="url(#hatch)" opacity={0.8} />
                    ) : (
                      <path
                        d={`M${x},${y(0)} V${y(0) - h + 3} a3,3 0 0 1 3,-3 h${bw - 6} a3,3 0 0 1 3,3 V${y(0)} Z`}
                        fill={v.color}
                        opacity={hover && !active ? 0.55 : 1}
                      />
                    )}
                  </g>
                );
              })}
              <text x={cx} y={height - 8} fontSize={10} textAnchor="middle" fill="var(--color-neutral-700)">{g.label}</text>
            </g>
          );
        })}
      </svg>
      {tip && (
        <div className="chart-tip" style={{ left: `${(tipX / width) * 100}%`, top: `${((tip.value == null ? y(12) : y(tip.value)) / height) * 100}%` }}>
          <div style={{ opacity: 0.7 }}>{groups[hover!.g].label}</div>
          <span style={{ display: 'inline-block', width: 8, height: 8, background: tip.color, borderRadius: 2, marginRight: 6 }} />
          {tip.label}: <b>{tip.value == null ? 'n/a' : Math.round(tip.value)}</b>
        </div>
      )}
    </div>
  );
}
