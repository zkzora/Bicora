import type { Metadata } from 'next';
import Link from 'next/link';
import { getSnapshot } from '@/lib/data';

export const metadata: Metadata = { title: 'API Documentation' };

const ENDPOINTS = [
  {
    id: 'protocol-risk',
    path: '/v1/protocol-risk',
    desc: 'Returns protocol risk metrics: the overall score and band, the four component scores with every factor, effective weights, current liquidity and the daily history for the requested window.',
    params: [
      ['protocol', 'string', 'Protocol slug, e.g. zest. Omit for all tracked protocols.'],
      ['window', '7d | 30d | 90d', 'History window for tvl_history and score_history. Default 30d.'],
    ],
    example: `curl https://api.btcfi.example/v1/protocol-risk?protocol=zest&window=7d

{
  "updated_at": "2026-09-18T06:25:31.000Z",
  "methodology_version": "1.0.0",
  "protocols": [{
    "protocol": "zest",
    "name": "Zest Protocol",
    "category": "Lending",
    "overall_score": 68,
    "band": "Moderate",
    "liquidity_score": 72.5,
    "activity_score": 16.3,
    "collateral_health": 93.9,
    "transparency_score": 93.7,
    "effective_weights": { "liquidity": 30, "activity": 25, "collateral": 25, "transparency": 20 },
    "liquidity_usd": 65385202,
    "borrowed_usd": 13581728,
    "utilization": 0.172,
    "components": [ { "key": "liquidity", "factors": [ ... ] }, ... ],
    "tvl_history": [ { "date": "2026-09-12", "tvlUsd": 64210044 }, ... ],
    "score_history": [ { "date": "2026-09-18", "overall": 68, ... } ]
  }]
}`,
  },
  {
    id: 'market-health',
    path: '/v1/market-health',
    desc: 'Returns ecosystem metrics across all tracked protocols: liquidity tracked with 7d / 30d change, active addresses, transactions, the average risk score, the band distribution and the 90-day ecosystem TVL series.',
    params: [],
    example: `curl https://api.btcfi.example/v1/market-health

{
  "protocols": 5,
  "liquidity_usd": 109789459,
  "liquidity_change_7d": 0.015,
  "active_addresses_7d": 223,
  "transactions_7d": 2830,
  "avg_risk_score": 63,
  "band_distribution": { "Low": 0, "Moderate": 3, "Elevated": 2, "High": 0 },
  "tvl_history": [ ... ]
}`,
  },
  {
    id: 'risk-alerts',
    path: '/v1/risk-alerts',
    desc: 'Returns detected risk events such as liquidity movement, utilisation thresholds, activity swings and score changes. Each event carries a severity (info, watch, alert) and the measured delta.',
    params: [
      ['since', 'ISO 8601', 'Only events at or after this timestamp.'],
      ['kind', 'string', 'liquidity | activity | collateral | transparency | score'],
    ],
    example: `curl https://api.btcfi.example/v1/risk-alerts?since=2026-09-17T00:00:00Z

{
  "events": [
    { "slug": "zest", "ts": "2026-09-18T06:25:31.000Z", "kind": "activity", "severity": "watch",
      "message": "Zest Protocol transaction success rate 67% over 7 days", "delta": 0.667 }
  ]
}`,
  },
  {
    id: 'methodology',
    path: '/v1/methodology',
    desc: 'Returns the methodology version, the nominal component weights and the risk band thresholds, so integrators can label scores consistently.',
    params: [],
    example: `curl https://api.btcfi.example/v1/methodology

{
  "version": "1.0.0",
  "scale": "0-100, higher is safer",
  "weights": { "liquidity": 0.3, "activity": 0.25, "collateral": 0.25, "transparency": 0.2 },
  "bands": { "Low": "75-100", "Moderate": "60-74", "Elevated": "40-59", "High": "0-39" }
}`,
  },
];

