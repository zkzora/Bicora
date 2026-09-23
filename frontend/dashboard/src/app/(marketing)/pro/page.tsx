import type { Metadata } from 'next';
import Link from 'next/link';
import { getSnapshot } from '@/lib/data';
import { componentColor, fmtPct } from '@/lib/format';
import { dash } from '@/lib/urls';
import { BandTag, PctDelta, ScoreDelta } from '@/components/ui';
import PricingCard from '@/components/PricingCard';
import ProtocolLogo from '@/components/ProtocolLogo';
import TimeAgo from '@/components/TimeAgo';
import type { SnapshotProtocol } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Bicora Pro',
  description: 'Advanced Bitcoin DeFi risk analytics for professional users: deeper protocol analysis, historical insights and monitoring tools.',
};

// Checkout / access URL. Set NEXT_PUBLIC_PRO_URL to the billing page when it exists.
const PRO_URL = process.env.NEXT_PUBLIC_PRO_URL ?? 'mailto:hello@bicora.xyz?subject=Bicora%20Pro%20access';

const score = (p: SnapshotProtocol, key: string) => p.score.components.find((c) => c.key === key)?.score ?? null;
const level = (s: number | null) => (s == null ? '—' : s >= 70 ? 'High' : s >= 45 ? 'Medium' : 'Low');
const strength = (s: number | null) => (s == null ? 'n/a' : s >= 75 ? 'Strong' : s >= 55 ? 'Moderate' : 'Weak');
const trend = (p: SnapshotProtocol) => {
  const t = p.score.components.find((c) => c.key === 'activity')?.factors.find((f) => f.key === 'trend7d')?.raw ?? null;
  return t == null ? 'Stable' : t > 0.15 ? 'Growing' : t < -0.15 ? 'Declining' : 'Stable';
};

const FREE_VS_PRO: [string, string, string][] = [
  ['Risk score', 'Basic', 'Advanced'],
  ['Protocol coverage', 'Limited', 'Full'],
  ['Historical data', 'No', 'Yes'],
  ['Risk breakdown', 'Basic', 'Detailed'],
  ['Comparison', 'No', 'Yes'],
  ['Export', 'No', 'Yes'],
  ['Alerts', 'Limited', 'Advanced'],
];

