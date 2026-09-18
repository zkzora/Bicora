export const fmtUsd = (n: number | null | undefined, digits = 1): string => {
  if (n == null || !Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(digits)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};
export const fmtInt = (n: number | null | undefined): string => (n == null ? '—' : Math.round(n).toLocaleString('en-US'));
export const fmtPct = (r: number | null | undefined, digits = 1): string =>
  r == null || !Number.isFinite(r) ? '—' : `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r * 100).toFixed(digits)}%`;
export const fmtDelta = (d: number | null | undefined): string => (d == null ? '— 0' : d > 0 ? `▲ ${d}` : d < 0 ? `▼ ${Math.abs(d)}` : '— 0');
export const fmtScore = (s: number | null | undefined): string => (s == null ? '—' : String(Math.round(s)));
export const fmtDate = (iso: string): string => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
export const fmtDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) + ' UTC';
export const shortId = (id: string): string => {
  const [addr, name] = id.split('.');
  return `${addr.slice(0, 5)}…${addr.slice(-4)}.${name}`;
};
export const bandMeaning: Record<string, string> = {
  Low: 'Deep liquidity, healthy collateral, documented',
  Moderate: 'Acceptable conditions, one indicator lagging',
  Elevated: 'Two or more indicators under threshold',
  High: 'Thin liquidity or unhealthy collateral',
};
export const componentColor: Record<string, string> = {
  liquidity: 'var(--series-1)',
  activity: 'var(--series-2)',
  collateral: 'var(--series-3)',
  transparency: 'var(--series-4)',
  overall: 'var(--series-ink)',
};
