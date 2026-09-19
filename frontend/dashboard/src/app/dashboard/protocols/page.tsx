import type { Metadata } from 'next';
import { getSnapshot } from '@/lib/data';
import { ProtocolRiskCard } from '@/components/cards';
import { ProtocolTable } from '@/components/ui';

export const metadata: Metadata = { title: 'Protocol risk' };

export default async function ProtocolsIndex() {
  const { snapshot } = await getSnapshot();
  const sampled = snapshot.protocols.some((p) => p.metrics.activitySampled);
  return (
    <>
      <div>
        <div className="section-head">
          <span className="k k-ink">Tracked protocols</span>
          <span className="sub">{snapshot.protocols.length} protocols · scores 0–100, higher is safer · sorted by overall score</span>
        </div>
        <div className="pcards">
          {snapshot.protocols.map((p, i) => (<ProtocolRiskCard key={p.slug} p={p} delay={i * 40} />))}
        </div>
      </div>
      <div>
        <div className="section-head">
          <span className="k k-ink">Full comparison</span>
          <span className="sub">Every component side by side{sampled ? ' · * extrapolated activity' : ''}</span>
        </div>
        <div className="card" style={{ padding: 0 }}>
          <ProtocolTable protocols={snapshot.protocols} />
        </div>
      </div>
    </>
  );
}