export default async function DocsPage() {
  const { snapshot } = await getSnapshot();
  return (
    <div className="wrap docs-layout">
      <aside className="docs-side">
        <div className="k k-muted" style={{ paddingTop: 0 }}>Getting started</div>
        <a href="#overview">API overview</a>
        <a href="#running">Running the stack</a>
        <div className="k k-muted">Reference</div>
        {ENDPOINTS.map((e) => (<a key={e.id} href={`#${e.id}`} className="mono">GET {e.path}</a>))}
        <div className="k k-muted">Concepts</div>
        <a href="#definitions">Data definitions</a>
        <Link href="/methodology">Risk methodology</Link>
        <a href="#integration">Integration example</a>
      </aside>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
        <div id="overview" className="endpoint">
          <span className="k">Documentation</span>
          <h1 style={{ fontSize: 'clamp(28px,3.4vw,40px)', letterSpacing: '-0.03em' }}>BTCFi Risk Layer API v1</h1>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-neutral-700)', maxWidth: '64ch' }}>
            Read-only JSON over HTTPS. Every response is derived from the latest scoring snapshot (methodology v{snapshot.methodologyVersion}) and is refreshed on the indexer schedule. No authentication is required in v0.1; responses are cacheable for 60 seconds. All monetary values are USD, all scores are 0–100 where higher means lower risk.
          </p>
        </div>

        <div id="running" className="endpoint">
          <h2 style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>Running the stack</h2>
          <pre className="code-block">{`npm install
npm run pipeline      # index Stacks data, then compute scores -> data/snapshot.json
npm run api           # http://localhost:4000  (file store, or PostgreSQL when DATABASE_URL is set)
npm run dashboard     # http://localhost:3000  (reads API_URL when set, else the committed snapshot)`}</pre>
        </div>

        {ENDPOINTS.map((e) => (
          <div key={e.id} id={e.id} className="endpoint">
            <div>
              <span className="tag tag-accent mono">GET</span>
              <h2 style={{ marginTop: 10 }}>{e.path}</h2>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-neutral-700)', maxWidth: '64ch' }}>{e.desc}</p>
            {e.params.length > 0 && (
              <div>
                <span className="k k-ink">Query parameters</span>
                <table className="table" style={{ marginTop: 8 }}>
                  <thead><tr><th>Name</th><th>Type</th><th>Description</th></tr></thead>
                  <tbody>{e.params.map(([n, t, d]) => (<tr key={n}><td className="mono">{n}</td><td className="mono">{t}</td><td>{d}</td></tr>))}</tbody>
                </table>
              </div>
            )}
            <div>
              <span className="k k-ink">Example</span>
              <pre className="code-block" style={{ marginTop: 8 }}>{e.example}</pre>
            </div>
          </div>
        ))}

        <div id="definitions" className="endpoint prose">
          <h2 style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>Data definitions</h2>
          <ul>
            <li><code>liquidity_usd</code> — value locked on Stacks per DefiLlama, excluding borrowed value.</li>
            <li><code>borrowed_usd</code> / <code>utilization</code> — outstanding borrows and borrowed ÷ (liquidity + borrowed); lending protocols only.</li>
            <li><code>tx_7d</code> / <code>unique_senders_7d</code> — confirmed direct calls to the registered entry-point contracts in the last 7 days and the distinct sender principals; marked estimated when sampled.</li>
            <li><code>score_delta_7d</code> — overall score minus the score recorded 7 days earlier (null until history exists).</li>
            <li><code>components[].factors[]</code> — the exact inputs behind each component score: label, observed value, mapped 0–100 score and weight within the component.</li>
            <li><code>effective_weights</code> — the weights actually applied after redistributing non-applicable components.</li>
          </ul>
        </div>

        <div id="integration" className="endpoint">
          <h2 style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>Integration example</h2>
          <pre className="code-block">{`const res = await fetch(\`\${API}/v1/protocol-risk?protocol=stackingdao\`);
const { protocols: [p] } = await res.json();

if (p.band === 'High' || p.band === 'Elevated') {
  showWarning(\`\${p.name}: risk score \${p.overall_score} (\${p.band})\`);
}`}</pre>
          <p style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>
            Source, methodology and the protocol registry live in the public repository. Contributions that add a protocol must cite public sources for every transparency field.
          </p>
        </div>
      </div>
    </div>
  );
}
