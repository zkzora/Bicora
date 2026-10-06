import type { Metadata } from 'next';
import Link from 'next/link';
import { getSnapshot } from '@/lib/data';
import { dash, APP_URL } from '@/lib/urls';

export const metadata: Metadata = { title: 'API Documentation' };

const ENDPOINTS = [
  {
    id: 'health',
    path: '/health',
    desc: 'Service status: the store in use (file or PostgreSQL), the generation time of the snapshot being served and the methodology version.',
    params: [],
    example: `curl http://localhost:4000/health

{ "ok": true, "store": "file", "snapshotAt": "2026-10-06T02:49:19.530Z", "methodology": "1.0.0" }`,
  },
  {
    id: 'snapshot',
    path: '/v1/snapshot',
    desc: 'Returns the full denormalised snapshot the dashboard renders, with camelCase field names. It is the only endpoint that carries the informational Bitcoin Staking block (staking) and the per-protocol data-quality fields (dataQuality, metrics.activitySampled). Returns 503 until the pipeline has produced a snapshot.',
    params: [],
    example: `curl http://localhost:4000/v1/snapshot

{
  "generatedAt": "2026-10-06T02:49:19.530Z",
  "methodologyVersion": "1.0.0",
  "market": { "protocolsTracked": 5, "totalTvlUsd": 146687220.8, ... },
  "protocols": [ { "slug": "zest", "metrics": { ... }, "dataQuality": { ... }, "score": { ... }, ... } ],
  "events": [ ... ],
  "staking": {
    "source": "live",
    "fetchedAt": "2026-10-06T02:49:19.530Z",
    "observedAt": "2026-10-06T02:49:19.530Z",
    "lastAttemptAt": "2026-10-06T02:49:19.530Z",
    "stackedStx": 448329575.89,
    "stxPriceUsd": 0.375632,
    "stackingTvlUsd": 168406935.25,
    "pctSupplyStacked": 0.2395,
    "currentCycle": 144,
    "btcYieldPerCycleEst": 9.2278,
    "targetBtcApy": 0.03,
    "btcBonded": null,
    "liquidStackedUsd": 56335195.09,
    "history": [ { "cycle": 144, "stackedStx": 448279555.39, "signers": 31 }, ... ],
    ...
  }
}`,
  },
  {
    id: 'protocol-risk',
    path: '/v1/protocol-risk',
    desc: 'Returns protocol risk metrics: the overall score and band, the four component scores with every factor, effective weights, current liquidity, 7-day activity and the daily history for the requested window.',
    params: [
      ['protocol', 'string', 'Protocol slug, e.g. zest. Omit for all tracked protocols. Unknown slugs return 404.'],
      ['window', '7d | 30d | 90d', 'History window for tvl_history and score_history. Default 30d.'],
    ],
    example: `curl "http://localhost:4000/v1/protocol-risk?protocol=zest&window=7d"

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
    "tx_7d": 104,
    "unique_senders_7d": 34,
    "score_delta_7d": null,
    "components": [ { "key": "liquidity", "factors": [ ... ] }, ... ],
    "tvl_history": [ { "date": "2026-09-12", "tvlUsd": 64210044, "borrowedUsd": 13402112 }, ... ],
    "score_history": [ { "date": "2026-09-18", "overall": 68, ... } ]
  }]
}`,
  },
  {
    id: 'market-health',
    path: '/v1/market-health',
    desc: 'Returns ecosystem metrics across the tracked protocols: liquidity tracked with 7d / 30d change, active addresses, transactions, the average risk score, the band distribution and the 90-day ecosystem TVL series. Bitcoin Staking values are not included in any of these figures.',
    params: [],
    example: `curl http://localhost:4000/v1/market-health

{
  "updated_at": "2026-09-18T06:25:31.000Z",
  "protocols": 5,
  "liquidity_usd": 109789459,
  "liquidity_change_7d": 0.015,
  "liquidity_change_30d": -0.042,
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
    desc: 'Returns detected risk events such as liquidity movement, utilisation thresholds, activity swings and score changes (at most 200). Each event carries a severity (info, watch, alert) and the measured delta. No events are generated from Bitcoin Staking data.',
    params: [
      ['since', 'ISO 8601', 'Only events at or after this timestamp.'],
      ['kind', 'string', 'liquidity | activity | collateral | transparency | score'],
    ],
    example: `curl "http://localhost:4000/v1/risk-alerts?since=2026-09-17T00:00:00Z"

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
    example: `curl http://localhost:4000/v1/methodology

{
  "version": "1.0.0",
  "scale": "0-100, higher is safer",
  "weights": { "liquidity": 0.3, "activity": 0.25, "collateral": 0.25, "transparency": 0.2 },
  "bands": { "Low": "75-100", "Moderate": "60-74", "Elevated": "40-59", "High": "0-39" },
  "docs": "https://bicora.xyz/methodology"
}`,
  },
];

