import type { Metadata } from 'next';
import Link from 'next/link';
import { getSnapshot } from '@/lib/data';
import { BandTag } from '@/components/ui';
import ProtocolLogo from '@/components/ProtocolLogo';
import { dash } from '@/lib/urls';

export const metadata: Metadata = { title: 'Wallet exposure' };

export default async function WalletPage() {
  const { snapshot } = await getSnapshot();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 860 }}>
      <div>
        <p style={{ color: 'var(--color-neutral-600)', fontSize: 12 }}>
          Understand portfolio exposure across tracked protocols. The system provides analytics, not financial advice.
        </p>
      </div>
      <form style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} aria-disabled>
        <input className="input mono" placeholder="Paste a Stacks address (SP…)" style={{ flex: 1, minWidth: 240 }} disabled />
        <button type="button" className="btn btn-primary" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>Analyze</button>
      </form>
      <div className="empty">
        <b style={{ color: 'var(--color-text)' }}>Coming soon.</b> Wallet exposure will map a principal&apos;s token balances and positions to the tracked protocols and combine them with the protocol scores below into asset distribution, protocol exposure, risk concentration and a portfolio health indicator. 
      </div>
      <div className="card">
        <span className="k k-ink">Protocol scores that will feed portfolio health</span>
        <table className="table">
          <thead><tr><th>Protocol</th><th>Category</th><th>Score</th></tr></thead>
          <tbody>
            {snapshot.protocols.map((p) => (
              <tr key={p.slug} className="row">
                <td style={{ fontWeight: 600 }}><Link href={dash(`/protocols/${p.slug}`)} style={{ color: 'var(--color-text)', display: 'inline-flex', alignItems: 'center', gap: 8 }}><ProtocolLogo slug={p.slug} name={p.name} size={20} radius={4} />{p.name}</Link></td>
                <td className="caps muted">{p.category}</td>
                <td><BandTag band={p.score.band} score={p.score.overall} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
