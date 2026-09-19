'use client';
import { useState } from 'react';

const FEATURES = [
  'Full protocol risk scores',
  'Advanced risk factor breakdown',
  'Historical risk performance',
  'Protocol comparison tools',
  'Risk trend analytics',
  'Liquidity health monitoring',
  'Collateral condition tracking',
  'Protocol exposure analysis',
  'Wallet risk analytics',
  'Advanced charts',
  'Export research reports',
  'Priority data updates',
  'Early access to new analytics features',
];

const MONTHLY = 49;
const YEARLY = 490;

export default function PricingCard({ ctaHref }: { ctaHref: string }) {
  const [yearly, setYearly] = useState(true);
  const saving = MONTHLY * 12 - YEARLY;
  const pct = Math.round((saving / (MONTHLY * 12)) * 100);

  return (
    <div className="card pricing" id="pricing">
      <div className="pricing-head">
        <div>
          <span className="tag tag-accent">For Professional Analysts</span>
          <h2>Bicora Pro</h2>
          <p className="muted" style={{ fontSize: 12.5 }}>Everything in the public dashboard, plus the depth professionals need.</p>
        </div>
        <div className="seg" role="group" aria-label="Billing period">
          <button type="button" className="seg-opt" aria-pressed={!yearly} onClick={() => setYearly(false)}>Monthly</button>
          <button type="button" className="seg-opt" aria-pressed={yearly} onClick={() => setYearly(true)}>Yearly · save {pct}%</button>
        </div>
      </div>

      <div className="pricing-price">
        <span className="amount tnum">${yearly ? YEARLY : MONTHLY}</span>
        <span className="per">/ {yearly ? 'year' : 'month'}</span>
        <span className="note">{yearly ? `Billed annually · $${(YEARLY / 12).toFixed(2)}/mo · save $${saving} vs monthly` : `Billed monthly · or $${YEARLY}/year (save $${saving})`}</span>
      </div>

      <ul className="pricing-features">
        {FEATURES.map((f) => (
          <li key={f}><span className="check" aria-hidden>✓</span>{f}</li>
        ))}
      </ul>

      <div className="pricing-cta">
        <a href={ctaHref} className="btn btn-primary btn-lg">Upgrade to Pro</a>
        <span className="muted" style={{ fontSize: 11.5 }}>Cancel anytime · Scores remain analytics, not financial advice</span>
      </div>
    </div>
  );
}
