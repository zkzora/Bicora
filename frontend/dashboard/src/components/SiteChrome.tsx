'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/docs', label: 'Docs' },
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
      <Link href="/dashboard" className="navlink">Risk Index</Link>
      <ThemeToggle />
      <Link href="/dashboard" className="btn btn-primary">Dashboard</Link>
    </nav>
  );
}
