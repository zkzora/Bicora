import Link from 'next/link';
import Image from 'next/image';
import { getSnapshot } from '@/lib/data';
import { fmtUsd } from '@/lib/format';
import { BandTag } from '@/components/ui';
import ProtocolLogo from '@/components/ProtocolLogo';
import OrbitingCirclesGlobe from '@/components/ui/orbiting-circles-02';
import TextBlockAnimation from '@/components/ui/text-block-animation';

export default async function HomePage() {
  const { snapshot } = await getSnapshot();
  const m = snapshot.market;

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section className="hero">
        <div className="hero-dots" />
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <h1>BTCFi Risk Intelligence Layer</h1>
            <p style={{ fontSize: 14, lineHeight: 1.7, maxWidth: '52ch', color: 'var(--color-neutral-700)' }}>
              Transparent risk analytics infrastructure for Bitcoin DeFi applications built on Stacks.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
              <Link href="/dashboard" className="btn btn-primary btn-lg">Open Dashboard</Link>
              <Link href="/methodology" className="btn btn-secondary btn-lg">Read Methodology</Link>
            </div>
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginTop: 18, fontSize: 12, color: 'var(--color-neutral-600)' }}>
              <span><b style={{ color: 'var(--color-text)' }}>{m.protocolsTracked}</b> protocols tracked</span>
              <span><b style={{ color: 'var(--color-text)' }}>4</b> risk dimensions</span>
              <span>Analytics, not financial advice</span>
            </div>
          </div>
          <div className="hero-art">
            <div className="float-shadow" />
            <div className="hero-thrust float" aria-hidden>
              <span className="flame flame-c" />
              <span className="glow" />
            </div>
            <Image className="float" src="/engine.png" alt="BTCFi risk engine: Stacks data flowing into a central risk engine and out to dashboards" width={1100} height={760} priority />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- problem / solution */}
      <section className="wrap two-col section">
        <div className="col-pad">
          <TextBlockAnimation>
            <span className="k">Problem</span>
            <h2 className="h2">Bitcoin DeFi growth creates demand for better transparency.</h2>
          </TextBlockAnimation>
          <p style={{ color: 'var(--color-neutral-700)', maxWidth: '46ch' }}>
            Users need information about liquidity conditions, protocol exposure, collateral health and market activity. Current tools provide market data but lack standardized risk intelligence.
          </p>
          <div className="grid-cells" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 8 }}>
            {['Liquidity conditions', 'Protocol exposure', 'Collateral health', 'Market activity'].map((t) => (
              <div key={t} className="cell" style={{ padding: 14, fontSize: 14 }}>{t}</div>
            ))}
          </div>
        </div>
        <div className="col-pad">
          <TextBlockAnimation delay={0.15}>
            <span className="k">Solution</span>
            <h2 className="h2">One intelligence layer for blockchain data, analytics models and risk indicators.</h2>
          </TextBlockAnimation>
          <p style={{ color: 'var(--color-neutral-700)' }}>Core outputs, published for every tracked protocol.</p>
          <div className="list-rows" style={{ marginTop: 8 }}>
            <div>Protocol Risk Score<span className="mono" style={{ color: 'var(--color-accent-700)' }}>0–100</span></div>
            <div>Liquidity Score<span className="mono">depth · trend · stability</span></div>
            <div>Activity Score<span className="mono">transactions · senders</span></div>
            <div>Collateral Health<span className="mono">utilisation · trend</span></div>
            <div>Transparency Score<span className="mono">audits · source · governance</span></div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ how it works */}
      <section className="wrap section" style={{ padding: '56px clamp(20px,4vw,48px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
          <TextBlockAnimation>
            <span className="k">How it works</span>
            <h2 className="h2" style={{ marginTop: 8 }}>From chain to score in four steps.</h2>
          </TextBlockAnimation>
          <span className="mono" style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>Stacks data → Indexer → Database → Risk engine → Dashboard / API</span>
        </div>
        <div className="steps">
          {[
            ['01', 'Collect', 'Scheduled indexer jobs read protocol TVL, borrowed value, contract state and transaction activity from Stacks data sources.'],
            ['02', 'Process', 'Raw observations are normalised, checked for adapter outliers and stored with full history.'],
            ['03', 'Calculate', 'Four component scores are computed from documented factors and combined with public weights.'],
            ['04', 'Display', 'Scores, factors and detected risk events are published through the dashboard and the v1 API.'],
          ].map(([n, t, d]) => (
            <div key={n}>
              <div className="mono" style={{ fontSize: 12, color: 'var(--color-accent-700)' }}>{n}</div>
              <h3>{t}</h3>
              <p style={{ fontSize: 14, color: 'var(--color-neutral-700)' }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------- key metrics / protocols */}
      <section className="wrap two-col section">
        <div className="col-pad">
          <TextBlockAnimation><span className="k">Key metrics · live</span></TextBlockAnimation>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px 24px', marginTop: 6 }}>
            {[
              [m.protocolsTracked, 'Protocols tracked'],
              [fmtUsd(m.totalTvlUsd, 0), 'Liquidity tracked'],
              [4, 'Risk dimensions'],
              [m.avgScore, 'Avg. ecosystem score'],
            ].map(([v, label], i) => (
              <TextBlockAnimation key={label} delay={0.1 + i * 0.12} duration={0.5}>
                <div className="big-num">{v}</div>
                <div className="big-label">{label}</div>
              </TextBlockAnimation>
            ))}
          </div>
        </div>
        <div className="col-pad">
          <TextBlockAnimation delay={0.1}><span className="k">Supported protocols</span></TextBlockAnimation>
          <table className="table" style={{ marginTop: 2 }}>
            <thead><tr><th>Protocol</th><th>Category</th><th className="r">Risk score</th></tr></thead>
            <tbody>
              {snapshot.protocols.map((p) => (
                <tr key={p.slug} className="row">
                  <td style={{ fontWeight: 600 }}><Link href={`/dashboard/protocols/${p.slug}`} style={{ color: 'var(--color-text)', display: 'inline-flex', alignItems: 'center', gap: 8 }}><ProtocolLogo slug={p.slug} name={p.name} size={20} radius={4} />{p.name}</Link></td>
                  <td className="caps muted">{p.category}</td>
                  <td className="r"><BandTag band={p.score.band} score={p.score.overall} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ------------------------------------------------- developer / roadmap */}
      <section className="wrap two-col section">
        <div className="col-pad">
          <TextBlockAnimation>
            <span className="k">Developer infrastructure</span>
            <h2 className="h2" style={{ fontSize: 28 }}>Risk metrics as an API.</h2>
          </TextBlockAnimation>
          <div className="endpoint-list">
            {[
              ['/v1/protocol-risk', 'Scores, components and every factor per protocol', 'protocol-risk'],
              ['/v1/market-health', 'Ecosystem liquidity, activity and score distribution', 'market-health'],
              ['/v1/risk-alerts', 'Detected risk events with severity and delta', 'risk-alerts'],
              ['/v1/methodology', 'Weights, bands and version for consistent labelling', 'methodology'],
            ].map(([p, d, id]) => (
              <Link key={p} href={`/docs#${id}`}>
                <span className="tag tag-accent mono">GET</span>
                <span><span className="path mono">{p}</span><span className="desc">{d}</span></span>
                <span className="arrow" aria-hidden>→</span>
              </Link>
            ))}
          </div>
          <Link href="/docs" className="btn btn-ghost" style={{ alignSelf: 'flex-start' }}>Read the documentation →</Link>
        </div>
        <div className="col-pad">
          <TextBlockAnimation delay={0.15}><span className="k">Roadmap</span></TextBlockAnimation>
          <div className="list-rows" style={{ fontWeight: 400, fontSize: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 16 }}><span className="tag tag-accent" style={{ alignSelf: 'start' }}>Phase 1</span><span>Protocol risk pages · Methodology · Alerts</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 16 }}><span className="tag tag-neutral" style={{ alignSelf: 'start' }}>Phase 2</span><span style={{ color: 'var(--color-neutral-700)' }}>Wallet analytics · Automated monitoring · Public API keys</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 16 }}><span className="tag tag-neutral" style={{ alignSelf: 'start' }}>Phase 3</span><span style={{ color: 'var(--color-neutral-700)' }}>External integrations · Advanced analytics</span></div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- cta */}
      <section className="orb-section">
        <div className="orb-dots" />
        <div className="orb-copy">
          <span className="k">One risk layer · every tracked protocol</span>
          <h2>See the risk before you take it.</h2>
          <p>Tracked protocols orbit one engine: indexed on-chain data, activity signals and security checks, scored with a public methodology.</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/dashboard" className="btn btn-primary btn-lg">Open Dashboard</Link>
            <Link href="/methodology" className="btn btn-secondary btn-lg">Read Methodology</Link>
          </div>
        </div>
        <OrbitingCirclesGlobe />
      </section>
    </>
  );
}
