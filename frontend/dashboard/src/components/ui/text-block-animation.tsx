'use client';

import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useRef } from 'react';

gsap.registerPlugin(SplitText, ScrollTrigger, useGSAP);

interface Props {
  children: React.ReactNode;
  /** Play when the element scrolls into view (default) or immediately on mount. */
  animateOnScroll?: boolean;
  delay?: number;
  /** Colour of the wipe block; defaults to the brand accent. */
  blockColor?: string;
  stagger?: number;
  duration?: number;
  className?: string;
}

/**
 * Line-by-line block reveal: an accent block wipes across each line, the text appears underneath,
 * the block wipes out. Honours prefers-reduced-motion (text is simply shown).
 */
export default function TextBlockAnimation({
  children,
  animateOnScroll = true,
  delay = 0,
  blockColor = 'var(--color-accent)',
  stagger = 0.1,
  duration = 0.6,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = containerRef.current;
      if (!el) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const split = new SplitText(el, { type: 'lines', linesClass: 'block-line' });
      const lines = split.lines as HTMLElement[];
      const blocks: HTMLDivElement[] = [];

      for (const line of lines) {
        // Shrink the wrapper to the line's text so the block wipes exactly the words, not the column.
        const align = getComputedStyle(line.parentElement ?? el).textAlign;
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.display = 'block';
        wrapper.style.overflow = 'hidden';
        wrapper.style.width = 'fit-content';
        wrapper.style.maxWidth = '100%';
        if (align === 'center') wrapper.style.marginInline = 'auto';
        else if (align === 'right' || align === 'end') wrapper.style.marginInlineStart = 'auto';

        const block = document.createElement('div');
        Object.assign(block.style, {
          position: 'absolute',
          inset: '0',
          backgroundColor: blockColor,
          zIndex: '2',
          transform: 'scaleX(0)',
          transformOrigin: 'left center',
          pointerEvents: 'none',
        });

        line.parentNode?.insertBefore(wrapper, line);
        wrapper.appendChild(line);
        wrapper.appendChild(block);
        gsap.set(line, { opacity: 0 });
        blocks.push(block);
      }

      const tl = gsap.timeline({
        defaults: { ease: 'expo.inOut' },
        delay,
        scrollTrigger: animateOnScroll
          ? { trigger: el, start: 'top 85%', toggleActions: 'play none none none' }
          : undefined,
      });

      tl.to(blocks, { scaleX: 1, duration, stagger, transformOrigin: 'left center' })
        .set(lines, { opacity: 1, stagger }, `<${duration / 2}`)
        .to(blocks, { scaleX: 0, duration, stagger, transformOrigin: 'right center' }, `<${duration * 0.4}`);

      return () => {
        tl.scrollTrigger?.kill();
        tl.kill();
        split.revert();
      };
    },
    { scope: containerRef, dependencies: [animateOnScroll, delay, blockColor, stagger, duration] },
  );

  return (
    <div ref={containerRef} className={className} style={{ position: 'relative' }}>
      {children}
    </div>
  );
}