/** [source, endpoint, what Bicora reads from it, used for] */
const SOURCES: [string, string, string, string][] = [
  ['DefiLlama', 'GET /protocol/{llamaSlug}', 'Stacks-chain TVL series (chainTvls.Stacks, excludes borrowed), Stacks-borrowed series, current values, latest token breakdown in USD', 'Protocol TVL, borrowed, utilisation, TVL history, ecosystem totals, liquid-stacked overlap'],
  ['Hiro Stacks API', 'GET /extended/v1/contract/{id}', 'Contract existence, deploy block height, source size', 'Contract coverage, transparency inputs'],
  ['Hiro Stacks API', 'GET /extended/v1/tx/{deploy tx}', 'Deployment time (Bitcoin block time)', 'Contract age'],
  ['Hiro Stacks API', 'GET /extended/v1/address/{contract}/transactions', 'Transactions on each registered contract, newest first: 50 per page, up to 24 pages (1,200) per contract per run, back 14 days', 'tx_7d, unique_senders_7d, success rate, week-over-week trend'],
  ['Hiro Stacks API', 'GET /v2/pox', 'Active PoX state: STX stacked this cycle, liquid supply, cycle and phase lengths, blocks to next cycle, minimum threshold', 'Bitcoin Staking (informational)'],
  ['Hiro Stacks API', 'GET /extended/v2/pox/cycles?limit=16', 'Total stacked and signer count per reward cycle', 'Bitcoin Staking cycle history (informational)'],
  ['Hiro Stacks API', 'GET /extended/v1/burnchain/rewards?limit=250', 'Most recent PoX reward payouts on Bitcoin (canonical only)', 'Realized BTC rewards estimate (informational)'],
  ['CoinGecko', 'GET /simple/price?ids=blockstack', 'STX spot price in USD at run time', 'Bitcoin Staking USD value only (informational)'],
  ['stacks.co (cited)', 'stacks.co/bitcoin-staking', 'Target BTC APY (~3%), cumulative BTC distributed (~4,224 BTC, read 2026-09), bond period (25,200 blocks)', 'Static reference values on the staking block, not live data'],
];

/** [field, type, definition, status] — every field of snapshot.staking. */
const STAKING_FIELDS: [string, string, string, string][] = [
  ['source', "'live' | 'carried-forward'", 'Whether this run fetched PoX state, or copied the previous block because /v2/pox failed.', 'See Stale'],
  ['observedAt', 'ISO 8601 | null', 'When the values were fetched successfully. Kept unchanged when the block is carried forward. Null when no successful fetch exists or, for a block carried forward before this field was added, when it was not recorded.', 'Observation time'],
  ['lastAttemptAt', 'ISO 8601', 'Latest fetch attempt (the run that wrote the block), successful or not.', 'Run time'],
  ['fetchedAt', 'ISO 8601', 'Same as lastAttemptAt; kept for compatibility. Use observedAt for data age.', 'Run time'],
  ['stackedStx', 'number | null', 'STX committed to Proof of Transfer for the current reward cycle (/v2/pox current_cycle.stacked_ustx ÷ 10^6).', 'Live'],
  ['totalStxSupply', 'number | null', 'Liquid STX supply (/v2/pox total_liquid_supply_ustx ÷ 10^6).', 'Live'],
  ['pctSupplyStacked', 'number | null', 'stackedStx ÷ totalStxSupply (0–1).', 'Derived'],
  ['stxPriceUsd', 'number | null', 'CoinGecko STX/USD spot at run time.', 'Live'],
  ['stackingTvlUsd, stackedUsd', 'number | null', 'stackedStx × stxPriceUsd. The two fields hold the same value. Null when the price is unavailable.', 'Derived'],
  ['currentCycle', 'number | null', 'Current PoX reward cycle number.', 'Live'],
  ['cycleLengthBlocks', 'number | null', 'Reward phase + prepare phase length, in Bitcoin blocks.', 'Live'],
  ['blocksUntilNextCycle', 'number | null', 'Bitcoin blocks until the next reward phase.', 'Live'],
  ['nextCycleEta', 'ISO 8601 | null', 'Run time + blocksUntilNextCycle × 10 minutes.', 'Estimated'],
  ['minThresholdStx', 'number | null', 'Minimum STX to stack solo this cycle.', 'Live'],
  ['totalSigners', 'number | null', 'Signers for the current cycle, from the cycles endpoint.', 'Live'],
  ['btcRewardPerBlockAvg', 'number | null', 'Average BTC paid to all PoX recipients per rewarded Bitcoin block, over the latest 250 canonical reward records.', 'Estimated'],
  ['btcYieldPerCycleEst', 'number | null', 'btcRewardPerBlockAvg × reward-phase length: total BTC paid to all stackers per cycle. An amount of BTC, not a rate.', 'Estimated'],
  ['targetBtcApy', 'number', 'Published ~3% target for the native Bitcoin Staking program (0.03). Constant in code, not measured.', 'Cited (static)'],
  ['cumulativeBtcDistributed', 'number', 'Published BTC paid out via PoX since 2021, as read from stacks.co in 2026-09. Constant in code.', 'Cited (static)'],
  ['btcBonded', 'null', 'BTC bonded in the native Bitcoin Staking program. Always null.', 'N/A'],
  ['bondPeriodBlocks', 'number', 'Bitcoin Staking bond period, 25,200 Bitcoin blocks (~6 months), per the whitepaper.', 'Cited (static)'],
  ['programStatus', 'string', 'Program status label, fixed in code.', 'Cited (static)'],
  ['liquidStackedUsd', 'number | null', 'DefiLlama TVL of tracked protocols in the Liquid Stacking category (StackingDAO today): the overlap with the scored DeFi figures.', 'Derived'],
  ['history[]', '{ cycle, stackedStx, signers }[]', 'Up to the last 16 reward cycles, ascending. From the cycles endpoint, so the latest entry can differ slightly from stackedStx.', 'Live'],
  ['sources[], notes[]', 'object[], string[]', 'Source links and plain-language caveats written by the pipeline for this run.', '—'],
];

