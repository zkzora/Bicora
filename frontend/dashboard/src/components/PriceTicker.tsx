'use client';
import { useEffect, useState } from 'react';

interface Quote { usd: number; change24h: number | null }
interface Prices { btc: Quote; stx: Quote; at: number }

const REFRESH_MS = 60_000;

/** CoinGecko first (has 24h change, CORS-enabled); Coinbase spot as fallback. */
async function fetchPrices(): Promise<Prices> {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,blockstack&vs_currencies=usd&include_24hr_change=true', { cache: 'no-store' });
    if (!r.ok) throw new Error(String(r.status));
    const j = (await r.json()) as Record<string, { usd: number; usd_24h_change?: number }>;
    if (!j.bitcoin?.usd || !j.blockstack?.usd) throw new Error('shape');
    return { btc: { usd: j.bitcoin.usd, change24h: j.bitcoin.usd_24h_change ?? null }, stx: { usd: j.blockstack.usd, change24h: j.blockstack.usd_24h_change ?? null }, at: Date.now() };
  } catch {
    const [b, s] = await Promise.all([
      fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot').then((r) => r.json()),
      fetch('https://api.coinbase.com/v2/prices/STX-USD/spot').then((r) => r.json()),
    ]);
    return { btc: { usd: Number(b.data.amount), change24h: null }, stx: { usd: Number(s.data.amount), change24h: null }, at: Date.now() };
  }
}

const usd = (n: number, digits: number) => n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

function Quote({ sym, q, digits }: { sym: string; q: Quote; digits: number }) {
  const c = q.change24h;
  return (
    <span className="ticker-item">
      <span className="ticker-sym">{sym}</span>
      <span className="ticker-px tnum">{usd(q.usd, digits)}</span>
      {c != null && <span className={`ticker-chg tnum ${c >= 0 ? 'up' : 'down'}`}>{c >= 0 ? '+' : '−'}{Math.abs(c).toFixed(2)}%</span>}
    </span>
  );
}

/** Live BTC / STX spot prices, refreshed every minute while the tab is visible. */
export default function PriceTicker({ compact = false }: { compact?: boolean }) {
  const [p, setP] = useState<Prices | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const load = () => fetchPrices().then((x) => { setP(x); setErr(false); }).catch(() => setErr(true));
    const start = () => { load(); timer = setInterval(load, REFRESH_MS); };
    const stop = () => { if (timer) clearInterval(timer); timer = undefined; };
    const onVis = () => (document.visibilityState === 'visible' ? (stop(), start()) : stop());
    start();
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  if (!p) return <span className={`ticker ${compact ? 'ticker-compact' : ''}`} aria-live="polite">{err ? <span className="muted">prices unavailable</span> : <span className="muted">BTC · STX …</span>}</span>;
  return (
    <span className={`ticker ${compact ? 'ticker-compact' : ''}`} aria-live="polite" title={`Spot prices · ${new Date(p.at).toUTCString().replace(' GMT', ' UTC')}`}>
      <Quote sym="BTC" q={p.btc} digits={0} />
      <Quote sym="STX" q={p.stx} digits={2} />
    </span>
  );
}
