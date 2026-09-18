'use client';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';

const KEY = 'btcfi-tour-v1';

interface Step {
  target?: string; // [data-tour="..."] — omitted = centred welcome card
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    title: 'Welcome to the risk dashboard',
    body: 'A two-minute walkthrough of what each part of the dashboard tells you. You can skip at any point and replay it later from the sidebar.',
  },
  {
    target: 'nav',
    title: 'Navigation',
    body: 'Overview summarises the ecosystem. Protocol Risk opens one protocol at a time with its full factor breakdown. Market Metrics tracks liquidity and activity; Alerts lists detected risk events.',
  },
  {
    target: 'tiles',
    title: 'Ecosystem at a glance',
    body: 'Liquidity tracked, active addresses and the average risk score across all tracked protocols. Scores run 0–100 and higher always means lower risk.',
  },
  {
    target: 'components',
    title: 'Four risk components',
    body: 'Every protocol is scored on Liquidity (30%), Activity (25%), Collateral (25%) and Transparency (20%). A hatched bar means the component does not apply and its weight was redistributed.',
  },
  {
    target: 'events',
    title: 'Risk events',
    body: 'The scoring engine flags threshold crossings on every run: TVL moves, utilisation levels, activity swings and score changes, each with a severity.',
  },
  {
    target: 'ranking',
    title: 'Protocol ranking',
    body: 'Sorted by overall score with every component visible. Click a row to see the observed value, weight and score of each factor behind the number.',
  },
  {
    target: 'theme',
    title: 'Your preferences',
    body: 'Switch between light, dark and system themes here. Data freshness and the methodology version are shown just below.',
  },
];

const PAD = 8;

export default function DashboardTour() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // First visit: open automatically on the overview page.
  useEffect(() => {
    if (path !== '/dashboard') return;
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {
      /* storage unavailable: stay closed */
    }
  }, [path]);

  // Replay hook for the sidebar button.
  useEffect(() => {
    const onReplay = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener('btcfi:tour', onReplay);
    return () => window.removeEventListener('btcfi:tour', onReplay);
  }, []);

  const visibleSteps = STEPS.filter((s) => {
    if (!s.target) return true;
    if (typeof document === 'undefined') return true;
    const el = document.querySelector<HTMLElement>(`[data-tour="${s.target}"]`);
    return !!el && el.getBoundingClientRect().width > 0;
  });
  const current = visibleSteps[Math.min(step, visibleSteps.length - 1)];

  const measure = useCallback(() => {
    if (!current?.target) return setRect(null);
    const el = document.querySelector<HTMLElement>(`[data-tour="${current.target}"]`);
    if (!el) return setRect(null);
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setRect(el.getBoundingClientRect());
  }, [current]);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    const t = setTimeout(measure, 350); // after smooth scroll settles
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, measure]);

  const finish = () => {
    setOpen(false);
    setStep(0);
    try {
      localStorage.setItem(KEY, 'done');
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowRight') setStep((s) => Math.min(s + 1, visibleSteps.length - 1));
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(s - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, visibleSteps.length]);

  if (!open || !current || typeof document === 'undefined') return null;

  const last = step >= visibleSteps.length - 1;
  const cardStyle: React.CSSProperties = rect
    ? placeCard(rect)
    : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };

  return createPortal(
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {rect ? (
        <div
          className="tour-spot"
          style={{ left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
        />
      ) : (
        <div className="tour-dim" />
      )}
      <div className="tour-card" style={cardStyle}>
        <div className="tour-head">
          <span className="k">Guide · {step + 1} / {visibleSteps.length}</span>
          <button type="button" className="tour-skip" onClick={finish}>Skip</button>
        </div>
        <h3 id="tour-title">{current.title}</h3>
        <p>{current.body}</p>
        <div className="tour-dots" aria-hidden>
          {visibleSteps.map((_, i) => (<i key={i} className={i === step ? 'on' : ''} />))}
        </div>
        <div className="tour-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setStep((s) => Math.max(s - 1, 0))} disabled={step === 0}>Back</button>
          {last ? (
            <button type="button" className="btn btn-primary" onClick={finish}>Done</button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => setStep((s) => s + 1)}>Next</button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Puts the card beside the highlighted element, preferring below, then above, then the right side. */
function placeCard(r: DOMRect): React.CSSProperties {
  const W = 340;
  const H = 230;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = Math.max(12, Math.min(r.left, vw - W - 12));
  if (r.bottom + H + 16 < vh) return { left, top: r.bottom + PAD + 12, width: W };
  if (r.top - H - 16 > 0) return { left, top: r.top - PAD - 12 - H, width: W };
  if (r.right + W + 24 < vw) return { left: r.right + PAD + 12, top: Math.max(12, Math.min(r.top, vh - H - 12)), width: W };
  return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: W };
}
