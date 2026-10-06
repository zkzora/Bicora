import Link from 'next/link';
import type { Metadata } from 'next';
import { getSnapshot } from '@/lib/data';
import { fmtDateTime, fmtInt, fmtPct, fmtUsd } from '@/lib/format';
import { dash, site } from '@/lib/urls';
import Image from 'next/image';
import { MetricCard } from '@/components/cards';
import StakingMark from '@/components/StakingMark';

export const metadata: Metadata = { title: 'Bitcoin Staking (Stacks)' };

const fmtBtc = (n: number | null | undefined, digits = 2): string =>
  n == null || !Number.isFinite(n) ? 'N/A' : `${n.toFixed(n < 1 ? Math.max(digits, 4) : digits)} BTC`;
const fmtStx = (n: number | null | undefined): string =>
  n == null || !Number.isFinite(n) ? 'N/A' : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M STX` : `${fmtInt(n)} STX`;
const na = (v: React.ReactNode, ok: boolean) => (ok ? v : <span style={{ color: 'var(--color-muted)' }}>N/A</span>);

/** STX stacked by reward cycle. Server-rendered inline bars — x is the cycle number, not a date. */
function CycleBars({ history }: { history: { cycle: number; stackedStx: number; signers: number | null }[] }) {
  if (history.length < 2) return null;
  const W = 640, H = 170, P = { t: 14, r: 12, b: 26, l: 46 };
  const plotW = W - P.l - P.r, plotH = H - P.t - P.b;
  const max = Math.max(...history.map((h) => h.stackedStx));
  const min = Math.min(...history.map((h) => h.stackedStx));
  const lo = Math.max(0, min - (max - min) * 0.25);
  const y = (v: number) => P.t + (1 - (v - lo) / (max - lo || 1)) * plotH;
  const bw = Math.min(28, (plotW / history.length) * 0.62);
  const gw = plotW / history.length;
  const last = history[history.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="STX stacked by reward cycle">
      {[lo, lo + (max - lo) / 2, max].map((t, i) => (
        <g key={i}>
          <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="var(--color-text)" strokeOpacity={i === 0 ? 0.35 : 0.1} strokeDasharray={i === 0 ? undefined : '3 3'} />
          <text x={P.l - 8} y={y(t) + 3} fontSize={9} textAnchor="end" fill="var(--color-neutral-600)">{(t / 1e6).toFixed(0)}M</text>
        </g>
      ))}
      {history.map((h, i) => {
        const cx = P.l + i * gw + gw / 2;
        const isLast = i === history.length - 1;
        return (
          <g key={h.cycle}>
            <rect x={cx - bw / 2} y={y(h.stackedStx)} width={bw} height={Math.max(0, y(lo) - y(h.stackedStx))} rx={3}
              fill={isLast ? 'var(--color-accent)' : 'var(--series-4)'} opacity={isLast ? 1 : 0.5} />
            {(i === 0 || isLast || i === Math.floor(history.length / 2)) && (
              <text x={cx} y={H - 8} fontSize={9.5} textAnchor="middle" fill="var(--color-neutral-700)">{h.cycle}</text>
            )}
          </g>
        );
      })}
      <text x={P.l + (history.length - 1) * gw + gw / 2} y={y(last.stackedStx) - 6} fontSize={10} textAnchor="middle" fill="var(--color-accent-700)" fontWeight={600}>{(last.stackedStx / 1e6).toFixed(0)}M</text>
    </svg>
  );
}

export default async function StakingPage() {
  const { snapshot } = await getSnapshot();
  const s = snapshot.staking;

  if (!s) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <div className="k k-ink">Bitcoin Staking</div>
        <p className="muted" style={{ marginTop: 10 }}>Staking metrics will appear after the next data refresh.</p>
      </div>
    );
  }

  // Blocks written before observedAt existed: a live block was observed when it was written; a carried one is unknown.
  const observedAt = s.observedAt !== undefined ? s.observedAt : s.source === 'live' && s.stackedStx != null ? s.fetchedAt : null;
  const attemptedAt = s.lastAttemptAt ?? s.fetchedAt;
  const freshness =
    s.source === 'carried-forward'
      ? `Last good fetch ${observedAt ? fmtDateTime(observedAt) : 'time not recorded'} · latest attempt ${fmtDateTime(attemptedAt)} failed`
      : observedAt
        ? `Live from Proof of Transfer · updated ${fmtDateTime(observedAt)}`
        : `Live fetch failed ${fmtDateTime(attemptedAt)} · no earlier data`;
  const priceOk = s.stxPriceUsd != null;
  const cycleDays = s.cycleLengthBlocks != null ? Math.round((s.cycleLengthBlocks * 10) / 60 / 24) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* header */}
      <section className="card card-primary" style={{ padding: 24 }}>
        <div className="stk-head">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <StakingMark size={44} radius={10} />
                <h2 style={{ fontSize: 28, letterSpacing: '-0.02em', margin: 0 }}>Bitcoin Staking (Stacks)</h2>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="tag tag-neutral">Proof of Transfer</span>
                <span className="tag tag-outline">Informational · not in Risk Index</span>
              </div>
            </div>
            <p style={{ fontSize: 14, color: 'var(--color-text-2)', lineHeight: 1.65, maxWidth: '64ch' }}>
              Stacks&rsquo; native Bitcoin yield. STX is committed to Proof of Transfer and BTC rewards are paid to stackers every cycle; the newer Bitcoin Staking program locks BTC directly on the Bitcoin L1 under its own keys. Tracked here for context — it is <b style={{ color: 'var(--color-text)' }}>not scored</b> and not part of the Bicora Risk Index.
            </p>
          </div>
          <div className="stk-head-num">
            <div className="k k-muted" style={{ fontSize: 10 }}>STX committed</div>
            <div className="tnum" style={{ fontFamily: 'var(--font-heading)', fontSize: 34, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{fmtStx(s.stackedStx)}</div>
            <div className="muted" style={{ fontSize: 11.5 }}>{na(fmtUsd(s.stackingTvlUsd), s.stackingTvlUsd != null)} staking value</div>
          </div>
        </div>
      </section>

      {/* primary metrics */}
      <div>
        <div className="section-head"><span className="k k-ink">Locked assets &amp; yield</span><span className="sub">{freshness}</span></div>
        <div className="dash-secondary">
          <MetricCard label="STX committed" value={fmtStx(s.stackedStx)} sub={s.pctSupplyStacked != null ? `${fmtPct(s.pctSupplyStacked, 1).replace('+', '')} of STX supply` : 'share N/A'} />
          <MetricCard label="Staking TVL" value={na(fmtUsd(s.stackingTvlUsd), s.stackingTvlUsd != null)} sub={priceOk ? `STX × $${s.stxPriceUsd!.toFixed(3)}` : 'STX price N/A'} delay={30} />
          <MetricCard label="Realized BTC yield" value={na(fmtBtc(s.btcYieldPerCycleEst), s.btcYieldPerCycleEst != null)} sub={`per cycle (est)${s.btcRewardPerBlockAvg != null ? ` · ${s.btcRewardPerBlockAvg.toFixed(4)} BTC/block` : ''}`} delay={60} />
          <MetricCard label="Target BTC APY" value={na(s.targetBtcApy != null ? `~${(s.targetBtcApy * 100).toFixed(0)}%` : '', s.targetBtcApy != null)} sub="native program target · not a guarantee" delay={90} />
          <MetricCard label="BTC bonded (L1)" value={<span style={{ color: 'var(--color-muted)' }}>N/A</span>} sub="no public aggregate API" delay={120} />
        </div>
      </div>

      {/* cycle + timing */}
      <div className="two-up">
        <section className="card">
          <div className="card-head"><div><div className="card-title">STX stacked by reward cycle</div><div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>Last {s.history.length} cycles · current cycle highlighted</div></div></div>
          {s.history.length > 1 ? <CycleBars history={s.history} /> : <div className="muted" style={{ fontSize: 13 }}>Cycle history N/A this run.</div>}
        </section>
        <section className="card">
          <div className="card-head"><div><div className="card-title">Liquidity &amp; unlock</div><div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>No Liquidity Health score — staking is not scored; this is the lock-up picture</div></div></div>
          <div className="table-wrap"><table className="table"><tbody>
            <tr><td>Asset liquidity</td><td className="r">Locked per cycle · liquid via stSTX</td></tr>
            <tr><td>Current reward cycle</td><td className="r tnum">{na(`#${s.currentCycle}`, s.currentCycle != null)}</td></tr>
            <tr><td>Cycle length</td><td className="r tnum">{na(`${s.cycleLengthBlocks} blocks${cycleDays != null ? ` · ~${cycleDays}d` : ''}`, s.cycleLengthBlocks != null)}</td></tr>
            <tr><td>Next cycle in</td><td className="r tnum">{na(`${fmtInt(s.blocksUntilNextCycle)} blocks`, s.blocksUntilNextCycle != null)}</td></tr>
            <tr><td>Next cycle ETA</td><td className="r tnum">{na(s.nextCycleEta ? fmtDateTime(s.nextCycleEta) : '', s.nextCycleEta != null)}</td></tr>
            <tr><td>Min to stack solo</td><td className="r tnum">{na(fmtStx(s.minThresholdStx), s.minThresholdStx != null)}</td></tr>
            <tr><td>Active signers</td><td className="r tnum">{na(fmtInt(s.totalSigners), s.totalSigners != null)}</td></tr>
            <tr><td>Bitcoin Staking bond period</td><td className="r tnum">{fmtInt(s.bondPeriodBlocks)} blocks · ~6mo</td></tr>
            <tr><td>Cumulative BTC distributed</td><td className="r tnum">{na(`~${fmtInt(s.cumulativeBtcDistributed)} BTC`, s.cumulativeBtcDistributed != null)}</td></tr>
          </tbody></table></div>
        </section>
      </div>

      {/* double-count guard */}
      <section className="card">
        <div className="card-head"><div><div className="card-title">How this relates to tracked TVL</div><div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>Stacking value is separate from the scored DeFi index — and overlaps it only through liquid-staking</div></div></div>
        <div className="dash-secondary" style={{ marginTop: 4 }}>
          <MetricCard label="Stacking TVL (STX)" value={na(fmtUsd(s.stackingTvlUsd), s.stackingTvlUsd != null)} sub="STX committed to PoX" />
          <MetricCard label="Scored DeFi index" value={fmtUsd(snapshot.market.totalTvlUsd)} sub={`${snapshot.market.protocolsTracked} protocols (DefiLlama)`} delay={30} />
          <MetricCard label="Liquid-stacked overlap" value={na(fmtUsd(s.liquidStackedUsd), s.liquidStackedUsd != null)} sub="via StackingDAO · already in the index" delay={60} />
        </div>
        <p className="muted" style={{ fontSize: 12, lineHeight: 1.6, marginTop: 14 }}>
          Stacking TVL is the USD value of STX locked in Proof of Transfer. It does <b style={{ color: 'var(--color-text-2)' }}>not</b> sit inside the scored DeFi index (PoX stacking is not a DefiLlama protocol). The one overlap is STX stacked through liquid-staking apps such as StackingDAO, which is already counted in their DeFi TVL — shown above so the two are never double-summed. The chain-wide &ldquo;Stacks TVL&rdquo; quoted on stacks.co combines both plus bonded BTC, and is a different figure again. BTC bonded in the native Bitcoin Staking program is N/A: it sits in individual Bitcoin L1 timelocks with no public aggregate source.
        </p>
        <div style={{ borderTop: '1px solid var(--color-rule)', marginTop: 16, paddingTop: 14 }}>
          <div className="k k-muted" style={{ fontSize: 10, marginBottom: 8 }}>Reconciling with &ldquo;Stacks by the numbers&rdquo; (stacks.co)</div>
          <div className="table-wrap"><table className="table"><tbody>
            <tr><td>Total Yield Distributed · ~4,224 BTC</td><td className="r" style={{ color: 'var(--status-low)' }}>matches — our cumulative BTC distributed</td></tr>
            <tr><td>Target BTC APY · ~3%</td><td className="r" style={{ color: 'var(--status-low)' }}>matches — shown above</td></tr>
            <tr><td>Stacks TVL · ~$494M (STX &amp; BTC)</td><td className="r">chain-wide: stacked STX + sBTC + DeFi. Ours ({na(fmtUsd(s.stackingTvlUsd), s.stackingTvlUsd != null)}) is the STX-stacking slice only</td></tr>
          </tbody></table></div>
        </div>
      </section>

      {/* sources */}
      <section className="card">
        <div className="card-head" style={{ alignItems: 'center' }}>
          <div className="card-title">Data sources &amp; methodology</div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--color-muted)' }}>
            Data from <Image className="stacks-wordmark" src="/stacks-staking.avif" alt="Stacks" width={113} height={22} style={{ height: 18, width: 'auto' }} />
          </span>
        </div>
        <ul style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 12.5, listStyle: 'none', padding: 0, margin: '0 0 12px' }}>
          {s.sources.map((src) => (
            <li key={src.url}><a href={src.url} target="_blank" rel="noreferrer">{src.label} ↗</a></li>
          ))}
        </ul>
        <ul className="muted" style={{ fontSize: 11.5, lineHeight: 1.7, paddingLeft: 18, margin: 0 }}>
          {s.notes.map((n) => (<li key={n}>{n}</li>))}
        </ul>
        <p style={{ fontSize: 12, marginTop: 14 }}>
          <Link href={site('/methodology')}>Risk methodology</Link> · <Link href={dash('/')}>Back to overview</Link>
        </p>
      </section>
    </div>
  );
}
