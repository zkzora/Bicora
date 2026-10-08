import type { SnapshotProtocol } from '@/lib/types';
import { COVERAGE } from '@/lib/coverage';
import { fmtDateTime, fmtUsd } from '@/lib/format';
import { MetricCard } from '@/components/cards';

const NA = ({ why }: { why?: string }) => <span style={{ color: 'var(--color-muted)' }} title={why}>N/A</span>;

/**
 * TVL vs gross supplied vs borrowed vs withdrawable, for one protocol. Only TVL · DefiLlama feeds the score;
 * the rest is context with its derivation and coverage stated, never summed with TVL.
 */
export default function TvlBreakdown({ p, snapshotAt }: { p: SnapshotProtocol; snapshotAt: string }) {
  const m = p.metrics;
  const cov = COVERAGE[p.slug];
  const lending = p.hasCollateral;
  const gross = m.borrowedUsd != null ? m.tvlUsd + m.borrowedUsd : null;

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-head">
        <div>
          <div className="card-title">TVL, supply &amp; liquidity</div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>Different measures, never added together. Only TVL · DefiLlama feeds the score.</div>
        </div>
        {cov ? <span className="tag tag-neutral">Adapter reviewed {cov.reviewedAt}</span> : <span className="tag tag-outline">Coverage not reviewed · partial</span>}
      </div>
      <div className="dash-secondary">
        <MetricCard label="TVL · DefiLlama" value={fmtUsd(m.tvlUsd)} sub="Stacks chain · excludes borrowed · scored" />
        <MetricCard
          label="Borrowed · DefiLlama"
          value={m.borrowedUsd != null ? fmtUsd(m.borrowedUsd) : <NA />}
          sub={m.borrowedUsd != null ? 'outstanding loans · not in TVL' : lending ? 'adapter reports no borrowing' : 'not a lending protocol'}
          delay={30}
        />
        <MetricCard
          label="Gross supplied · estimate"
          value={gross != null ? fmtUsd(gross) : <NA />}
          sub={gross != null ? 'TVL + borrowed · not an official total' : 'needs borrowed value'}
          delay={60}
        />
        <MetricCard label="Withdrawable now" value={<NA why={cov?.withdrawable} />} sub="not reported by DefiLlama · TVL is not all withdrawable" delay={90} />
        <MetricCard
          label="Official reported total"
          value={cov?.official.status === 'shown' ? fmtUsd(cov.official.value) : <NA />}
          sub={cov?.official.status === 'shown' ? `${cov.official.covers} · ${fmtDateTime(cov.official.asOf)}` : 'no reliable timestamped source'}
          delay={120}
        />
      </div>

      <p className="muted" style={{ fontSize: 11.5, lineHeight: 1.6, marginTop: 12 }}>
        Source: DefiLlama. Fetched by Bicora {m.tvlFetchedAt ? fmtDateTime(m.tvlFetchedAt) : 'N/A (recorded from the next refresh)'} · latest DefiLlama data point {m.tvlAsOf ? fmtDateTime(m.tvlAsOf) : 'N/A'} · snapshot {fmtDateTime(snapshotAt)}.
        {gross != null && <> Utilisation uses the same estimate: borrowed ÷ (TVL + borrowed).</>}
      </p>

      {cov ? (
        <div style={{ borderTop: '1px solid var(--color-rule)', marginTop: 14, paddingTop: 14, display: 'grid', gap: 12, fontSize: 12.5, lineHeight: 1.6 }}>
          <div><b>TVL counts</b><ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{cov.tvlCovers.map((t) => <li key={t}>{t}</li>)}</ul></div>
          <div><b>TVL leaves out</b><ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{cov.tvlExcludes.map((t) => <li key={t}>{t}</li>)}</ul></div>
          {cov.borrowed && <div><b>Borrowed.</b> {cov.borrowed}</div>}
          {cov.grossSuppliedCaveat && <div><b>Gross supplied is an estimate.</b> {cov.grossSuppliedCaveat}</div>}
          <div><b>Withdrawable now.</b> {cov.withdrawable}</div>
          {cov.official.status === 'na' && <div><b>Official total.</b> N/A. {cov.official.reason}</div>}
          <div>
            <b>Differences from other figures</b>
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
              {cov.differences.map((d) => (
                <li key={d.text}><span className={`tag ${d.status === 'verified' ? 'tag-neutral' : 'tag-watch'}`} style={{ marginRight: 6 }}>{d.status}</span>{d.text}</li>
              ))}
            </ul>
          </div>
          <div className="muted" style={{ fontSize: 11.5 }}>Adapter source: <a href={cov.adapter.url} target="_blank" rel="noreferrer">{cov.adapter.label} ↗</a></div>
        </div>
      ) : (
        <p className="muted" style={{ fontSize: 11.5, lineHeight: 1.6, marginTop: 8 }}>
          Bicora has not yet reviewed which contracts and products DefiLlama&rsquo;s adapter covers for {p.name}, so coverage is partial and unverified. Withdrawable liquidity and official totals are N/A.
        </p>
      )}
    </div>
  );
}
