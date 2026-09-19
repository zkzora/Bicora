import Link from 'next/link';
import type { Metadata } from 'next';
import { getSnapshot } from '@/lib/data';
import { bandMeaning } from '@/lib/format';
import { dash } from '@/lib/urls';
import { BandTag } from '@/components/ui';
import { MethodologyCard } from '@/components/cards';

export const metadata: Metadata = { title: 'Methodology' };

const COMPONENTS = [
  {
    pct: '30%', name: 'Liquidity Health', color: 'var(--series-1)',
    summary: 'How deep, how stable and how trending is the value locked?',
    bullets: ['Liquidity depth (TVL), log scale · 50%', '30-day TVL trend · 25%', '30-day stability: drawdown + volatility · 25%'],
    factors: [
      ['Liquidity depth (TVL)', '50%', 'log scale: $100K → 0 · $1M → 25 · $10M → 50 · $100M → 75 · $1B → 100'],
      ['30-day TVL trend', '25%', '−50% → 0 · −20% → 30 · flat → 65 · +20% → 90 · +50% → 100'],
      ['30-day stability', '25%', '60% max drawdown (2% → 100 … 80% → 0) + 40% daily volatility (1%/d → 100 … 25%/d → 0)'],
    ],
    source: 'DefiLlama Stacks-chain TVL history, cleaned for adapter outliers.',
  },
  {
    pct: '25%', name: 'Protocol Activity', color: 'var(--series-2)',
    summary: 'Is the protocol used, by how many addresses, and reliably?',
    bullets: ['Transactions, 7 days · 40%', 'Unique senders, 7 days · 35%', 'Week-over-week trend · 15%', 'Transaction success rate · 10%'],
    factors: [
      ['Transactions, 7 days', '40%', 'log scale: 10 → 0 · 100 → 33 · 1,000 → 67 · 10,000 → 100'],
      ['Unique senders, 7 days', '35%', 'log scale: 5 → 0 · 50 → 37 · 500 → 74 · 2,500 → 100'],
      ['Trend vs prior week', '15%', '−60% → 10 · flat → 60 · +30% → 85 · +100% → 100 (excluded when the prior week is not covered)'],
      ['Transaction success rate', '10%', '70% → 0 · 85% → 40 · 95% → 80 · 99% → 100'],
    ],
    source: 'Hiro Stacks API: direct calls to the registered entry-point contracts, 7-day window.',
  },
  {
    pct: '25%', name: 'Collateral Conditions', color: 'var(--series-3)',
    summary: 'How stretched are collateralised lending markets?',
    bullets: ['Utilisation (borrowed ÷ supplied) · 70%', 'Utilisation change, 7 days · 30%', 'Not applicable to DEXs / liquid stacking: weight redistributed'],
    factors: [
      ['Utilisation (borrowed ÷ supplied)', '70%', '≤50% → 100 · 80% → 60 · 95% → 20 · 100% → 0'],
      ['Utilisation change, 7 days', '30%', '−10 pts → 100 · flat → 80 · +10 pts → 40 · +20 pts → 10'],
    ],
    source: 'DefiLlama borrowed value for lending / CDP protocols.',
  },
  {
    pct: '20%', name: 'Transparency', color: 'var(--series-4)',
    summary: 'Can the public verify the code, audits, documentation and control?',
    bullets: ['Contract source verifiable on-chain · 20%', 'Public audits · 25%', 'Repository · 15% · Documentation · 10%', 'Contract age · 15% · Governance · 10% · Bug bounty · 5%'],
    factors: [
      ['Contract source verifiable on-chain', '20%', 'share of registered contracts found on Stacks with readable Clarity source'],
      ['Public audits listed', '25%', '0 → 0 · 1 → 60 · 2+ → 100'],
      ['Public source repository', '15%', 'yes → 100'],
      ['Public documentation', '10%', 'yes → 100'],
      ['Oldest tracked contract age', '15%', '0 mo → 0 · 6 mo → 35 · 12 mo → 65 · 24+ mo → 100'],
      ['Governance / upgrade control', '10%', 'DAO or governance contract → 100 · multisig → 60 · unknown → 0'],
      ['Bug bounty programme', '5%', 'yes → 100'],
    ],
    source: 'Protocol registry (config/protocols.json, each entry cites a public source) and Hiro contract metadata.',
  },
];

