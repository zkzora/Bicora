import type { NextConfig } from 'next';

const MODE = process.env.NEXT_PUBLIC_MODE; // 'site' | 'app' | undefined (single origin)
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.bicora.xyz').replace(/\/$/, '');
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bicora.xyz').replace(/\/$/, '');

// Paths that are NOT dashboard pages on the app host: Next internals, metadata files and static assets.
// Custom param pattern: anything except /dashboard itself, Next internals, API routes and files with an extension.
const NOT_APP_PAGE = '((?!dashboard(?:/|$)|_next/|api/|.*\\..*).*)';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },

  async rewrites() {
    if (MODE !== 'app') return [];
    // app.bicora.xyz/            -> /dashboard
    // app.bicora.xyz/protocols/x -> /dashboard/protocols/x
    return {
      beforeFiles: [
        { source: '/', destination: '/dashboard' },
        { source: `/:path${NOT_APP_PAGE}`, destination: '/dashboard/:path' },
      ],
      afterFiles: [],
      fallback: [],
    };
  },

  async redirects() {
    if (MODE === 'app') {
      // Canonicalise legacy /dashboard/... URLs on the app host.
      return [
        { source: '/dashboard', destination: '/', permanent: true },
        { source: '/dashboard/:path*', destination: '/:path*', permanent: true },
        // Marketing pages live on the site host.
        { source: '/methodology', destination: `${SITE_URL}/methodology`, permanent: true },
        { source: '/docs', destination: `${SITE_URL}/docs`, permanent: true },
      ];
    }
    if (MODE === 'site') {
      // The site host hands dashboard URLs over to the app host.
      return [
        { source: '/dashboard', destination: `${APP_URL}/`, permanent: true },
        { source: '/dashboard/:path*', destination: `${APP_URL}/:path*`, permanent: true },
      ];
    }
    return [];
  },
};

export default nextConfig;
