export const log = (scope: string) => (msg: string, ...rest: unknown[]) =>
  console.log(`[${new Date().toISOString()}] [${scope}] ${msg}`, ...rest);

export function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function pctChange(now: number, before: number | undefined | null): number | null {
  if (before == null || before === 0 || !Number.isFinite(before)) return null;
  return (now - before) / before;
}

export function isoDay(d: Date | number | string): string {
  return new Date(d).toISOString().slice(0, 10);
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}
