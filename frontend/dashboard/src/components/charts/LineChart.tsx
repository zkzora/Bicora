'use client';
import { useMemo, useRef, useState } from 'react';
import { fmtDate, fmtUsd } from '@/lib/format';

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  points: { date: string; value: number }[];
  area?: boolean;
}

interface Props {
  series: LineSeries[];
  height?: number;
  yDomain?: [number, number];
  /** Serialisable formatter choice so server components can pass it. */
  formatKind?: 'score' | 'usd';
  ariaLabel: string;
  endLabels?: boolean;
}

const M = { top: 14, right: 56, bottom: 26, left: 44 };

/** Multi-series line/area chart on a shared date axis with a crosshair tooltip. */
export default function LineChart({ series, height = 240, yDomain, formatKind = 'score', ariaLabel, endLabels = true }: Props) {
  const width = 960;
  const format = formatKind === 'usd' ? (v: number) => fmtUsd(v, 1) : (v: number) => v.toFixed(0);
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const { dates, x, y, ticks, paths } = useMemo(() => {
    const set = new Set<string>();
    for (const s of series) for (const p of s.points) set.add(p.date);
    const dates = [...set].sort();
    const n = Math.max(dates.length - 1, 1);
    const x = (i: number) => M.left + (i / n) * (width - M.left - M.right);
    const all = series.flatMap((s) => s.points.map((p) => p.value));
    let [lo, hi] = yDomain ?? [Math.min(...all), Math.max(...all)];
    if (!yDomain) {
      const pad = (hi - lo || Math.abs(hi) || 1) * 0.12;
      lo = Math.max(0, lo - pad);
      hi = hi + pad;
    }
    const y = (v: number) => M.top + (1 - (v - lo) / (hi - lo || 1)) * (height - M.top - M.bottom);
    const ticks = Array.from({ length: 5 }, (_, i) => lo + ((hi - lo) * i) / 4);
    const idx = new Map(dates.map((d, i) => [d, i]));
    const paths = series.map((s) => {
      const pts = s.points.map((p) => [x(idx.get(p.date)!), y(p.value)] as const);
      const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
      const base = y(lo);
      const area = pts.length ? `${line} L${pts[pts.length - 1][0].toFixed(1)},${base} L${pts[0][0].toFixed(1)},${base} Z` : '';
      return { ...s, pts, line, areaPath: area, idx };
    });
    return { dates, x, y, ticks, paths };
  }, [series, height, yDomain]);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * width;
    const i = Math.round(((px - M.left) / (width - M.left - M.right)) * (dates.length - 1));
    setHover(Math.max(0, Math.min(dates.length - 1, i)));
  };

  const monthTicks = dates.map((d, i) => ({ d, i })).filter(({ d, i }) => i === 0 || d.slice(0, 7) !== dates[i - 1].slice(0, 7));

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={ref} viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label={ariaLabel} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke="var(--color-text)" strokeOpacity={i === 0 ? 0.5 : 0.1} strokeDasharray={i === 0 ? undefined : '3 3'} />
            <text x={M.left - 8} y={y(t) + 3} fontSize={9} textAnchor="end" fill="var(--color-neutral-600)">{format(t)}</text>
          </g>
        ))}
        {monthTicks.map(({ d, i }) => (
          <text key={d} x={x(i)} y={height - 8} fontSize={10} fill="var(--color-neutral-600)" textAnchor={i === 0 ? 'start' : 'middle'}>
            {new Date(d).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })}
          </text>
        ))}
        {paths.map((s) => (
          <g key={s.key}>
            {s.area && <path d={s.areaPath} fill={s.color} fillOpacity={0.12} />}
            <path d={s.line} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {s.pts.length > 0 && (
              <circle cx={s.pts[s.pts.length - 1][0]} cy={s.pts[s.pts.length - 1][1]} r={4} fill="var(--color-bg)" stroke={s.color} strokeWidth={2} />
            )}
            {endLabels && s.pts.length > 0 && (
              <text x={s.pts[s.pts.length - 1][0] + 9} y={s.pts[s.pts.length - 1][1] + 4} fontSize={11} fontWeight={600} fill="var(--color-text)">
                {format(s.points[s.points.length - 1].value)}
              </text>
            )}
          </g>
        ))}
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={height - M.bottom} stroke="var(--color-text)" strokeOpacity={0.35} />
            {paths.map((s) => {
              const i = s.idx.get(dates[hover]);
              const p = i != null ? s.points[i] : undefined;
              return p ? <circle key={s.key} cx={x(hover)} cy={y(p.value)} r={4.5} fill={s.color} stroke="var(--color-bg)" strokeWidth={2} /> : null;
            })}
          </g>
        )}
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: `${(x(hover) / width) * 100}%`, top: `${(M.top / height) * 100}%` }}>
          <div style={{ opacity: 0.7 }}>{fmtDate(dates[hover])}</div>
          {paths.map((s) => {
            const i = s.idx.get(dates[hover]);
            const p = i != null ? s.points[i] : undefined;
            return p ? (
              <div key={s.key}>
                <span style={{ display: 'inline-block', width: 8, height: 8, background: s.color, borderRadius: 2, marginRight: 6 }} />
                {s.label}: <b>{format(p.value)}</b>
              </div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}
