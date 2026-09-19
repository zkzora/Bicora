'use client';
import { useEffect, useState } from 'react';
import { applyTheme, readTheme, writeTheme, type Theme } from '@/lib/theme';

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
    // Re-read on mount and re-apply: the stored preference wins over whatever the DOM currently shows.
    const t = readTheme();
    setTheme(t);
    applyTheme(t);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (readTheme() === 'system') applyTheme('system');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const choose = (t: Theme) => {
    setTheme(t);
    applyTheme(t);
    writeTheme(t);
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
