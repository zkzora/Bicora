'use client';
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';
const KEY = 'btcfi-theme';

/** Applies the choice to <html>: data-theme for explicit choices, a .sys-dark class when following the OS. */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.classList.toggle('sys-dark', theme === 'system' && dark);
}

const ICONS: Record<Theme, React.ReactNode> = {
  light: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  system: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" />
    </svg>
  ),
  dark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  ),
};

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY) as Theme | null;
      if (saved === 'light' || saved === 'dark') setTheme(saved);
    } catch { /* storage unavailable */ }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => { try { if (!localStorage.getItem(KEY)) applyTheme('system'); } catch { applyTheme('system'); } };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const choose = (t: Theme) => {
    setTheme(t);
    applyTheme(t);
    try {
      if (t === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, t);
    } catch { /* ignore */ }
  };

  return (
    <div className="theme-toggle" role="group" aria-label="Colour theme">
      {(['light', 'system', 'dark'] as Theme[]).map((t) => (
        <button key={t} type="button" aria-pressed={theme === t} title={`${t[0].toUpperCase()}${t.slice(1)} theme`} onClick={() => choose(t)}>
          {ICONS[t]}
        </button>
      ))}
    </div>
  );
}
