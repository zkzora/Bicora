import Image from 'next/image';

const FILES: Record<string, string> = {
  alex: '/protocols/alex.jpg',
  bitflow: '/protocols/bitflow.jpg',
  granite: '/protocols/granite.png',
  stackingdao: '/protocols/stackingdao.jpg',
  zest: '/protocols/zest.jpg',
};

/** Square protocol mark; falls back to an initial on the ink tile when no logo file is registered. */
export default function ProtocolLogo({ slug, name, size = 40, radius = 6 }: { slug: string; name: string; size?: number; radius?: number }) {
  const src = FILES[slug];
  const style = { width: size, height: size, borderRadius: radius, flex: 'none' as const, overflow: 'hidden' as const };
  if (!src) {
    return (
      <div style={{ ...style, background: 'var(--ink)', display: 'grid', placeItems: 'center', color: 'var(--color-accent)', fontWeight: 700, fontSize: size * 0.4 }} aria-hidden>
        {name[0]}
      </div>
    );
  }
  return (
    <Image src={src} alt={`${name} logo`} width={size} height={size} style={{ ...style, display: 'block', objectFit: 'cover', border: '1px solid var(--color-rule)' }} />
  );
}
