interface Props { values: number[]; color?: string; width?: number; height?: number }

/** Tiny trend line; no axes, no hover — the adjacent number is the value. */
export default function Sparkline({ values, color = 'var(--series-ink)', width = 80, height = 28 }: Props) {
  if (values.length < 2) return <svg width={width} height={height} aria-hidden />;
  const mn = Math.min(...values);
  const mx = Math.max(...values);
  const pts = values
    .map((v, i) => `${((i * width) / (values.length - 1)).toFixed(1)},${(4 + (height - 8) * (1 - (v - mn) / (mx - mn || 1))).toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden style={{ flex: 'none' }}>
      <polyline fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" points={pts} />
    </svg>
  );
}
