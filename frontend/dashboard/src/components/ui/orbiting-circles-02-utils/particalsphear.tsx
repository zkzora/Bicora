'use client';
import { useEffect, useRef } from 'react';

const POINTS = 900;

/**
 * Rotating particle sphere on a canvas. Colours are read from the CSS tokens
 * (--color-accent, --color-text) so the globe follows light / dark mode.
 */
export default function ParticleSphereAnimation() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fibonacci sphere: evenly spread points.
    const pts = Array.from({ length: POINTS }, (_, i) => {
      const y = 1 - (i / (POINTS - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const t = i * 2.399963;
      return { x: Math.cos(t) * r, y, z: Math.sin(t) * r };
    });

    let raf = 0;
    let angle = 0;
    let w = 0;
    let h = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const colors = () => {
      const s = getComputedStyle(canvas);
      return { accent: s.getPropertyValue('--color-accent').trim() || '#f7931a', ink: s.getPropertyValue('--color-text').trim() || '#2b2118' };
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      const { accent, ink } = colors();
      ctx.clearRect(0, 0, w, h);
      const R = Math.min(w, h) * 0.46;
      const cx = w / 2;
      const cy = h / 2;
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      const tilt = 0.35;
      const ct = Math.cos(tilt);
      const st = Math.sin(tilt);
      for (const p of pts) {
        // rotate around Y, then tilt around X
        const x1 = p.x * ca + p.z * sa;
        const z1 = -p.x * sa + p.z * ca;
        const y1 = p.y * ct - z1 * st;
        const z2 = p.y * st + z1 * ct;
        const depth = (z2 + 1) / 2; // 0 back … 1 front
        const scale = 0.85 + depth * 0.3;
        const px = cx + x1 * R * scale;
        const py = cy + y1 * R * scale;
        ctx.beginPath();
        ctx.arc(px, py, 0.9 + depth * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = depth > 0.55 ? accent : ink;
        ctx.globalAlpha = 0.12 + depth * 0.7;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const loop = () => {
      angle += 0.0035;
      draw();
      raf = requestAnimationFrame(loop);
    };

    const ro = new ResizeObserver(() => {
      resize();
      draw();
    });
    ro.observe(canvas);
    resize();
    if (reduced) draw();
    else raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden />;
}