export default async function ProPage() {
  const { snapshot } = await getSnapshot();
  const protocols = snapshot.protocols;
  const names = Object.fromEntries(protocols.map((p) => [p.slug, p.name]));
  const latest = snapshot.events[0];
  const impact = latest?.impact ?? (latest?.severity === 'alert' ? 'High' : latest?.severity === 'watch' ? 'Medium' : 'Low');

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section className="pro-hero">
        <div className="wrap pro-hero-inner">
          <span className="k">Bicora Pro</span>
          <h1>Bicora Pro</h1>
          <p className="pro-sub">Advanced Bitcoin DeFi Risk Analytics for Professional Users</p>
          <p className="pro-desc">Go beyond basic risk scores with deeper protocol analysis, historical insights, and advanced monitoring tools.</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
            <a href="#pricing" className="btn btn-primary btn-lg">Start Bicora Pro</a>
            <a href="#features" className="btn btn-secondary btn-lg">Explore Features</a>
          </div>
          <div className="pro-proof">
            <span><b className="tnum">{protocols.length}</b> protocols scored</span>
            <span><b className="tnum">4</b> risk components · <b className="tnum">16</b> factors</span>
            <span>Refreshed every 6 hours</span>
            <span>Methodology v{snapshot.methodologyVersion}, public</span>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- pricing */}
      <section className="wrap section" style={{ padding: '56px clamp(20px,4vw,48px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 40, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 8 }}>
          <span className="k">One plan</span>
          <h2 className="h2">Everything a research desk needs, at one price.</h2>
          <p style={{ color: 'var(--color-text-2)', fontSize: 14, lineHeight: 1.7, maxWidth: '48ch' }}>
            Bicora Pro sits on top of the same indexed Stacks data and the same public methodology as the free dashboard. What changes is depth: full history, factor-level breakdowns, side-by-side comparison, exports and advanced alerts.
          </p>
          <div className="list-rows" style={{ fontSize: 13 }}>
            <div>Data sources<span className="mono">DefiLlama · Hiro Stacks API</span></div>
            <div>Update frequency<span className="mono">every 6 hours</span></div>
            <div>Scale<span className="mono">0–100 · higher is safer</span></div>
            <div>Methodology<span className="mono"><Link href="/methodology">v{snapshot.methodologyVersion} · public</Link></span></div>
          </div>
        </div>
        <PricingCard ctaHref={PRO_URL} />
      </section>

      {/* -------------------------------------------------------- features */}
      <section className="wrap section" id="features" style={{ padding: '64px clamp(20px,4vw,48px)', scrollMarginTop: 70 }}>
        <div style={{ marginBottom: 28 }}>
          <span className="k">Why Bicora Pro?</span>
          <h2 className="h2" style={{ marginTop: 8 }}>Built for analysis, not for a glance.</h2>
        </div>
        <div className="pro-features">
          <div className="card pro-feature">
            <div className="card-title">Deep risk analysis</div>
            <h3>Understand why protocols receive their risk scores.</h3>
            <p>Every component opens into its factors: the observed value, the mapping to 0–100, the weight and a plain-language reason.</p>
            <div className="pro-chips">
              {(['liquidity', 'activity', 'collateral', 'transparency'] as const).map((k) => (
                <span key={k} className="tag tag-outline"><i style={{ width: 7, height: 7, background: componentColor[k], borderRadius: 2, display: 'inline-block' }} />{k[0].toUpperCase() + k.slice(1)}</span>
              ))}
            </div>
          </div>
          <div className="card pro-feature">
            <div className="card-title">Historical intelligence</div>
            <h3>Track how protocol risk changes over time.</h3>
            <p>Score, component and TVL series on one axis, with the events that moved them marked on the timeline.</p>
            <div className="pro-chips">
              {['30D', '90D', '180D', '1Y'].map((w) => (<span key={w} className="tag tag-neutral mono">{w}</span>))}
            </div>
          </div>
          <div className="card pro-feature">
            <div className="card-title">Professional research tools</div>
            <h3>Compare protocols and build better research workflows.</h3>
            <p>Side-by-side comparison, exportable factor tables and report-ready charts for notes, memos and due-diligence files.</p>
            <div className="pro-chips">
              <span className="tag tag-neutral">Compare</span><span className="tag tag-neutral">Export CSV / PDF</span><span className="tag tag-neutral">Saved views</span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ comparison */}
      <section className="wrap section" style={{ padding: '64px clamp(20px,4vw,48px)' }}>
        <div className="section-head" style={{ marginBottom: 20 }}>
          <div>
            <span className="k">Compare Bitcoin DeFi protocols</span>
            <h2 className="h2" style={{ marginTop: 8 }}>One table, every tracked protocol.</h2>
          </div>
          <span className="sub">Live data from the latest scoring run · {new Date(snapshot.generatedAt).toUTCString().replace(' GMT', ' UTC')}</span>
        </div>
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table className="table" style={{ minWidth: 720 }}>
              <thead>
                <tr><th>Protocol</th><th>Risk score</th><th>Liquidity</th><th>Activity</th><th>Collateral</th><th className="r">Change · 7d TVL</th></tr>
              </thead>
              <tbody>
                {protocols.map((p) => (
                  <tr key={p.slug} className="row">
                    <td style={{ fontWeight: 600 }}><Link href={dash(`/protocols/${p.slug}`)} style={{ color: 'var(--color-text)', display: 'inline-flex', alignItems: 'center', gap: 8 }}><ProtocolLogo slug={p.slug} name={p.name} size={20} radius={4} />{p.name}</Link></td>
                    <td><BandTag band={p.score.band} score={p.score.overall} /></td>
                    <td>{level(score(p, 'liquidity'))} <span className="muted mono">{Math.round(score(p, 'liquidity') ?? 0)}</span></td>
                    <td>{trend(p)} <span className="muted mono">{Math.round(score(p, 'activity') ?? 0)}</span></td>
                    <td>{p.hasCollateral && score(p, 'collateral') != null ? <>{strength(score(p, 'collateral'))} <span className="muted mono">{Math.round(score(p, 'collateral') ?? 0)}</span></> : <span className="muted">n/a</span>}</td>
                    <td className="r"><PctDelta r={p.metrics.tvlChange7d} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>Levels are derived from component scores (High ≥ 70, Medium ≥ 45); activity trend from the week-over-week transaction change. Pro adds custom columns, factor-level comparison and export.</p>
      </section>

      {/* ------------------------------------------------------ monitoring */}
      <section className="wrap section" style={{ padding: '64px clamp(20px,4vw,48px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 40, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="k">Bicora Risk Alerts</span>
          <h2 className="h2">Know when conditions change.</h2>
          <p style={{ color: 'var(--color-text-2)', fontSize: 14, lineHeight: 1.7, maxWidth: '48ch' }}>
            The scoring engine flags threshold crossings on every run: TVL moves, utilisation levels, activity swings and score changes, each with a category and an impact level. Pro adds delivery to e-mail and webhooks, custom thresholds and per-protocol watchlists.
          </p>
          <div className="list-rows" style={{ fontSize: 13 }}>
            <div>Liquidity<span className="mono">TVL ±10% / 24h · ±15% / 7d</span></div>
            <div>Collateral<span className="mono">utilisation 80% · 90%</span></div>
            <div>Activity<span className="mono">±40% week over week</span></div>
            <div>Score<span className="mono">≥ 3 points between runs</span></div>
          </div>
        </div>
        {latest ? (
          <div className="card pro-alert">
            <div className="card-head"><span className="k k-muted no-sq" style={{ fontSize: 10 }}>Risk change detected</span><span className={`tag ${impact === 'High' ? 'tag-alert' : impact === 'Medium' ? 'tag-watch' : 'tag-info'}`}>{impact} impact</span></div>
            <dl className="pro-alert-grid">
              <div><dt>Protocol</dt><dd style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ProtocolLogo slug={latest.slug} name={names[latest.slug] ?? latest.slug} size={20} radius={4} />{names[latest.slug] ?? latest.slug}</dd></div>
              <div><dt>Event</dt><dd>{latest.message.replace(`${names[latest.slug] ?? ''} `, '').replace(/^\w/, (c) => c.toUpperCase())}</dd></div>
              <div><dt>Impact</dt><dd className={`c-${impact === 'High' ? 'High' : impact === 'Medium' ? 'Moderate' : 'Low'}`}>{impact}</dd></div>
              <div><dt>Detected</dt><dd><TimeAgo iso={latest.ts} /></dd></div>
            </dl>
            <div className="muted" style={{ fontSize: 11.5 }}>Category: {latest.kind} · Reason: {latest.reason ?? 'threshold crossed'} · <Link href={dash('/alerts')}>all events →</Link></div>
          </div>
        ) : null}
      </section>

      {/* ----------------------------------------------------- free vs pro */}
      <section className="wrap section" style={{ padding: '64px clamp(20px,4vw,48px)' }}>
        <div style={{ marginBottom: 20 }}>
          <span className="k">Free vs Pro</span>
          <h2 className="h2" style={{ marginTop: 8 }}>What changes when you upgrade.</h2>
        </div>
        <div className="card" style={{ padding: 0, maxWidth: 760 }}>
          <table className="table pro-compare">
            <thead><tr><th>Feature</th><th>Free</th><th>Pro</th></tr></thead>
            <tbody>
              {FREE_VS_PRO.map(([f, free, pro]) => (
                <tr key={f}>
                  <td style={{ fontWeight: 600 }}>{f}</td>
                  <td className={free === 'No' ? 'muted' : ''}>{free === 'No' ? '—' : free}</td>
                  <td className="pro-cell"><span className="check" aria-hidden>✓</span>{pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* -------------------------------------------------------- final cta */}
      <section className="wrap" style={{ padding: '56px clamp(20px,4vw,48px) 72px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <h2 className="h2">Evaluate Bitcoin DeFi risk faster and deeper.</h2>
          <p style={{ color: 'var(--color-text-2)', marginTop: 8 }}>$49/month or $490/year · cancel anytime · analytics, not financial advice.</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href={PRO_URL} className="btn btn-primary btn-lg">Start Bicora Pro</a>
          <Link href={dash('/')} className="btn btn-secondary btn-lg">Open free dashboard</Link>
        </div>
      </section>
    </>
  );
}
