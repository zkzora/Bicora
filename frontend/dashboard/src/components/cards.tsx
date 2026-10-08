import Link from 'next/link';
import type { Band, RiskEvent, SnapshotProtocol, StakingSnapshot } from '@/lib/types';
import { bandMeaning, componentColor, fmtDateTime, fmtDelta, fmtInt, fmtUsd } from '@/lib/format';
import { dash } from '@/lib/urls';
import ProtocolLogo from './ProtocolLogo';
import StakingMark from './StakingMark';
import Sparkline from './charts/Sparkline';
import { BandTag, PctDelta, ScoreDelta } from './ui';

/* ------------------------------------------------------------------ RiskScoreCard */
export function RiskScoreCard({
  score, band, previous, change7d, change30d, updatedAt, protocols, liquidityUsd, liquidityChange7d, liquidityLabel, liquidityNote, activeAddresses, history, title = 'Bicora Risk Index',
}: {
  score: number; band: Band; previous: number | null; change7d: number | null; change30d: number | null; updatedAt: string;
  protocols: number; liquidityUsd: number; liquidityChange7d: number | null; liquidityLabel?: string; liquidityNote?: string; activeAddresses: number; history: { date: string; score: number }[]; title?: string;
}) {
  const movement = change7d ?? (previous != null ? score - previous : null);
  return (
    <section className="card card-primary risk-score" data-tour="index" aria-label={title}>
      <div>
        <div className="k">{title}</div>
        <div className="big" style={{ marginTop: 10 }}>
          <span className="num tnum">{score}</span>
          <span className="den">/ 100</span>
        </div>
        <div className={`band c-${band}`}><span className={`dot dot-${band}`} aria-hidden />{band} risk</div>
        <p className="desc">{bandMeaning[band]}. Mean of {protocols} tracked protocol scores; higher is safer. Updated {fmtDateTime(updatedAt)}.</p>
      </div>
      <div className="facts">
        <div className="fact"><div className="l">Protocols tracked</div><div className="v tnum">{protocols}</div><div className="s">Stacks mainnet</div></div>
        <div className="fact"><div className="l">{liquidityLabel ?? 'Tracked protocol TVL · DefiLlama sum'}</div><div className="v tnum">{fmtUsd(liquidityUsd)}</div><div className="s"><PctDelta r={liquidityChange7d} suffix="7d" />{liquidityNote && <div className="muted" style={{ marginTop: 4, fontSize: 10.5, lineHeight: 1.4 }}>{liquidityNote}</div>}</div></div>
        <div className="fact"><div className="l">Active addresses · 7d</div><div className="v tnum">{fmtInt(activeAddresses)}</div><div className="s">unique senders</div></div>
        <div className="fact"><div className="l">Risk movement</div><div className="v tnum"><ScoreDelta d={movement} /></div><div className="s">{change7d != null ? 'vs 7 days ago' : previous != null ? 'vs previous run' : '30d ' + fmtDelta(change30d)}</div></div>
        {history.length > 1 && (
          <div className="spark" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Sparkline values={history.map((h) => h.score)} color="var(--color-accent)" width={160} height={32} />
            <span className="muted" style={{ fontSize: 11 }}>Index history · {history.length} scoring runs since {history[0].date}</span>
          </div>
        )}
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------- MetricCard */
export function MetricCard({ label, value, sub, delay = 0 }: { label: string; value: React.ReactNode; sub?: React.ReactNode; delay?: number }) {
  return (
    <div className="card metric stag" style={{ animationDelay: `${delay}ms` }}>
      <div className="label">{label}</div>
      <div className="value tnum">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ ProtocolRiskCard */
const SHORT: Record<string, string> = { liquidity: 'Liquidity', activity: 'Activity', collateral: 'Collateral', transparency: 'Transparency' };

export function ProtocolRiskCard({ p, delay = 0 }: { p: SnapshotProtocol; delay?: number }) {
  const weakest = [...p.score.components].filter((c) => c.score != null).sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];
  return (
    <Link href={dash(`/protocols/${p.slug}`)} className="card pcard stag" style={{ animationDelay: `${delay}ms` }}>
      <div className="top">
        <ProtocolLogo slug={p.slug} name={p.name} size={36} radius={8} />
        <div>
          <div className="name">{p.name}</div>
          <div className="cat">{p.category}</div>
        </div>
        <div className="score">
          <div className={`n tnum c-${p.score.band}`}>{p.score.overall}</div>
          <BandTag band={p.score.band} />
        </div>
      </div>
      <div className="factors">
        {p.score.components.map((c) => (
          <div key={c.key} className="factor">
            <div className="l"><i style={{ background: componentColor[c.key] }} /><span>{SHORT[c.key]}</span></div>
            <div className="v tnum">{c.score == null ? '—' : Math.round(c.score)}</div>
          </div>
        ))}
      </div>
      <div className="why">
        <b style={{ color: 'var(--color-text)' }}>Main factor:</b> {weakest ? `${weakest.label} (${Math.round(weakest.score ?? 0)}). ${weakest.explanation?.split('. ')[0] ?? ''}${weakest.explanation ? '.' : ''}` : '—'}
      </div>
    </Link>
  );
}

/* --------------------------------------------------------------- StakingCard */
/** Looks like a protocol card, but informational — it carries staking metrics, no score. */
export function StakingCard({ s, delay = 0 }: { s: StakingSnapshot; delay?: number }) {
  const stx = s.stackedStx == null ? 'N/A' : s.stackedStx >= 1e6 ? `${(s.stackedStx / 1e6).toFixed(0)}M` : fmtInt(s.stackedStx);
  const btcYield = s.btcYieldPerCycleEst == null ? 'N/A' : `${s.btcYieldPerCycleEst.toFixed(1)}`;
  const factors: [string, React.ReactNode][] = [
    ['STX committed', <>{stx}</>],
    ['Staking TVL', s.stackingTvlUsd == null ? 'N/A' : fmtUsd(s.stackingTvlUsd)],
    ['BTC / cycle', btcYield],
    ['BTC bonded', <span style={{ color: 'var(--color-muted)' }}>N/A</span>],
  ];
  return (
    <Link href={dash('/staking')} className="card pcard stag" style={{ animationDelay: `${delay}ms` }}>
      <div className="top">
        <StakingMark size={36} radius={8} />
        <div>
          <div className="name">Bitcoin Staking (Stacks)</div>
          <div className="cat">Proof of Transfer</div>
        </div>
        <div className="score">
          <div className="tnum" style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1, color: 'var(--color-accent-700)' }}>{stx}<span style={{ fontSize: 12, color: 'var(--color-muted)' }}> STX</span></div>
          <span className="tag tag-outline" style={{ marginTop: 6, display: 'inline-block' }}>Not scored</span>
        </div>
      </div>
      <div className="factors">
        {factors.map(([l, v]) => (
          <div key={l} className="factor">
            <div className="l"><i style={{ background: 'var(--color-neutral-400)' }} /><span>{l}</span></div>
            <div className="v tnum">{v}</div>
          </div>
        ))}
      </div>
      <div className="why">
        <b style={{ color: 'var(--color-text)' }}>Native Bitcoin yield.</b> STX committed to Proof of Transfer; BTC rewards paid each cycle. Informational — not in the Risk Index.
      </div>
    </Link>
  );
}

/* ---------------------------------------------------------------------- AlertCard */
const KIND: Record<RiskEvent['kind'], string> = { liquidity: 'Liquidity', activity: 'Activity', collateral: 'Collateral', transparency: 'Transparency', score: 'Score' };
const REASON: Record<RiskEvent['kind'], string> = { liquidity: 'TVL movement detected', collateral: 'Utilisation threshold crossed', activity: 'Activity change detected', transparency: 'Registry drift detected', score: 'Composite score change' };

export function AlertCard({ e, name, showProtocol = true }: { e: RiskEvent; name: string; showProtocol?: boolean }) {
  const text = e.message.startsWith(name) ? e.message.slice(name.length).replace(/^[\s:—-]+/, '') : e.message;
  const impact = e.impact ?? (e.severity === 'alert' ? 'High' : e.severity === 'watch' ? 'Medium' : 'Low');
  return (
    <article className="card acard" data-impact={impact}>
      <div className="stripe" aria-hidden />
      <div className="abody">
        <div className="atop">
          <span className="k k-muted no-sq" style={{ fontSize: 10 }}>Risk event</span>
          <span className="mono muted" style={{ fontSize: 11 }}>{fmtDateTime(e.ts)}</span>
        </div>
        {showProtocol && <Link href={dash(`/protocols/${e.slug}`)} className="aproto">{name}</Link>}
        <div className="amsg">{text.charAt(0).toUpperCase() + text.slice(1)}</div>
        <div className="ameta">
          <span>Category<b>{KIND[e.kind]}</b></span>
          <span>Impact<b className={`c-${impact === 'High' ? 'High' : impact === 'Medium' ? 'Moderate' : 'Low'}`}>{impact}</b></span>
          <span>Reason<b>{e.reason ?? REASON[e.kind]}</b></span>
        </div>
      </div>
    </article>
  );
}

/* ---------------------------------------------------------------------- ChartCard */
export function ChartCard({ title, sub, aside, children, tour }: { title: string; sub?: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode; tour?: string }) {
  return (
    <section className="card" data-tour={tour}>
      <div className="card-head">
        <div>
          <div className="card-title">{title}</div>
          {sub && <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{sub}</div>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

/* ----------------------------------------------------------------- MethodologyCard */
export function MethodologyCard({ pct, name, color, summary, bullets }: { pct: string; name: string; color: string; summary: string; bullets: string[] }) {
  return (
    <div className="card mcard">
      <div className="pct">{pct}</div>
      <h3><span style={{ display: 'inline-block', width: 10, height: 10, background: color, borderRadius: 2, marginRight: 8 }} />{name}</h3>
      <p>{summary}</p>
      <ul>{bullets.map((b) => (<li key={b}>{b}</li>))}</ul>
    </div>
  );
}
