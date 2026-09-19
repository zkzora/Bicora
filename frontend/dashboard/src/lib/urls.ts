/**
 * URL helpers for the split-domain deployment.
 *
 *   NEXT_PUBLIC_MODE=site  -> this build serves the marketing site (bicora.xyz); dashboard links are absolute to the app.
 *   NEXT_PUBLIC_MODE=app   -> this build serves the dashboard at the root (app.bicora.xyz); site links are absolute.
 *   unset                  -> single origin (dev / preview): dashboard lives under /dashboard.
 *
 * Route files stay under app/dashboard; next.config rewrites map the clean app paths onto them.
 */
export const MODE = (process.env.NEXT_PUBLIC_MODE ?? 'single') as 'site' | 'app' | 'single';
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bicora.xyz').replace(/\/$/, '');
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.bicora.xyz').replace(/\/$/, '');

/** Dashboard link. `p` is the path inside the dashboard, e.g. '/', '/protocols/zest', '/alerts'. */
export function dash(p: string = '/'): string {
  const sub = p === '/' ? '' : p;
  if (MODE === 'app') return sub || '/';
  if (MODE === 'site') return `${APP_URL}${sub}`;
  return `/dashboard${sub}`;
}

/** Marketing-site link, e.g. '/', '/methodology', '/docs#running'. */
export function site(p: string = '/'): string {
  if (MODE === 'app') return `${SITE_URL}${p === '/' ? '' : p}` || SITE_URL;
  return p;
}

/** Canonical origin of this build, for metadata. */
export const ORIGIN = MODE === 'app' ? APP_URL : SITE_URL;

/** Whether a pathname (as seen by usePathname) is the dashboard overview. */
export const isDashHome = (pathname: string) => pathname === dash('/');
