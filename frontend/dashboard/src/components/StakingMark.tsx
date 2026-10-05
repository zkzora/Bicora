import Image from 'next/image';

/** Official Stacks mark for the Bitcoin Staking entry, styled like a ProtocolLogo square. */
export default function StakingMark({ size = 40, radius = 6 }: { size?: number; radius?: number }) {
  return (
    <Image
      src="/protocols/stacks.jpg"
      alt="Stacks logo"
      width={size}
      height={size}
      style={{ width: size, height: size, borderRadius: radius, flex: 'none', display: 'block', objectFit: 'cover', border: '1px solid var(--color-rule)' }}
    />
  );
}
