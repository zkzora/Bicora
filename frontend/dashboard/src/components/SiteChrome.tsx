'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import { dash } from '@/lib/urls';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/docs', label: 'Docs' },
  { href: '/pro', label: 'Pro' },
];

export function SiteNav() {
  const path = usePathname();
  return (
    <nav className="site-nav">
      <Link href="/" className="brand" aria-label="Bicora home">
        <Image src="/bicora-logo.png" alt="Bicora" width={96} height={24} priority style={{ height: 24, width: 'auto' }} />
      </Link>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="navlink" aria-current={path === l.href ? 'page' : undefined}>{l.label}</Link>
      ))}
      <Link href={dash('/')} className="navlink">Risk Index</Link>
      <ThemeToggle />
      <Link href={dash('/')} className="btn btn-primary">Dashboard</Link>
    </nav>
  );
}