/** [field, what it marks] */
const TIMESTAMPS: [string, string][] = [
  ['generatedAt / updated_at', 'When the scoring run that built the snapshot finished computing (UTC). Every protocol, market and staking value in a response comes from that run.'],
  ['tvl_history[].date, ecosystemTvlHistory[].date', 'UTC calendar day (YYYY-MM-DD) of a DefiLlama daily point. When DefiLlama reports several points for one day, the latest wins.'],
  ['liquidity_usd (current)', 'DefiLlama current value at fetch time, which can be more recent than the last daily point. The final ecosystem series point is replaced with the sum of current values so the chart ends on the headline figure.'],
  ['score_history[].date, score.computedAt', 'Day and time of the scoring run. One point per protocol per day; a later run on the same day replaces it.'],
  ['events[].ts', 'Time of the scoring run that detected the event.'],
  ['contracts[].deployedAt', 'Bitcoin block time of the deploy transaction.'],
  ['Activity windows', 'Measured on transaction Bitcoin block time: the 7 days before the indexer run, and the 7 days before that.'],
  ['staking.observedAt', 'Last successful fetch of the staking values; preserved when the block is carried forward.'],
  ['staking.lastAttemptAt, staking.fetchedAt', 'Latest fetch attempt (pipeline run time), successful or not.'],
  ['staking.nextCycleEta', 'An estimate, not an observed time.'],
];

