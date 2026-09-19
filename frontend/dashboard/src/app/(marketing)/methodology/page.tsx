import Link from 'next/link';
import type { Metadata } from 'next';
import { getSnapshot } from '@/lib/data';
import { bandMeaning } from '@/lib/format';
import { BandTag } from '@/components/ui';
import { dash } from '@/lib/urls';

export const metadata: Metadata = { title: 'Methodology' };

const COMPONENTS = [
  {
    pct: '30%', name: 'Liquidity Health', color: 'var(--series-1)',
    summary: 'Measures liquidity depth, trend and stability.',
    factors: [
      ['Liquidity depth (TVL)', '50%', 'log scale: $100K → 0 · $1M → 25 · $10M → 50 · $100M → 75 · $1B → 100'],
      ['30-day TVL trend', '25%', '−50% → 0 · −20% → 30 · flat → 65 · +20% → 90 · +50% → 100'],
      ['30-day stability', '25%', '60% max drawdown (2% → 100 … 80% → 0) + 40% daily volatility (1%/d → 100 … 25%/d → 0)'],
    ],
    source: 'DefiLlama Stacks-chain TVL history, cleaned for adapter outliers.',
  },
  {
    pct: '25%', name: 'Protocol Activity', color: 'var(--series-2)',
    summary: 'Measures transactions, unique senders and usage trend.',
    factors: [
      ['Transactions, 7 days', '40%', 'log scale: 10 → 0 · 100 → 33 · 1,000 → 67 · 10,000 → 100'],
      ['Unique senders, 7 days', '35%', 'log scale: 5 → 0 · 50 → 37 · 500 → 74 · 2,500 → 100'],
      ['Trend vs prior week', '15%', '−60% → 10 · flat → 60 · +30% → 85 · +100% → 100 (excluded when the prior week is not covered)'],
      ['Transaction success rate', '10%', '70% → 0 · 85% → 40 · 95% → 80 · 99% → 100'],
    ],
    source: 'Hiro Stacks API: direct calls to the registered entry-point contracts, 7-day window.',
  },
  {
    pct: '25%', name: 'Collateral Health', color: 'var(--series-3)',
    summary: 'Measures utilisation of collateralised lending markets.',
    factors: [
      ['Utilisation (borrowed ÷ supplied)', '70%', '≤50% → 100 · 80% → 60 · 95% → 20 · 100% → 0'],
      ['Utilisation change, 7 days', '30%', '−10 pts → 100 · flat → 80 · +10 pts → 40 · +20 pts → 10'],
    ],
    source: 'DefiLlama borrowed value for lending / CDP protocols. Not applicable to DEXs and liquid stacking: the weight is redistributed.',
  },
  {
    pct: '20%', name: 'Security & Transparency', color: 'var(--series-4)',
    summary: 'Measures documentation, contract information and security signals.',
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
          <span className="k">Methodology v{snapshot.methodologyVersion}</span>
          <h1 style={{ fontSize: 'clamp(38px,4.4vw,56px)', lineHeight: 1, letterSpacing: '-0.03em', marginTop: 14 }}>How scores are calculated.</h1>
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-neutral-700)', maxWidth: '52ch' }}>
          Every protocol score is a weighted composite of four public indicators on a 0–100 scale where higher means lower risk. Weights, inputs and thresholds are published here, versioned with the API, and every factor value is visible on the protocol page.
        </p>
      </section>

      <section className="wrap section weights">
        {COMPONENTS.map((c) => (
          <div key={c.name}>
            <div className="pct">{c.pct}</div>
            <h3><span style={{ display: 'inline-block', width: 10, height: 10, background: c.color, borderRadius: 2, marginRight: 8 }} />{c.name}</h3>
            <p style={{ fontSize: 14, color: 'var(--color-neutral-700)', lineHeight: 1.6 }}>{c.summary}</p>
          </div>
        ))}
      </section>

      <section className="wrap section" style={{ padding: '56px clamp(20px,4vw,48px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 48 }}>
        <div>
          <span className="k">Composite score</span>
          <div className="composite">
            <div style={{ width: '30%', background: 'var(--ink)', color: 'var(--on-ink)' }}>Liquidity 30</div>
            <div style={{ width: '25%', background: 'var(--color-accent)' }}>Activity 25</div>
            <div style={{ width: '25%', background: 'var(--color-accent-300)' }}>Collateral 25</div>
            <div style={{ width: '20%', background: 'var(--color-surface)' }}>Transp. 20</div>
          </div>
          <p className="mono" style={{ fontSize: 13, color: 'var(--color-neutral-700)', marginTop: 12 }}>score = 0.30·L + 0.25·A + 0.25·C + 0.20·T</p>
          <p style={{ fontSize: 13, color: 'var(--color-neutral-700)', marginTop: 12, lineHeight: 1.7 }}>
            When a component does not apply (no collateralised borrowing) or its inputs are unavailable, its weight is redistributed proportionally across the remaining components. The effective weights used are published with every score.
          </p>
        </div>
        <div>
          <span className="k" id="bands" style={{ scrollMarginTop: 80 }}>Risk bands</span>
          <table className="table" style={{ marginTop: 14 }}>
            <thead><tr><th>Band</th><th>Score</th><th>Meaning</th></tr></thead>
            <tbody>
              {([['Low', '75–100'], ['Moderate', '60–74'], ['Elevated', '40–59'], ['High', '0–39']] as const).map(([b, r]) => (
                <tr key={b}><td><BandTag band={b} /></td><td className="mono">{r}</td><td>{bandMeaning[b]}</td></tr>
              ))}
            </tbody>
          </table>
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
              <h3 style={{ fontSize: 18 }}><span style={{ display: 'inline-block', width: 10, height: 10, background: c.color, borderRadius: 2, marginRight: 8 }} />{c.name} · {c.pct}</h3>
              <p style={{ fontSize: 13, color: 'var(--color-neutral-700)', marginTop: 8, lineHeight: 1.7 }}><b style={{ color: 'var(--color-text)' }}>Source.</b> {c.source}</p>
            </div>
            <table className="table" style={{ gridColumn: 'span 2' }}>
              <thead><tr><th>Factor</th><th className="r">Weight</th><th>Mapping to 0–100</th></tr></thead>
              <tbody>{c.factors.map(([f, w, mth]) => (<tr key={f}><td style={{ fontWeight: 600 }}>{f}</td><td className="r mono">{w}</td><td className="mono" style={{ fontSize: 11.5 }}>{mth}</td></tr>))}</tbody>
            </table>
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
            <li>Collateral health depends on the DefiLlama adapter exposing borrowed value; Granite currently reports none, so its collateral component is not applicable.</li>
            <li>Transparency factors are rubric-based on public sources; they do not assess audit quality or scope.</li>
            <li>Score history accumulates from the first scoring run; the liquidity component is back-filled from TVL history.</li>
          </ul>
        </div>
      </section>

      <section className="wrap" style={{ padding: '40px clamp(20px,4vw,48px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, color: 'var(--color-neutral-700)' }}>Scores are analytics, not financial recommendations. Methodology v{snapshot.methodologyVersion} · Sep 2026</span>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/docs" className="btn btn-secondary">Read the documentation</Link>
          <Link href={dash('/')} className="btn btn-primary">Open Dashboard</Link>
        </div>
      </section>
    </>
  );
}
