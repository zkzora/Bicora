import type { Metadata } from 'next';
import { getSnapshot } from '@/lib/data';
import { AlertCard, ChartCard } from '@/components/cards';

export const metadata: Metadata = { title: 'Risk alerts' };

const RULES: [string, string][] = [
  ['Score', 'Overall score moves ≥ 3 points between runs (High impact at ≥ 8).'],
  ['Liquidity', 'TVL moves ≥ 10% in 24h (High at ≥ 25%), or ≥ 15% over 7 days (High at ≥ 35%).'],
  ['Collateral', 'Utilisation crosses 80% (Medium) or 90% (High).'],
  ['Activity', 'Weekly transactions swing ≥ 40% vs the prior week; success rate below 85%.'],
  ['Transparency', 'A registered contract is not found on-chain (registry drift).'],
];

export default async function AlertsPage() {
  const { snapshot } = await getSnapshot();
  const names = Object.fromEntries(snapshot.protocols.map((p) => [p.slug, p.name]));
  const counts = { High: 0, Medium: 0, Low: 0 };
  for (const e of snapshot.events) counts[e.impact ?? (e.severity === 'alert' ? 'High' : e.severity === 'watch' ? 'Medium' : 'Low')]++;

  return (
    <div className="dash-tertiary">
      <div>
        <div className="section-head">
          <span className="k k-ink">Detected risk events · last 30 days</span>
          <span style={{ display: 'flex', gap: 6 }}>
            <span className="tag tag-alert">{counts.High} high</span>
            <span className="tag tag-watch">{counts.Medium} medium</span>
            <span className="tag tag-info">{counts.Low} low</span>
          </span>
        </div>
        {snapshot.events.length ? (
          <div className="acards">{snapshot.events.map((e) => (<AlertCard key={e.id} e={e} name={names[e.slug] ?? e.slug} />))}</div>
        ) : (
          <div className="empty">No risk events detected in the last 30 days. Events appear when TVL, utilisation, activity or scores cross documented thresholds.</div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <ChartCard title="Detection rules" sub="Fixed thresholds, evaluated on every scoring run">
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 12.5 }}>
            {RULES.map(([k, r]) => (
              <div key={k} style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: 10, padding: '9px 0', borderTop: '1px solid var(--color-rule)' }}>
                <span className="tag tag-outline" style={{ alignSelf: 'start' }}>{k}</span>
                <span style={{ color: 'var(--color-text-2)' }}>{r}</span>
              </div>
            ))}
          </div>
        </ChartCard>
        <ChartCard title="Impact levels" sub="Derived from the size of the move">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5, color: 'var(--color-text-2)' }}>
            <div><span className="tag tag-alert">High</span> &nbsp;large move or threshold breach — review exposure</div>
            <div><span className="tag tag-watch">Medium</span> &nbsp;notable change — worth watching</div>
            <div><span className="tag tag-info">Low</span> &nbsp;informational</div>
          </div>
        </ChartCard>
        <div className="note-box">
          Events are deduplicated per protocol, day and rule and are available at <code>GET /v1/risk-alerts</code>. Automated delivery (webhooks, e-mail) is coming soon.
        </div>
      </div>
    </div>
  );
}
