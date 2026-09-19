/**
 * Theme preference persistence shared across bicora.xyz and app.bicora.xyz.
 * A cookie on the registrable domain (.bicora.xyz) is the source of truth so both hosts agree;
 * localStorage is a fallback for hosts where a shared cookie is impossible (localhost, *.vercel.app).
 * Keep in sync with the inline init script in app/layout.tsx.
 */
export type Theme = 'light' | 'dark' | 'system';
export const THEME_KEY = 'bicora-theme';

function cookieDomain(): string | null {
  const h = location.hostname;
  if (h === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(h) || h.endsWith('.vercel.app')) return null;
  const parts = h.split('.');
  return parts.length >= 2 ? '.' + parts.slice(-2).join('.') : null;
}

export function readTheme(): Theme {
  try {
    const m = document.cookie.match(new RegExp('(?:^|; )' + THEME_KEY + '=(light|dark|system)'));
    if (m) return m[1] as Theme;
    const s = localStorage.getItem(THEME_KEY);
    if (s === 'light' || s === 'dark') return s;
  } catch {
    /* storage unavailable */
  }
  return 'system';
}

export function writeTheme(t: Theme) {
  try {
    const d = cookieDomain();
    document.cookie = `${THEME_KEY}=${t}; path=/; max-age=31536000; SameSite=Lax${d ? `; domain=${d}` : ''}${location.protocol === 'https:' ? '; Secure' : ''}`;
    if (t === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, t);
  } catch {
    /* ignore */
  }
}

/** Applies the choice to <html>: data-theme for explicit choices, a .sys-dark class when following the OS. */
export function applyTheme(t: Theme) {
  const root = document.documentElement;
  if (t === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t);
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  // Dark is the default palette; .sys-light applies the light palette when following a light OS.
  root.classList.toggle('sys-light', t === 'system' && !dark);
  root.classList.remove('sys-dark');
}
