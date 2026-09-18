'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { fmtDateTime } from '@/lib/format';
import ProtocolLogo from './ProtocolLogo';
import ThemeToggle from './ThemeToggle';

interface Props {
  children: React.ReactNode;
  generatedAt: string;
  methodologyVersion: string;
  source: 'api' | 'snapshot';
  protocols: { slug: string; name: string }[];
}

const NAV = [
  { href: '/dashboard', label: 'Overview', exact: true },
  { href: '/dashboard/protocols', label: 'Protocol Risk' },
  { href: '/dashboard/market', label: 'Market Metrics' },
  { href: '/dashboard/alerts', label: 'Alerts' },
];
const PHASE2 = [{ label: 'Wallet Exposure', href: '/dashboard/wallet', exact: false }];

const TITLES: [RegExp, string][] = [
  [/^\/dashboard$/, 'Ecosystem overview'],
  [/^\/dashboard\/protocols/, 'Protocol risk'],
  [/^\/dashboard\/market/, 'Market metrics'],
  [/^\/dashboard\/alerts/, 'Risk alerts'],
  [/^\/dashboard\/wallet/, 'Wallet exposure'],
];

export default function AppShell({ children, generatedAt, methodologyVersion, source, protocols }: Props) {
  const path = usePathname();
  const isActive = (href: string, exact?: boolean) => (exact ? path === href : path.startsWith(href));
  const title = TITLES.find(([re]) => re.test(path))?.[1] ?? 'Dashboard';
  const crumbProtocol = path.match(/^\/dashboard\/protocols\/([^/]+)/)?.[1];
  const crumbName = protocols.find((p) => p.slug === crumbProtocol)?.name;

  return (
    <div className="app">
      <aside className="app-side">
        <Link href="/" className="brand" aria-label="BTCFi site">
          <Image src="/btcfi-logo.png" alt="BTCFi" width={80} height={20} style={{ height: 20, width: 'auto' }} />
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
          <Link key={p.slug} href={`/dashboard/protocols/${p.slug}`} className="item" aria-current={path === `/dashboard/protocols/${p.slug}` ? 'page' : undefined} style={{ justifyContent: 'flex-start' }}><ProtocolLogo slug={p.slug} name={p.name} size={18} radius={4} />{p.name}</Link>
        ))}
        <div className="group">Reference</div>
        <Link href="/methodology" className="item">Methodology</Link>
        <Link href="/docs" className="item">API documentation</Link>
        <button type="button" className="item" onClick={() => window.dispatchEvent(new Event('btcfi:tour'))}>Replay the guide</button>
        <div data-tour="theme" style={{ display: 'flex' }}><ThemeToggle /></div>
        <div className="foot">
          Data as of<br />
          <b style={{ color: 'rgba(248,244,238,.85)' }}>{fmtDateTime(generatedAt)}</b>
          <br />
          Methodology v{methodologyVersion} · {source === 'api' ? 'live API' : 'committed snapshot'}
          <br />
          <Link href="/">← Back to site</Link>
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
