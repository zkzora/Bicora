'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { fmtDateTime } from '@/lib/format';
import ProtocolLogo from './ProtocolLogo';
import ThemeToggle from './ThemeToggle';
import { dash, site } from '@/lib/urls';

interface Props {
  children: React.ReactNode;
  generatedAt: string;
  methodologyVersion: string;
  source: 'api' | 'snapshot';
  protocols: { slug: string; name: string }[];
}

const NAV = [
  { href: dash('/'), label: 'Overview', exact: true },
  { href: dash('/protocols'), label: 'Protocol Risk' },
  { href: dash('/market'), label: 'Market Metrics' },
  { href: dash('/alerts'), label: 'Alerts' },
];
const PHASE2 = [{ label: 'Wallet Exposure', href: dash('/wallet'), exact: false }];

const TITLES: [string, string][] = [
  [dash('/'), 'Ecosystem overview'],
  [dash('/protocols'), 'Protocol risk'],
  [dash('/market'), 'Market metrics'],
  [dash('/alerts'), 'Risk alerts'],
  [dash('/wallet'), 'Wallet exposure'],
];

export default function AppShell({ children, generatedAt, methodologyVersion, source, protocols }: Props) {
  const path = usePathname();
  const isActive = (href: string, exact?: boolean) => (exact ? path === href : path.startsWith(href));
  const title = TITLES.find(([p]) => (p === dash('/') ? path === p : path.startsWith(p)))?.[1] ?? 'Dashboard';
  const crumbProtocol = path.startsWith(dash('/protocols') + '/') ? path.slice(dash('/protocols').length + 1).split('/')[0] : undefined;
  const crumbName = protocols.find((p) => p.slug === crumbProtocol)?.name;

  return (
    <div className="app">
      <aside className="app-side">
        <Link href={site('/')} className="brand" aria-label="Bicora site">
          <Image src="/bicora-logo.png" alt="Bicora" width={80} height={20} style={{ height: 20, width: 'auto' }} />
          <span>Risk Layer</span>
        </Link>
        <div className="group">Dashboard</div>
        <div data-tour="nav" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="item" aria-current={isActive(n.href, n.exact) ? 'page' : undefined}>{n.label}</Link>
        ))}
        {PHASE2.map((n) => (
          <Link key={n.href} href={n.href} className="item" aria-current={isActive(n.href) ? 'page' : undefined}>
            {n.label}
            <span className="tag tag-outline" style={{ color: 'rgba(248,244,238,.6)', borderColor: 'rgba(248,244,238,.25)' }}>Coming soon</span>
          </Link>
        ))}
        </div>
        <div className="group">Tracked protocols</div>
        {protocols.map((p) => (
          <Link key={p.slug} href={dash(`/protocols/${p.slug}`)} className="item" aria-current={path === dash(`/protocols/${p.slug}`) ? 'page' : undefined} style={{ justifyContent: 'flex-start' }}><ProtocolLogo slug={p.slug} name={p.name} size={18} radius={4} />{p.name}</Link>
        ))}
        <div className="group">Reference</div>
        <Link href={site('/methodology')} className="item">Methodology</Link>
        <Link href={site('/docs')} className="item">API documentation</Link>
        <button type="button" className="item" onClick={() => window.dispatchEvent(new Event('btcfi:tour'))}>Replay the guide</button>
        <div data-tour="theme" style={{ display: 'flex' }}><ThemeToggle /></div>
        <div className="foot">
          Data as of<br />
          <b style={{ color: 'rgba(248,244,238,.85)' }}>{fmtDateTime(generatedAt)}</b>
          <br />
          Methodology v{methodologyVersion} · {source === 'api' ? 'live API' : 'committed snapshot'}
          <br />
          <Link href={site('/')}>← Back to site</Link>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-top">
          <div>
            <div className="crumb">Risk index{crumbName ? ` / Protocols / ${crumbName}` : ''}</div>
            <h1>{crumbName ?? title}</h1>
          </div>
          <div className="meta">
            <span className="live">Stacks mainnet</span>
            <span>Updated {fmtDateTime(generatedAt)}</span>
            <span className="tag tag-outline">0–100 · higher is safer</span>
          </div>
        </header>
        <nav className="app-mobile-nav" aria-label="Dashboard sections">
          {[...NAV, ...PHASE2].map((n) => (
            <Link key={n.href} href={n.href} aria-current={isActive(n.href, n.exact) ? 'page' : undefined}>{n.label}</Link>
          ))}
        </nav>
        <main className="app-body page" key={path}>{children}</main>
      </div>
    </div>
  );
}
