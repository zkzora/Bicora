import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProtocol, getSnapshot } from '@/lib/data';
import { componentColor, fmtDate, fmtInt, fmtPct, fmtUsd, shortId } from '@/lib/format';
import { dash, site } from '@/lib/urls';
import { BandTag, PctDelta, ScoreDelta } from '@/components/ui';
import { AlertCard, ChartCard, MetricCard } from '@/components/cards';
import Sparkline from '@/components/charts/Sparkline';
import ProtocolHistory from '@/components/ProtocolHistory';
import ProtocolLogo from '@/components/ProtocolLogo';
import RiskFactorCard from '@/components/RiskFactorCard';

export async function generateStaticParams() {
  const { snapshot } = await getSnapshot();
  return snapshot.protocols.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { protocol } = await getProtocol((await params).slug);
  return { title: protocol ? `${protocol.name} risk` : 'Protocol' };
}

export default async function ProtocolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { snapshot, protocol: p } = await getProtocol(slug);
  if (!p) notFound();
  const names = Object.fromEntries(snapshot.protocols.map((x) => [x.slug, x.name]));
  const m = p.metrics;
  const tokens = Object.entries(m.tokens).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const tokenTotal = tokens.reduce((s, [, v]) => s + v, 0) || 1;
  const weakest = [...p.score.components].filter((c) => c.score != null).sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];
  const strongest = [...p.score.components].filter((c) => c.score != null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  const rank = snapshot.protocols.findIndex((x) => x.slug === p.slug) + 1;
  const events = snapshot.events.filter((e) => e.slug === p.slug);
  const swatch = ['var(--color-accent)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--color-neutral-500)', 'var(--color-neutral-400)'];

  return (
    <div className="proto-layout">
      <aside className="proto-side">
        <div className="k k-muted" style={{ padding: '6px 12px 10px' }}>Tracked protocols</div>
        {snapshot.protocols.map((x) => (
          <Link key={x.slug} href={dash(`/protocols/${x.slug}`)} aria-current={x.slug === p.slug ? 'page' : undefined}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><ProtocolLogo slug={x.slug} name={x.name} size={18} radius={4} />{x.name}</span>
            <span className={`mono c-${x.score.band}`}>{x.score.overall}</span>
          </Link>
        ))}
      </aside>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32, minWidth: 0 }}>
        {/* ---------------------------------------------------------- header */}
        <section className="card card-primary" style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 24, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <ProtocolLogo slug={p.slug} name={p.name} size={48} radius={10} />
                <div>
                  <h2 style={{ fontSize: 28, letterSpacing: '-0.02em' }}>{p.name}</h2>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                    <span className="tag tag-neutral">{p.category}</span>
                    <span className="muted" style={{ fontSize: 11.5 }}>Rank #{rank} of {snapshot.protocols.length}</span>
                  </div>
                </div>
              </div>
              <p style={{ color: 'var(--color-text-2)', maxWidth: '64ch', fontSize: 13.5 }}>{p.description}</p>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 12.5 }}>
                <div><div className="k k-muted no-sq" style={{ fontSize: 10 }}>Official links</div><div style={{ display: 'flex', gap: 12, marginTop: 2 }}><a href={p.website} target="_blank" rel="noreferrer">Website ↗</a>{p.docs && <a href={p.docs} target="_blank" rel="noreferrer">Docs ↗</a>}{p.github && <a href={p.github} target="_blank" rel="noreferrer">GitHub ↗</a>}</div></div>
                <div><div className="k k-muted no-sq" style={{ fontSize: 10 }}>Assets</div><div style={{ marginTop: 2, color: 'var(--color-text-2)' }}>{p.assets.join(' · ')}</div></div>
              </div>
            </div>
            <div style={{ textAlign: 'right', minWidth: 150 }}>
              <div className="k k-muted no-sq" style={{ fontSize: 10, justifyContent: 'flex-end' }}>Overall risk score</div>
              <div className={`score-hero tnum c-${p.score.band}`} style={{ marginTop: 6 }}>{p.score.overall}<span style={{ fontSize: 18, color: 'var(--color-faint)', letterSpacing: 0 }}> /100</span></div>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, fontSize: 12, color: 'var(--color-muted)' }}>
                <BandTag band={p.score.band} />
                <span><ScoreDelta d={p.delta7d} /> vs 7d ago</span>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--color-rule)', paddingTop: 14, fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.65 }}>
            <b style={{ color: 'var(--color-text)' }}>Summary.</b>{' '}
            {strongest && weakest ? `${strongest.label} is the strongest component (${Math.round(strongest.score ?? 0)}); ${weakest.label.toLowerCase()} is the main drag (${Math.round(weakest.score ?? 0)}). ${weakest.explanation?.split('. ')[0] ?? ''}${weakest.explanation ? '.' : ''}` : ''}
            {' '}Methodology v{p.score.methodologyVersion}; weights shown on each factor.
          </div>
        </section>

        {(p.dataQuality.note || p.dataQuality.warnings.length > 0 || p.dataQuality.activitySampled) && (
          <div className="note-box">
            <b>Data quality.</b>{' '}
            {p.dataQuality.note && <>{p.dataQuality.note} </>}
            {p.dataQuality.activitySampled && <>Activity counts are extrapolated from a sampled window (pagination cap). </>}
            {p.dataQuality.warnings.map((w) => (<span key={w}>{w}. </span>))}
          </div>
        )}

        {/* --------------------------------------------------- risk breakdown */}
        <section className="report-section">
          <div className="section-head">
            <span className="k k-ink">Risk breakdown</span>
            <span className="sub">Four components · expand a card for the reasons behind the number · <Link href={site('/methodology')}>methodology</Link></span>
          </div>
          <div className="fcards">
            {p.score.components.map((c) => (
              <RiskFactorCard key={c.key} c={c} effectiveWeight={p.score.effectiveWeights[c.key]} history={p.scoreHistory} liquidityBackfill={c.key === 'liquidity' ? p.liquidityScoreHistory : undefined} />
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------- historical data */}
        <section className="report-section">
          <div className="section-head">
            <span className="k k-ink">Historical data</span>
            <span className="sub">Scores accumulate one point per run · TVL and liquidity score are back-filled 90 days</span>
          </div>
          <ProtocolHistory p={p} />
        </section>

        {/* ------------------------------------------------------ market metrics */}
        <section className="report-section">
          <div className="section-head">
            <span className="k k-ink">Market metrics</span>
            <span className="sub">Observed inputs behind the score</span>
          </div>
          <div className="dash-secondary">
            <MetricCard label="TVL" value={fmtUsd(m.tvlUsd)} sub={<><PctDelta r={m.tvlChange7d} suffix="7d" /><PctDelta r={m.tvlChange30d} suffix="30d" /></>} />
            <MetricCard label="Transactions · 7d" value={<>{fmtInt(m.tx7d)}{m.activitySampled ? '*' : ''}</>} sub={`${fmtInt(m.uniqueSenders7d)} unique senders`} delay={30} />
            <MetricCard label={p.hasCollateral ? 'Utilisation' : 'Collateral'} value={m.utilization == null ? '—' : `${(m.utilization * 100).toFixed(1)}%`} sub={m.borrowedUsd != null ? `${fmtUsd(m.borrowedUsd)} borrowed` : p.hasCollateral ? 'no borrowed data' : 'not applicable'} delay={60} />
            <MetricCard label="Liquidity score · 30d" value={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>{Math.round(p.score.components[0].score ?? 0)}<Sparkline values={p.liquidityScoreHistory.slice(-30).map((x) => x.score)} color={componentColor.liquidity} width={72} height={24} /></span>} sub={`${fmtPct(m.tvlChange30d)} TVL over 30 days`} delay={90} />
          </div>
          <div className="two-up">
            {tokens.length > 0 && (
              <ChartCard title="Liquidity by asset" sub="Latest token breakdown from DefiLlama">
                <div style={{ display: 'flex', height: 12, borderRadius: 4, overflow: 'hidden', gap: 2 }}>
                  {tokens.map(([t, v], i) => (<div key={t} style={{ width: `${(v / tokenTotal) * 100}%`, background: swatch[i] }} title={t} />))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', fontSize: 12.5 }}>
                  {tokens.map(([t, v], i) => (
                    <div key={t} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderTop: '1px solid var(--color-rule)' }}>
                      <span><i style={{ display: 'inline-block', width: 10, height: 10, marginRight: 8, borderRadius: 2, background: swatch[i] }} />{t}</span>
                      <span className="mono">{fmtUsd(v)} · {((v / tokenTotal) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </ChartCard>
            )}

          </div>
          <ChartCard title="Tracked contracts" sub="Entry points the indexer measures activity on">
            <div className="table-wrap">
              <table className="table" style={{ minWidth: 720 }}>
                <thead><tr><th>Contract</th><th>Role</th><th className="r">Deployed</th><th className="r">Lifetime tx</th></tr></thead>
                <tbody>
                  {p.contracts.map((c) => (
                    <tr key={c.id}>
                      <td className="mono" style={{ fontSize: 11 }}><a href={`https://explorer.hiro.so/txid/${c.id}?chain=mainnet`} target="_blank" rel="noreferrer">{shortId(c.id)}</a>{!c.found && <span className="tag tag-alert" style={{ marginLeft: 6 }}>not found</span>}</td>
                      <td style={{ fontSize: 11.5, minWidth: 180 }}>{c.role}</td>
                      <td className="r mono" style={{ fontSize: 11 }}>{c.deployedAt ? fmtDate(c.deployedAt) + ' ' + c.deployedAt.slice(0, 4) : '—'}</td>
                      <td className="r mono" style={{ fontSize: 11 }}>{fmtInt(c.txTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </section>

        {/* -------------------------------------------------------- risk events */}
        <section className="report-section">
          <div className="section-head">
            <span className="k k-ink">Risk events</span>
            <span className="sub">Threshold crossings detected for {p.name} in the last 30 days</span>
          </div>
          {events.length ? (
            <div className="acards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>{events.map((e) => (<AlertCard key={e.id} e={e} name={names[e.slug] ?? e.slug} showProtocol={false} />))}</div>
          ) : (
            <div className="empty">No risk events for this protocol in the last 30 days.</div>
          )}
        </section>
      </div>
    </div>
  );
}