/** [area, output, effect, persists] — current behaviour when the DefiLlama request for one protocol fails. */
const LLAMA_FAILURE: [string, string, string, string][] = [
  ['Scores', 'Liquidity Health', 'Scores 0. The depth factor maps $0 to 0; trend, drawdown and volatility have no history and are excluded.', 'This run'],
  ['Scores', 'Collateral Health', 'N/A for lending protocols that report borrowing (Zest): borrowed value is null, so the component is dropped and its weight redistributed. Utilisation is N/A.', 'This run'],
  ['Scores', 'overall_score, band, effective_weights', 'Recomputed with Liquidity at 0. Applied to the 2026-10-06 snapshot this would move Zest from 72 (Moderate) to 34 (High) and StackingDAO from 73 to 45 (Elevated).', 'This run'],
  ['Scores', 'Protocol Activity, Security & Transparency', 'Unaffected (Hiro data).', '—'],
  ['Histories', 'score_history', 'The day records the lowered overall score and Liquidity 0. A later successful run on the same UTC day replaces it; if the failed run is the last of the day, the point is kept.', 'Can be permanent'],
  ['Histories', 'Risk Index history', 'That day’s index point averages in the lowered score, under the same same-day rule. Later index change7d / change30d and score_delta_7d can compare against it.', 'Can be permanent'],
  ['Histories', 'tvl_history, liquidityScoreHistory', 'Empty for the protocol in that snapshot. Rebuilt from DefiLlama on the next successful run.', 'This run'],
  ['Totals', 'market-health liquidity_usd', 'Omits the protocol’s TVL (for Zest, about $79M of $147M on 2026-10-06).', 'This run'],
  ['Totals', 'market-health tvl_history', 'The protocol is missing from every day of the 90-day series, not only today. liquidity_change_7d / 30d are computed over the remaining protocols, so they do not show the gap.', 'This run'],
  ['Totals', 'avg_risk_score, Risk Index, band_distribution', 'Lowered and shifted by the protocol’s lowered score (one protocol is a fifth of the average).', 'This run (index history as above)'],
  ['Totals', 'staking.liquidStackedUsd', 'N/A when the failed protocol is StackingDAO (a 0 sum is reported as null).', 'This run'],
  ['Totals', 'active_addresses_7d, transactions_7d', 'Unaffected.', '—'],
  ['Alerts', 'score events', 'A drop of 3+ points against the previous day fires a watch event, 8+ an alert. If the bad history point is kept, the next day’s recovery fires an “up” event too.', 'Permanent (event log)'],
  ['Alerts', 'liquidity events', 'Not fired: with no history there is nothing to compare against, so the zero itself raises no TVL alert.', '—'],
  ['Alerts', 'collateral events', 'Suppressed for the run because utilisation is N/A, so a real 80% / 90% crossing would be missed.', 'This run'],
  ['Visibility', 'warnings', 'A llama: warning appears in dataQuality.warnings on /v1/snapshot and on the protocol page. /v1/protocol-risk and /v1/market-health return the figures with no warning.', '—'],
];

const STATUS_TAG:Record<string, string> = { Live: 'tag-Low', Derived: 'tag-neutral', Estimated: 'tag-Moderate', 'Cited (static)': 'tag-outline', 'N/A': 'tag-High' };

