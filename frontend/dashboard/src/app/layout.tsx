import type { Metadata } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const heading = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-heading', display: 'swap' });
const body = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'BTCFi Risk Layer', template: '%s · BTCFi Risk Layer' },
  description: 'Transparent risk analytics infrastructure for Bitcoin DeFi applications built on Stacks.',
};

// Runs before first paint so a saved theme never flashes the wrong colours.
const themeInit = `(function(){try{var t=localStorage.getItem('btcfi-theme');var r=document.documentElement;if(t==='dark'||t==='light'){r.setAttribute('data-theme',t)}else if(window.matchMedia('(prefers-color-scheme: dark)').matches){r.classList.add('sys-dark')}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
