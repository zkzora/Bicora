import Link from 'next/link';
import Image from 'next/image';
import { dash } from '@/lib/urls';

interface Props {
  version: string;
  protocols: { slug: string; name: string }[];
}

type Item = { label: string; href: string; external?: boolean };

/** Multi-column link footer. Every entry points to a page, section or data source that exists in v0.1. */
export default function SiteFooter({ version, protocols }: Props) {
  const columns: { title: string; items: Item[] }[] = [
    {
      title: 'Dashboard',
      items: [
        { label: 'Overview', href: dash('/') },
        { label: 'Protocol risk', href: dash('/protocols') },
        { label: 'Market metrics', href: dash('/market') },
        { label: 'Alerts', href: dash('/alerts') },
        { label: 'Wallet exposure', href: dash('/wallet') },
        { label: 'Bicora Pro', href: '/pro' },
      ],
    },
    {
      title: 'Protocols',
      items: protocols.map((p) => ({ label: p.name, href: dash(`/protocols/${p.slug}`) })),
    },
    {
      title: 'Methodology',
      items: [
        { label: 'How scores work', href: '/methodology' },
        { label: 'Risk bands', href: '/methodology#bands' },
        { label: 'Factor definitions', href: '/methodology#factors' },
        { label: 'Data quality rules', href: '/methodology#data-quality' },
        { label: 'Known limitations', href: '/methodology#limitations' },
      ],
    },
    {
      title: 'Developers',
      items: [
        { label: 'API overview', href: '/docs' },
        { label: 'Running the stack', href: '/docs#running' },
        { label: 'Protocol risk endpoint', href: '/docs#protocol-risk' },
        { label: 'Market health endpoint', href: '/docs#market-health' },
        { label: 'Risk alerts endpoint', href: '/docs#risk-alerts' },
        { label: 'Data definitions', href: '/docs#definitions' },
      ],
    },
    {
      title: 'Data sources',
      items: [
        { label: 'Source code', href: 'https://github.com/zkzora/Bicora', external: true },
        { label: 'DefiLlama', href: 'https://defillama.com/chain/Stacks', external: true },
        { label: 'Hiro Stacks API', href: 'https://docs.hiro.so/stacks/api', external: true },
        { label: 'Stacks Explorer', href: 'https://explorer.hiro.so/?chain=mainnet', external: true },
      ],
    },
  ];

  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        {columns.map((c) => (
          <div key={c.title} className="footer-col">
            <h3>{c.title}</h3>
            <ul>
              {c.items.map((it) => (
                <li key={it.href}>
                  {it.external ? (
                    <a href={it.href} target="_blank" rel="noreferrer">{it.label} ↗</a>
                  ) : (
                    <Link href={it.href}>{it.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="wrap footer-bar">
        <Image src="/bicora-logo.png" alt="Bicora" width={64} height={16} style={{ height: 16, width: 'auto' }} />
        <span>Risk intelligence layer for Bitcoin DeFi on Stacks</span>
        <span className="footer-right">
          <span>Methodology v{version}</span>
          <span>Analytics, not financial advice</span>
          <span>© {new Date().getFullYear()} Bicora</span>
        </span>
      </div>
    </footer>
  );
}