const h2 = { fontFamily: 'var(--font-heading)', textTransform: 'uppercase' } as const;

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="table-wrap"><table className="table" style={{ marginTop: 8 }}>
      <thead><tr>{head.map((h) => (<th key={h}>{h}</th>))}</tr></thead>
      <tbody>{rows.map((r, i) => (<tr key={i}>{r.map((c, j) => (<td key={j} style={{ verticalAlign: 'top' }}>{c}</td>))}</tr>))}</tbody>
    </table></div>
  );
}

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
        <div className="k k-muted">Data</div>
        <a href="#pipeline">TVL &amp; on-chain pipeline</a>
        <a href="#sources">Data sources</a>
        <a href="#contracts">Contract coverage</a>
        <a href="#pricing">Pricing sources</a>
        <a href="#timestamps">Timestamps &amp; freshness</a>
        <a href="#double-counting">Double counting</a>
        <a href="#status">N/A, partial, estimated, stale</a>
        <a href="#llama-failure">DefiLlama failures</a>
        <a href="#staking">Bitcoin Staking (informational)</a>
        <div className="k k-muted">Concepts</div>
        <a href="#definitions">Data definitions</a>
        <Link href="/methodology">Risk methodology</Link>
        <a href="#integration">Integration example</a>
        <a href="#planned">Planned</a>
      </aside>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
        <div id="overview" className="endpoint">
          <span className="k">Bicora API · v1</span>
          <h1 style={{ fontSize: 'clamp(28px,3.4vw,40px)', letterSpacing: '-0.03em' }}>Access standardized Bitcoin DeFi risk indicators.</h1>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-neutral-700)', maxWidth: '64ch' }}>
            Read-only JSON over HTTP. Every response is derived from the latest scoring snapshot (methodology v{snapshot.methodologyVersion}) and is refreshed on the pipeline schedule (every 6 hours). The v1 API runs locally or self-hosted today; a hosted public API is planned. No authentication is required in v0.1; responses are cacheable for 60 seconds. All monetary values are USD unless a field says BTC or STX, and all scores are 0–100 where higher means lower risk.
          </p>
          <div className="grid-cells" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))' }}>
            <div className="cell" style={{ padding: 14 }}><div className="k k-muted">Base URL</div><div className="mono" style={{ fontSize: 13, marginTop: 4 }}>http://localhost:4000</div><div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>Self-hosted. Hosted api.bicora.xyz: planned.</div></div>
            <div className="cell" style={{ padding: 14 }}><div className="k k-muted">Dashboard</div><div className="mono" style={{ fontSize: 13, marginTop: 4 }}><a href={dash('/')}>{APP_URL.replace(/^https?:\/\//, '')}</a></div></div>
            <div className="cell" style={{ padding: 14 }}><div className="k k-muted">Source</div><div className="mono" style={{ fontSize: 13, marginTop: 4 }}><a href="https://github.com/zkzora/Bicora" target="_blank" rel="noreferrer">github.com/zkzora/Bicora ↗</a></div></div>
          </div>
        </div>

        <div id="running" className="endpoint">
          <h2 style={h2}>Running the stack</h2>
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
                <div className="table-wrap"><table className="table" style={{ marginTop: 8 }}>
                  <thead><tr><th>Name</th><th>Type</th><th>Description</th></tr></thead>
                  <tbody>{e.params.map(([n, t, d]) => (<tr key={n}><td className="mono">{n}</td><td className="mono">{t}</td><td>{d}</td></tr>))}</tbody>
                </table></div>
              </div>
            )}
            <div>
              <span className="k k-ink">Example</span>
              <pre className="code-block" style={{ marginTop: 8 }}>{e.example}</pre>
            </div>
          </div>
        ))}

        <div id="pipeline" className="endpoint prose">
          <h2 style={h2}>TVL &amp; on-chain pipeline</h2>
          <p>One scheduled run (GitHub Actions, every 6 hours at minute 17 UTC) executes two steps and commits the result:</p>
          <ol style={{ paddingLeft: 18 }}>
            <li><b>Indexer</b> (<code>backend/indexer</code>). For each protocol in <code>config/protocols.json</code>: TVL, borrowed and token breakdown from DefiLlama; contract metadata and 14 days of transactions on the registered contracts from the Hiro Stacks API. Writes one raw record per protocol.</li>
            <li><b>Scoring engine</b> (<code>backend/scoring-engine</code>). Cleans TVL history (adapter outliers below 5% of the 90-day median are excluded and counted), scores each protocol, detects events, builds ecosystem aggregates, then builds the informational Bitcoin Staking block from Hiro PoX endpoints and CoinGecko. Writes the snapshot served by the API and the dashboard.</li>
          </ol>
          <h3>Where TVL comes from today</h3>
          <ul>
            <li>Every protocol TVL value Bicora serves (<code>liquidity_usd</code>, <code>borrowed_usd</code>, <code>tvl_history</code>, <code>market-health</code> totals, <code>liquidStackedUsd</code>) is <b>DefiLlama&rsquo;s figure</b> for the Stacks chain. These are the only TVL values used by the Risk Index.</li>
            <li>On-chain data from Hiro is used for contract existence, contract age and transaction activity, not for TVL.</li>
            <li>The one USD value Bicora computes itself is <code>staking.stackingTvlUsd</code> (on-chain PoX state × CoinGecko price). It is informational and outside the Risk Index.</li>
          </ul>
          <h3>Bicora-calculated protocol TVL <span className="tag tag-outline" style={{ marginLeft: 6 }}>Planned</span></h3>
          <p>
            A protocol TVL computed by Bicora from on-chain contract balances is <b>not implemented</b>. It is not in the pipeline, the snapshot or the API, and nothing on this page or the dashboard is derived from it. It is planned as a parallel comparison against DefiLlama only. Scores use DefiLlama TVL; changing the scoring input would require a new methodology version.
          </p>
        </div>

        <div id="sources" className="endpoint prose">
          <h2 style={h2}>Data sources</h2>
          <p>All sources are public. A Hiro API key (<code>HIRO_API_KEY</code>) is optional and only raises rate limits.</p>
          <Table head={['Source', 'Endpoint', 'What is read', 'Used for']} rows={SOURCES.map(([s, e, w, u]) => [s, <code key="e">{e}</code>, w, u])} />
          <p>
            Failed requests are retried with exponential backoff on HTTP 429, 5xx and network errors. A failure after retries is recorded rather than replaced with a guess (see <a href="#status">data status</a>).
          </p>
        </div>

        <div id="contracts" className="endpoint prose">
          <h2 style={h2}>Contract coverage</h2>
          <p>
            Activity metrics and contract-age inputs are measured only on these registered contracts. Transactions that reach a protocol through other contracts (routers, aggregators, newer versions not yet registered) are not counted, so activity can be understated. The list below is read from the current snapshot.
          </p>
          <Table
            head={['Protocol', 'Contract', 'Role', 'Indexed']}
            rows={snapshot.protocols.flatMap((p) => p.contracts.map((c) => [
              <span key="p">{p.name}<div className="muted" style={{ fontSize: 11 }}>{p.category}</div></span>,
              <code key="c" style={{ wordBreak: 'break-all' }}>{c.id}</code>,
              c.role,
              c.found ? 'Yes' : 'Not found this run',
            ]))}
          />
          <ul>
            <li>TVL does not come from these contracts. DefiLlama&rsquo;s adapter for each protocol defines which contracts its TVL covers.</li>
            <li>Bitcoin Staking uses no registered contract list. It reads the active PoX contract&rsquo;s state through Hiro&rsquo;s <code>/v2/pox</code>, PoX cycles and burnchain rewards endpoints.</li>
          </ul>
        </div>

        <div id="pricing" className="endpoint prose">
          <h2 style={h2}>Pricing sources</h2>
          <ul>
            <li><b>Protocol TVL, borrowed, token breakdown, ecosystem totals:</b> USD values as priced by DefiLlama. Bicora applies no price of its own and uses no on-chain price oracle.</li>
            <li><b>Bitcoin Staking USD value:</b> CoinGecko <code>simple/price</code> for STX (<code>blockstack</code>), one spot read per run. No averaging. If the read fails, <code>stxPriceUsd</code> and <code>stackingTvlUsd</code> are N/A for that run.</li>
            <li><b>BTC reward figures</b> are in BTC and are not converted to USD.</li>
            <li><b>Dashboard price ticker</b> (BTC, STX): fetched in the browser from CoinGecko, with Coinbase spot as fallback. Display only; not stored in the snapshot, not served by the API, not used in any score.</li>
          </ul>
        </div>

        <div id="timestamps" className="endpoint prose">
          <h2 style={h2}>Timestamps &amp; freshness</h2>
          <p>All timestamps are UTC. The pipeline runs every 6 hours; the API caches the snapshot in memory for 60 seconds; a dashboard pointed at the API revalidates every 5 minutes and falls back to the committed snapshot if the API is unreachable.</p>
          <Table head={['Field', 'Meaning']} rows={TIMESTAMPS.map(([f, m]) => [<code key="f">{f}</code>, m])} />
        </div>

        <div id="double-counting" className="endpoint prose">
          <h2 style={h2}>Double counting</h2>
          <ul>
            <li><b>Borrowed value.</b> <code>liquidity_usd</code> excludes borrowed value; <code>borrowed_usd</code> is reported separately. Supplied = liquidity + borrowed; <code>utilization</code> = borrowed ÷ supplied. Borrowed value is never added to ecosystem totals.</li>
            <li><b>Ecosystem total.</b> <code>market-health.liquidity_usd</code> is the sum of each tracked protocol&rsquo;s DefiLlama Stacks TVL. Bicora does not remove cross-protocol re-deposits: for example, stSTX supplied to a lending market or pooled on a DEX is also backed by STX counted in StackingDAO&rsquo;s TVL. The total can therefore include some double counting.</li>
            <li><b>Bitcoin Staking vs DeFi TVL.</b> <code>stackingTvlUsd</code> is never added to the ecosystem total, the Risk Index or any protocol figure. PoX stacking is not a DefiLlama protocol, so it is outside the DeFi figures except for STX stacked through liquid-staking protocols, which is counted both in that protocol&rsquo;s DeFi TVL and in total STX stacked.</li>
            <li><b>Liquid-stacked overlap.</b> <code>liquidStackedUsd</code> shows that overlap so it can be subtracted rather than summed. It uses the full DefiLlama TVL of tracked Liquid Stacking protocols (StackingDAO), so it approximates the overlap. Untracked liquid-staking protocols such as LISA are not included.</li>
            <li><b>Chain-wide TVL.</b> The &ldquo;Stacks TVL&rdquo; on stacks.co combines stacked STX, BTC on Stacks and DeFi. It is a different figure from both the ecosystem total and <code>stackingTvlUsd</code> and is not reproduced by Bicora.</li>
          </ul>
        </div>

        <div id="status" className="endpoint prose">
          <h2 style={h2}>N/A, partial, estimated, stale</h2>
          <h3>N/A</h3>
          <p>
            The value is <code>null</code> in the API and shown as N/A on the dashboard. It means there is no authoritative public source, the source failed this run, or the input does not apply. N/A is never reported as zero. Examples: <code>staking.btcBonded</code> (always), <code>borrowed_usd</code> and <code>utilization</code> when the DefiLlama adapter reports no borrowing, <code>collateral_health</code> for protocols without collateralised borrowing (its weight is redistributed per the methodology), <code>score_delta_7d</code> until 7 days of history exist, and TVL changes when no earlier point exists.
          </p>
          <p>
            Known exceptions: if the DefiLlama request fails for a protocol, the indexer records its TVL as 0 and adds a <code>llama:</code> warning (effects listed <a href="#llama-failure">below</a>). If activity fetching fails, counts are 0 with an <code>activity:</code> warning, which also lowers the Activity score. These warnings are in <code>protocols[].dataQuality.warnings</code> on <code>/v1/snapshot</code> and on the protocol page only. Check them before treating a 0 as real.
          </p>
          <h3>Partial</h3>
          <p>The value covers less than its intended scope. There is no single partial flag; it shows up as:</p>
          <ul>
            <li>Activity windows that cover fewer than 7 days because the 1,200-transactions-per-contract cap was reached (<code>metrics.activitySampled</code>, and the factor note &ldquo;Sampled: x of 7 days covered&rdquo;).</li>
            <li>No prior 7-day window when the previous week was not covered, so the week-over-week trend is N/A.</li>
            <li>Registered contracts not found on Hiro (<code>contracts[].found: false</code> plus a warning), which are left out of activity.</li>
            <li>A staking block with <code>source: &apos;live&apos;</code> where some fields are null because one source (price, rewards or cycles) failed while <code>/v2/pox</code> succeeded.</li>
            <li>Coverage limited by design: five tracked protocols in ecosystem totals, the last 16 reward cycles in staking history, StackingDAO only in <code>liquidStackedUsd</code>.</li>
          </ul>
          <h3>Estimated</h3>
          <p>The value is an approximation, not a direct measurement:</p>
          <ul>
            <li>When activity is sampled, the Activity factors scale counts by 7 ÷ days covered. The raw <code>tx_7d</code> and <code>unique_senders_7d</code> values are not scaled.</li>
            <li><code>btcRewardPerBlockAvg</code> and <code>btcYieldPerCycleEst</code> (from a 250-record sample of recent rewards).</li>
            <li><code>nextCycleEta</code> (assumes 10-minute Bitcoin blocks).</li>
            <li><code>liquidStackedUsd</code> as a measure of overlap (see above).</li>
            <li><code>liquidityScoreHistory</code> (<code>/v1/snapshot</code>), back-filled by applying the liquidity factors to past TVL history rather than recorded at the time.</li>
          </ul>
          <h3>Stale</h3>
          <p>The value is older than the latest pipeline run:</p>
          <ul>
            <li><code>staking.source: &apos;carried-forward&apos;</code>. <code>/v2/pox</code> failed, so the previous run&rsquo;s staking values were reused. <code>observedAt</code> keeps the time of the last successful fetch, across any number of failed runs; <code>lastAttemptAt</code> is the failed attempt. The data age is the time since <code>observedAt</code>. If there is no earlier block, all live staking fields are N/A and <code>observedAt</code> is null.</li>
            <li>Cited static values (<code>targetBtcApy</code>, <code>cumulativeBtcDistributed</code> as of 2026-09, <code>bondPeriodBlocks</code>) are constants that change only when the code is updated.</li>
            <li>Protocol data has no stale flag. Compare <code>updated_at</code> with the current time: anything older than about 6 hours means a scheduled run was missed. DefiLlama daily points can also lag the current TVL value.</li>
          </ul>
        </div>

        <div id="llama-failure" className="endpoint prose">
          <h2 style={h2}>When a DefiLlama fetch fails</h2>
          <p>
            Current behaviour, documented as-is. When the DefiLlama request for a protocol still fails after retries, the indexer stores TVL 0, borrowed null, an empty history and no token breakdown, and the run continues. Scoring treats that 0 as a real value. The table lists what this changes. As of 2026-10-06 no such failure appears in the committed score history. A correction is under review; scoring behaviour and the methodology are unchanged until it is approved.
          </p>
          <Table head={['Area', 'Output', 'Effect', 'Persists']} rows={LLAMA_FAILURE.map(([a, o, e, p]) => [a, <code key="o">{o}</code>, e, p])} />
        </div>

        <div id="staking" className="endpoint prose">
          <h2 style={h2}>Bitcoin Staking (informational)</h2>
          <p>
            <span className="tag tag-outline">Informational · not in Risk Index</span>
          </p>
          <p>
            The Bitcoin Staking (Stacks Proof of Transfer) tracker is <b>outside the Bicora Risk Index</b>. It is not in the <code>protocols</code> array, has no score, band or component, generates no risk events, and is not part of <code>market-health</code>, the ecosystem TVL or the average risk score. It is available only as <code>staking</code> on <code>/v1/snapshot</code> and on the dashboard&rsquo;s Bitcoin Staking page. The methodology, scoring inputs, weights and thresholds are unchanged by it.
          </p>
          <h3>PoX STX committed vs BTC bonded</h3>
          <ul>
            <li><b>STX committed</b> (<code>stackedStx</code>): STX locked in Proof of Transfer for the current reward cycle, read live from on-chain PoX state. This is what <code>stackingTvlUsd</code> values.</li>
            <li><b>BTC bonded</b> (<code>btcBonded</code>): BTC locked by participants in the native Bitcoin Staking program. That BTC sits in individual Bitcoin L1 timelocks under the holders&rsquo; own keys, and there is no public aggregate source, so the field is always N/A. Bicora does not estimate it. BTC bonded is not part of <code>stackingTvlUsd</code>.</li>
          </ul>
          <h3>Target APY vs realized rewards</h3>
          <ul>
            <li><b>Target APY</b> (<code>targetBtcApy</code>, ~3%): the published target for the native Bitcoin Staking program, cited from stacks.co. It is a constant, not a measurement and not a guarantee, and it does not describe classic PoX stacking yield.</li>
            <li><b>Realized rewards</b> (<code>btcRewardPerBlockAvg</code>, <code>btcYieldPerCycleEst</code>): BTC actually paid to PoX recipients, estimated from recent on-chain reward records. They are total BTC amounts across all stackers, not a per-holder rate. Bicora does not compute a realized APY.</li>
            <li><code>cumulativeBtcDistributed</code> is a cited stacks.co total, not summed by Bicora.</li>
          </ul>
          <h3>Fields</h3>
          <Table
            head={['Field', 'Type', 'Definition', 'Status']}
            rows={STAKING_FIELDS.map(([f, t, d, s]) => [
              <code key="f">{f}</code>,
              <span key="t" className="mono" style={{ fontSize: 11.5 }}>{t}</span>,
              d,
              STATUS_TAG[s] ? <span key="s" className={`tag ${STATUS_TAG[s]}`}>{s}</span> : s,
            ])}
          />
        </div>

        <div id="definitions" className="endpoint prose">
          <h2 style={h2}>Data definitions</h2>
          <ul>
            <li><code>liquidity_usd</code> — value locked on Stacks per DefiLlama, excluding borrowed value.</li>
            <li><code>borrowed_usd</code> / <code>utilization</code> — outstanding borrows and borrowed ÷ (liquidity + borrowed); lending protocols only, null when the adapter reports no borrowing.</li>
            <li><code>tx_7d</code> / <code>unique_senders_7d</code> — confirmed transactions on the registered contracts in the last 7 days and the distinct sender principals. Raw counts over the covered period; see <a href="#status">sampled activity</a>.</li>
            <li><code>score_delta_7d</code> — overall score minus the score recorded 7 days earlier (null until history exists).</li>
            <li><code>components[].factors[]</code> — the exact inputs behind each component score: label, observed value, mapped 0–100 score and weight within the component.</li>
            <li><code>effective_weights</code> — the weights actually applied after redistributing non-applicable components.</li>
            <li><code>dataQuality</code> (<code>/v1/snapshot</code> only) — excluded TVL outlier points with a note, whether activity was sampled, and fetch warnings.</li>
            <li><code>staking</code> (<code>/v1/snapshot</code> only) — informational Bitcoin Staking block; see <a href="#staking">Bitcoin Staking</a>.</li>
          </ul>
        </div>

        <div id="integration" className="endpoint">
          <h2 style={h2}>Integration example</h2>
          <pre className="code-block">{`const res = await fetch(\`\${API}/v1/protocol-risk?protocol=stackingdao\`);
const { protocols: [p] } = await res.json();

if (p.band === 'High' || p.band === 'Elevated') {
  showWarning(\`\${p.name}: risk score \${p.overall_score} (\${p.band})\`);
}`}</pre>
          <p style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>
            Source, methodology and the protocol registry live in the public repository at{' '}
            <a href="https://github.com/zkzora/Bicora" target="_blank" rel="noreferrer">github.com/zkzora/Bicora</a>. Contributions that add a protocol must cite public sources for every transparency field.
          </p>
        </div>

        <div id="planned" className="endpoint prose">
          <h2 style={h2}>Planned</h2>
          <p>Not implemented. None of these exist in the API or the pipeline today.</p>
          <ul>
            <li><span className="tag tag-outline">Planned</span> Bicora-calculated protocol TVL from on-chain balances, as a parallel comparison to DefiLlama (not a scoring input).</li>
            <li><span className="tag tag-outline">Planned</span> Hosted public API at api.bicora.xyz, with API keys and rate limits.</li>
            <li><span className="tag tag-outline">Planned</span> Alert delivery by webhook and Telegram.</li>
            <li><span className="tag tag-outline">Planned</span> Protocol-level and wallet-level exposure metrics.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
