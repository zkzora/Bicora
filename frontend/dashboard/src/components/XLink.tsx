export const X_URL = 'https://x.com/bicora_';
export const X_HANDLE = '@bicora_';

/** X (Twitter) logo glyph. */
export function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/** Icon button linking to Bicora on X. */
export default function XLink() {
  return (
    <a href={X_URL} target="_blank" rel="noreferrer" className="icon-link" aria-label={`Bicora on X (${X_HANDLE})`} title={`${X_HANDLE} on X`}>
      <XIcon />
    </a>
  );
}
