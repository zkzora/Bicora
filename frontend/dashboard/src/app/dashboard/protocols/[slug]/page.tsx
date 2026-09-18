import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProtocol, getSnapshot } from '@/lib/data';
import { componentColor, fmtDate, fmtInt, fmtPct, fmtScore, fmtUsd, shortId } from '@/lib/format';
import { BandTag, EventList, PctDelta, ScoreDelta } from '@/components/ui';
import Sparkline from '@/components/charts/Sparkline';
import ProtocolHistory from '@/components/ProtocolHistory';
import ProtocolLogo from '@/components/ProtocolLogo';

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
  const tvlSpark = p.tvlHistory.slice(-30).map((x) => x.tvlUsd);
  const liqSpark = p.liquidityScoreHistory.slice(-30).map((x) => x.score);
  const tokens = Object.entries(m.tokens).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const tokenTotal = tokens.reduce((s, [, v]) => s + v, 0) || 1;

  return (
    <div className="proto-layout">
      <aside className="proto-side">
        <div className="k k-muted" style={{ padding: '6px 12px 10px' }}>Tracked protocols</div>
        {snapshot.protocols.map((x) => (
          <Link key={x.slug} href={`/dashboard/protocols/${x.slug}`} aria-current={x.slug === p.slug ? 'page' : undefined}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><ProtocolLogo slug={x.slug} name={x.name} size={18} radius={4} />{x.name}</span><span className="mono muted">{x.score.overall}</span>
          </Link>
        ))}
      </aside>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
        {/* header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 24, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <ProtocolLogo slug={p.slug} name={p.name} size={44} />
              <h2 style={{ fontSize: 30, letterSpacing: '-0.02em' }}>{p.name}</h2>
              <span className="tag tag-neutral">{p.category}</span>
            </div>
            <p style={{ color: 'var(--color-neutral-700)', maxWidth: '58ch' }}>{p.description}</p>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', fontSize: 13, color: 'var(--color-neutral-700)' }}>
              <div><div className="k k-muted">Assets</div><div>{p.assets.join(' · ')}</div></div>
              <div><div className="k k-muted">Links</div><div style={{ display: 'flex', gap: 10 }}><a href={p.website} target="_blank" rel="noreferrer">Website ↗</a>{p.docs && <a href={p.docs} target="_blank" rel="noreferrer">Docs ↗</a>}{p.github && <a href={p.github} target="_blank" rel="noreferrer">GitHub ↗</a>}</div></div>
            </div>
          </div>
          <div className="card" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="k">Overall risk score</div>
              <div className="score-hero">{p.score.overall}</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--color-neutral-600)', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              <BandTag band={p.score.band} />
              <span><ScoreDelta d={p.delta7d} /> vs 7d ago</span>
              <span>Methodology v{p.score.methodologyVersion}</span>
            </div>
          </div>
        </div>

        {(p.dataQuality.note || p.dataQuality.warnings.length > 0 || p.dataQuality.activitySampled) && (
          <div className="note-box">
            <b>Data quality.</b>{' '}
            {p.dataQuality.note && <>{p.dataQuality.note} </>}
            {p.dataQuality.activitySampled && <>Activity counts are extrapolated from a sampled window (pagination cap). </>}
            {p.dataQuality.warnings.map((w) => (<span key={w}>{w}. </span>))}
          </div>
        )}

        {/* component tiles */}
        <div className="grid-cells" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
          {p.score.components.map((c) => (
            <div key={c.key} className="cell" style={{ padding: 16 }}>
              <div className="k k-muted no-sq"><i style={{ width: 8, height: 8, background: componentColor[c.key], display: 'inline-block', borderRadius: 2, flex: 'none' }} />{c.label}</div>
              <div className="stat-value" style={{ fontSize: 30 }}>{c.score == null ? '—' : Math.round(c.score)}</div>
              <div className="bar-track" style={{ marginTop: 8 }}><div className="bar-fill" style={{ width: `${c.score ?? 0}%`, background: componentColor[c.key] }} /></div>
              <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
                Weight {Math.round(c.weight * 100)}%{p.score.effectiveWeights[c.key] !== Math.round(c.weight * 100) ? ` → ${p.score.effectiveWeights[c.key]}% effective` : ''}
              </div>
            </div>
          ))}
        </div>

        {/* key metrics */}
        <div className="grid-cells" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
          <div className="cell" style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div><div className="k k-muted" style={{ fontSize: 10 }}>TVL</div><div className="heading" style={{ fontSize: 22 }}>{fmtUsd(m.tvlUsd)}</div><div style={{ fontSize: 11 }}><PctDelta r={m.tvlChange7d} suffix="7d" /></div></div>
            <Sparkline values={tvlSpark} color={componentColor.liquidity} />
          </div>
          <div className="cell" style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div><div className="k k-muted" style={{ fontSize: 10 }}>Liquidity score · 30d</div><div className="heading" style={{ fontSize: 22 }}>{fmtScore(p.score.components[0].score)}</div><div className="muted" style={{ fontSize: 11 }}>{fmtPct(m.tvlChange30d)} TVL 30d</div></div>
            <Sparkline values={liqSpark} color={componentColor.liquidity} />
          </div>
          <div className="cell" style={{ padding: '12px 14px' }}>
            <div className="k k-muted" style={{ fontSize: 10 }}>Activity · 7d</div>
            <div className="heading" style={{ fontSize: 22 }}>{fmtInt(m.tx7d)}{m.activitySampled ? '*' : ''}</div>
            <div className="muted" style={{ fontSize: 11 }}>{fmtInt(m.uniqueSenders7d)} unique senders</div>
          </div>
          <div className="cell" style={{ padding: '12px 14px' }}>
            <div className="k k-muted" style={{ fontSize: 10 }}>{p.hasCollateral ? 'Utilisation' : 'Collateral'}</div>
            <div className="heading" style={{ fontSize: 22 }}>{m.utilization == null ? '—' : `${(m.utilization * 100).toFixed(1)}%`}</div>
            <div className="muted" style={{ fontSize: 11 }}>{m.borrowedUsd != null ? `${fmtUsd(m.borrowedUsd)} borrowed` : p.hasCollateral ? 'no borrowed data' : 'not applicable'}</div>
          </div>
        </div>

        <ProtocolHistory p={p} />

        {/* factor breakdown */}
        <div className="card">
          <div className="card-head">
            <span className="k k-ink">Score breakdown</span>
            <Link href="/methodology" style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase' }}>Methodology →</Link>
          </div>
          {p.score.components.map((c) => (
            <div key={c.key} style={{ marginTop: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '8px 0 4px', borderBottom: '2px solid var(--color-divider)' }}>
                <span style={{ fontWeight: 600, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8 }}><i style={{ width: 10, height: 10, background: componentColor[c.key], display: 'inline-block', borderRadius: 2 }} />{c.label}</span>
                <span className="mono" style={{ fontSize: 12 }}>{c.score == null ? 'not applicable' : `${c.score.toFixed(1)} · weight ${p.score.effectiveWeights[c.key]}%`}</span>
              </div>
              {c.note && <div className="muted" style={{ fontSize: 11.5, padding: '8px 0 2px' }}>{c.note}</div>}
              <div className="factor-row" style={{ borderTop: 0, padding: '6px 0 2px', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-neutral-600)' }}>
                <span>Factor</span><span>Observed</span><span className="r w" style={{ textAlign: 'right' }}>Weight</span><span style={{ textAlign: 'right' }}>Score</span>
              </div>
              {c.factors.map((f) => (
                <div key={f.key} className="factor-row">
                  <span>{f.label}</span>
                  <span className="mono" style={{ fontSize: 11.5 }}>{f.value}</span>
                  <span className="mono w" style={{ textAlign: 'right' }}>{Math.round(f.weight * 100)}%</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                    <span className="bar-track" style={{ width: 44 }}><span className="bar-fill" style={{ display: 'block', width: `${f.score ?? 0}%`, background: componentColor[c.key] }} /></span>
                    <span className="mono" style={{ width: 28, textAlign: 'right' }}>{f.score == null ? '—' : Math.round(f.score)}</span>
                  </span>
                  {f.note && <span className="note">{f.note}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="card">
          <span className="k k-ink">Tracked contracts</span>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Contract</th><th>Role</th><th className="r">Deployed</th><th className="r">Lifetime tx</th></tr></thead>
              <tbody>
                {p.contracts.map((c) => (
                  <tr key={c.id}>
                    <td className="mono" style={{ fontSize: 11 }}><a href={`https://explorer.hiro.so/txid/${c.id}?chain=mainnet`} target="_blank" rel="noreferrer">{shortId(c.id)}</a>{!c.found && <span className="tag tag-alert" style={{ marginLeft: 6 }}>not found</span>}</td>
                    <td style={{ fontSize: 11.5, minWidth: 200 }}>{c.role}</td>
                    <td className="r mono" style={{ fontSize: 11 }}>{c.deployedAt ? fmtDate(c.deployedAt) + ' ' + c.deployedAt.slice(0, 4) : '—'}</td>
                    <td className="r mono" style={{ fontSize: 11 }}>{fmtInt(c.txTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="two-up">
            {tokens.length > 0 && (
              <div className="card">
                <span className="k k-ink">Liquidity by asset</span>
                <div style={{ display: 'flex', height: 14, borderRadius: 4, overflow: 'hidden', gap: 2 }}>
                  {tokens.map(([t, v], i) => (<div key={t} style={{ width: `${(v / tokenTotal) * 100}%`, background: ['var(--ink)', 'var(--color-accent)', 'var(--color-accent-300)', 'var(--color-neutral-400)', 'var(--color-neutral-300)', 'var(--color-neutral-200)'][i] }} title={t} />))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', fontSize: 12 }}>
                  {tokens.map(([t, v], i) => (
                    <div key={t} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--color-rule)' }}>
                      <span><i style={{ display: 'inline-block', width: 10, height: 10, marginRight: 8, borderRadius: 2, background: ['var(--ink)', 'var(--color-accent)', 'var(--color-accent-300)', 'var(--color-neutral-400)', 'var(--color-neutral-300)', 'var(--color-neutral-200)'][i] }} />{t}</span>
                      <span className="mono">{fmtUsd(v)} · {((v / tokenTotal) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="card">
              <span className="k k-ink">Risk events</span>
              <EventList events={snapshot.events.filter((e) => e.slug === p.slug)} names={names} showProtocol={false} />
            </div>
        </div>
      </div>
    </div>
  );
}
