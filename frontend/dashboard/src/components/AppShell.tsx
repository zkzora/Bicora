'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { fmtDateTime } from '@/lib/format';
import ProtocolLogo from './ProtocolLogo';
import ThemeToggle from './ThemeToggle';
import PriceTicker from './PriceTicker';
import { MenuIcon } from './MenuIcon';
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
  // Mobile drawer: tied to the page it was opened on, so any navigation closes it.
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const open = menuPath === path;
  const close = () => setMenuPath(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuPath(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const replayGuide = () => {
    close();
    // Let the drawer close first so the guide measures the page as it normally looks.
    setTimeout(() => window.dispatchEvent(new Event('bicora:tour')), 0);
  };

  return (
    <div className={open ? 'app nav-open' : 'app'}>
      <aside className="app-side" id="app-side" aria-label="Dashboard navigation" onClick={(e) => (e.target as HTMLElement).closest('a') && close()}>
        <button type="button" className="icon-link side-close" aria-label="Close menu" onClick={close}><MenuIcon open /></button>
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
            <span className="tag tag-outline" style={{ color: 'var(--side-muted)', borderColor: 'var(--side-control)' }}>Coming soon</span>
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
        <button type="button" className="item" onClick={replayGuide}>Replay the guide</button>
        <div data-tour="theme" style={{ display: 'flex' }}><ThemeToggle /></div>
        <div className="foot">
          Data as of<br />
          <b style={{ color: 'var(--side-fg)' }}>{fmtDateTime(generatedAt)}</b>
          <br />
          Methodology v{methodologyVersion} · {source === 'api' ? 'live API' : 'committed snapshot'}
          <br />
          <Link href={site('/')}>← Back to site</Link>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-top">
          <Link href={site('/')} className="top-brand" aria-label="Bicora site">
            <Image src="/bicora-logo.png" alt="Bicora" width={72} height={18} style={{ height: 18, width: 'auto' }} />
          </Link>
          <div className="top-title">
            <div className="crumb">Risk index{crumbName ? ` / Protocols / ${crumbName}` : ''}</div>
            <h1>{crumbName ?? title}</h1>
          </div>
          <div className="meta">
            <PriceTicker />
            <span>Stacks mainnet · {fmtDateTime(generatedAt)}</span>
          </div>
          <button type="button" className="icon-link menu-btn" aria-label="Open menu" aria-expanded={open} aria-controls="app-side" onClick={() => setMenuPath(path)}>
            <MenuIcon />
          </button>
        </header>
        <main className="app-body page" key={path}>{children}</main>
      </div>
      {open && <button type="button" className="app-scrim" aria-label="Close menu" onClick={close} />}
    </div>
  );
}
