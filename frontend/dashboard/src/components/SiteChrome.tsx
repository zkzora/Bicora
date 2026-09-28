'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import XLink, { XIcon, X_HANDLE, X_URL } from './XLink';
import { MenuIcon } from './MenuIcon';
import { dash } from '@/lib/urls';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/docs', label: 'Docs' },
  { href: '/pro', label: 'Pro' },
];

export function SiteNav() {
  const path = usePathname();
  const navRef = useRef<HTMLElement>(null);
  // The menu belongs to the page it was opened on, so navigating closes it.
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const open = menuPath === path;
  const close = () => setMenuPath(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuPath(null);
    const onDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setMenuPath(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  return (
    <nav className="site-nav" ref={navRef}>
      <Link href="/" className="brand" aria-label="Bicora home">
        <Image src="/bicora-logo.png" alt="Bicora" width={96} height={24} priority style={{ height: 24, width: 'auto' }} />
      </Link>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="navlink" aria-current={path === l.href ? 'page' : undefined}>{l.label}</Link>
      ))}
      <Link href={dash('/')} className="navlink">Risk Index</Link>
      <XLink />
      <ThemeToggle />
      <Link href={dash('/')} className="btn btn-primary">Dashboard</Link>
      <button type="button" className="icon-link menu-btn" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="site-menu" onClick={() => (open ? close() : setMenuPath(path))}>
        <MenuIcon open={open} />
      </button>
      {open && (
        <div className="site-menu" id="site-menu">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={path === l.href ? 'page' : undefined} onClick={close}>{l.label}</Link>
          ))}
          <div className="site-menu-foot">
            <a href={X_URL} target="_blank" rel="noreferrer"><XIcon size={13} /> {X_HANDLE}</a>
            <ThemeToggle />
          </div>
        </div>
      )}
    </nav>
  );
}