export default async function MethodologyPage() {
  const { snapshot } = await getSnapshot();
  return (
    <>
      <section className="wrap section" style={{ padding: '72px clamp(20px,4vw,48px) 48px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '24px 48px', alignItems: 'end' }}>
        <div>
          <span className="k">Risk Score Framework · v{snapshot.methodologyVersion}</span>
          <h1 style={{ fontSize: 'clamp(38px,4.4vw,56px)', lineHeight: 1, letterSpacing: '-0.03em', marginTop: 14 }}>How scores are calculated.</h1>
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-2)', maxWidth: '52ch' }}>
          Every protocol score is a weighted composite of four public indicators on a 0–100 scale where higher means lower risk. Weights, inputs and thresholds are published here, versioned with the API, and every observed factor value is visible on the protocol page.
        </p>
      </section>

      <section className="wrap section weights">
        {COMPONENTS.map((c) => (<MethodologyCard key={c.name} pct={c.pct} name={c.name} color={c.color} summary={c.summary} bullets={c.bullets} />))}
      </section>

      <section className="wrap section" style={{ padding: '56px clamp(20px,4vw,48px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 32 }}>
        <div className="card">
          <div className="card-title">Calculation logic</div>
          <div className="composite" style={{ margin: '4px 0 6px' }}>
            <div style={{ width: '30%', background: 'var(--series-1)', color: '#1a1208' }}>Liquidity 30</div>
            <div style={{ width: '25%', background: 'var(--series-2)', color: '#fff' }}>Activity 25</div>
            <div style={{ width: '25%', background: 'var(--series-3)', color: '#0b2a1c' }}>Collateral 25</div>
            <div style={{ width: '20%', background: 'var(--series-4)', color: '#fff' }}>Transp. 20</div>
          </div>
          <p className="mono" style={{ fontSize: 13, color: 'var(--color-text)' }}>score = 0.30·L + 0.25·A + 0.25·C + 0.20·T</p>
          <p style={{ fontSize: 12.5, color: 'var(--color-text-2)', lineHeight: 1.7 }}>
            Each factor maps an observed value to 0–100 with a published piecewise-linear function; factors combine into a component by weight, components into the overall score. When a component does not apply (no collateralised borrowing) or its inputs are unavailable, its weight is redistributed proportionally and the effective weights are published with every score. The overall score is rounded to an integer before banding.
          </p>
        </div>
        <div className="card">
          <div className="card-title">Risk bands</div>
          <table className="table">
            <thead><tr><th>Band</th><th>Score</th><th>Meaning</th></tr></thead>
            <tbody>
              {([['Low', '75–100'], ['Moderate', '60–74'], ['Elevated', '40–59'], ['High', '0–39']] as const).map(([b, r]) => (
                <tr key={b}><td><BandTag band={b} /></td><td className="mono">{r}</td><td style={{ color: 'var(--color-text-2)' }}>{bandMeaning[b]}</td></tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 12.5, color: 'var(--color-text-2)' }}>The Bicora Risk Index on the dashboard is the mean of tracked protocol scores, banded with the same thresholds.</p>
        </div>
        <div className="card">
          <div className="card-title">Data sources & update frequency</div>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 12.5 }}>
            {[
              ['DefiLlama', 'TVL, borrowed value and token breakdown per protocol (Stacks chain)'],
              ['Hiro Stacks API', 'Contract metadata, deployment time and direct-call transaction activity'],
              ['Protocol registry', 'Contract IDs, audits, docs, governance — every entry cites a public source'],
            ].map(([s, d]) => (
              <div key={s} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10, padding: '8px 0', borderTop: '1px solid var(--color-rule)' }}>
                <b style={{ color: 'var(--color-text)' }}>{s}</b><span style={{ color: 'var(--color-text-2)' }}>{d}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--color-text-2)', lineHeight: 1.7 }}>
            The indexer and scoring engine run <b style={{ color: 'var(--color-text)' }}>every 6 hours</b>; scores and events accumulate one point per protocol per day. Last run: {new Date(snapshot.generatedAt).toUTCString().replace(' GMT', ' UTC')}.
          </p>
        </div>
      </section>

      <section className="wrap section" style={{ padding: '56px clamp(20px,4vw,48px)', display: 'flex', flexDirection: 'column', gap: 40 }}>
        <div>
          <span className="k" id="factors" style={{ scrollMarginTop: 80 }}>Factor definitions</span>
          <h2 className="h2" style={{ marginTop: 8 }}>Every input, its weight and its mapping.</h2>
        </div>
        {COMPONENTS.map((c) => (
          <div key={c.name} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '16px 48px', alignItems: 'start' }}>
            <div>
              <h3 style={{ fontSize: 17, textTransform: 'none' }}><span style={{ display: 'inline-block', width: 10, height: 10, background: c.color, borderRadius: 2, marginRight: 8 }} />{c.name} · {c.pct}</h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 8, lineHeight: 1.7 }}><b style={{ color: 'var(--color-text)' }}>Source.</b> {c.source}</p>
            </div>
            <div className="card" style={{ gridColumn: 'span 2', padding: 0 }}>
              <table className="table">
                <thead><tr><th>Factor</th><th className="r">Weight</th><th>Mapping to 0–100</th></tr></thead>
                <tbody>{c.factors.map(([f, w, mth]) => (<tr key={f}><td style={{ fontWeight: 600 }}>{f}</td><td className="r mono">{w}</td><td className="mono" style={{ fontSize: 11.5, color: 'var(--color-text-2)' }}>{mth}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        ))}
        <div className="prose" style={{ maxWidth: '72ch' }}>
          <h3 id="data-quality" style={{ scrollMarginTop: 80 }}>Data quality rules</h3>
          <ul>
            <li>TVL points below 5% of the 90-day median are excluded as adapter outliers when the series has since recovered. Exclusions are shown on the protocol page.</li>
            <li>Activity is measured on direct calls to the registered entry-point contracts. When the pagination cap is hit before covering 7 days, counts are extrapolated and marked as estimated.</li>
            <li>Ecosystem totals are summed on a common daily calendar with forward-filled protocol series.</li>
          </ul>
          <h3 id="limitations" style={{ scrollMarginTop: 80 }}>Known limitations of v0.1</h3>
          <ul>
            <li>Internal contract-to-contract calls are not counted, so activity for protocols routed through aggregators or newer entry points can be understated. The registry is versioned and reviewed.</li>
            <li>Collateral conditions depend on the DefiLlama adapter exposing borrowed value; Granite currently reports none, so its collateral component is not applicable.</li>
            <li>Transparency factors are rubric-based on public sources; they do not assess audit quality or scope.</li>
            <li>Score history accumulates from the first scoring run; the liquidity component is back-filled from TVL history.</li>
          </ul>
        </div>
        <span id="bands" style={{ scrollMarginTop: 80 }} />
      </section>

      <section className="wrap" style={{ padding: '40px clamp(20px,4vw,48px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13.5, color: 'var(--color-text-2)' }}>Scores are analytics, not financial recommendations. Methodology v{snapshot.methodologyVersion} · Sep 2026</span>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/docs" className="btn btn-secondary">Read the documentation</Link>
          <Link href={dash('/')} className="btn btn-primary">Open Dashboard</Link>
        </div>
      </section>
    </>
  );
}
