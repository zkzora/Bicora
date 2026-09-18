'use client';

import React from 'react';
import Image from 'next/image';
import { Activity, Database, ShieldCheck } from 'lucide-react';
import ParticleSphereAnimation from '@/components/ui/orbiting-circles-02-utils/particalsphear';

/**
 * Orbiting protocol logos around the BTCFi particle globe.
 * Ported from the Tailwind original to this project's token stylesheet (see .orb-* in globals.css).
 * Inner rings carry the tracked protocols (logos from /public/protocols); the outer ring carries the
 * three data layers the engine reads (indexer, activity, security) as lucide icons.
 */
type OrbitIcon = { alt: string; angle: number; src?: string; icon?: React.ReactNode };

const orbits: { size: 'sm' | 'md' | 'lg'; duration: number; icons: OrbitIcon[] }[] = [
  {
    size: 'sm',
    duration: 18,
    icons: [
      { src: '/protocols/zest.jpg', alt: 'Zest Protocol', angle: -60 },
      { src: '/protocols/stackingdao.jpg', alt: 'StackingDAO', angle: 0 },
      { src: '/protocols/granite.png', alt: 'Granite', angle: 60 },
    ],
  },
  {
    size: 'md',
    duration: 24,
    icons: [
      { src: '/protocols/bitflow.jpg', alt: 'Bitflow', angle: 0 },
      { src: '/protocols/alex.jpg', alt: 'ALEX', angle: -90 },
    ],
  },
  {
    size: 'lg',
    duration: 30,
    icons: [
      { icon: <Database />, alt: 'Indexer', angle: -60 },
      { icon: <Activity />, alt: 'Activity', angle: 0 },
      { icon: <ShieldCheck />, alt: 'Security', angle: 60 },
    ],
  },
];

export default function OrbitingCirclesGlobe() {
  return (
    <div className="orb-wrap">
      {/* Center particle globe */}
      <div className="orb-globe">
        <ParticleSphereAnimation />
      </div>

      {/* Orbiting rings */}
      {orbits.map((orbit, index) => {
        const isCW = index % 2 === 0;
        const orbitAnim = isCW ? 'orb-cw' : 'orb-ccw';
        const counterAnim = isCW ? 'orb-counter-cw' : 'orb-counter-ccw';

        const allIcons = [
          ...orbit.icons,
          ...orbit.icons.map((ic) => ({ ...ic, angle: ic.angle + 180, alt: `${ic.alt}-mirror` })),
        ];

        return (
          <div key={index} className={`orb-ring orb-ring-${orbit.size}`}>
            {allIcons.map((iconData, iconIndex) => (
              <div
                key={iconIndex}
                className="orb-arm"
                style={{ '--start-angle': `${iconData.angle}deg`, animation: `${orbitAnim} ${orbit.duration}s linear infinite` } as React.CSSProperties}
              >
                <div
                  className="orb-chip"
                  style={{ '--counter-offset': `${-iconData.angle}deg`, animation: `${counterAnim} ${orbit.duration}s linear infinite` } as React.CSSProperties}
                >
                  {iconData.src ? (
                    <Image src={iconData.src} alt={iconData.alt.replace('-mirror', '')} width={32} height={32} className="orb-logo" />
                  ) : (
                    <span className="orb-icon" aria-label={iconData.alt.replace('-mirror', '')}>{iconData.icon}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
