'use client';
import { useState } from 'react';
import type { ComponentScore, ScorePoint } from '@/lib/types';
import { componentColor } from '@/lib/format';

type Tab = 'why' | 'affects' | 'history';

/**
 * One risk component as a research card: score, one-line explanation, and expandable
 * "Why this score?" / "What affects it?" / "Historical change" panels.
 */
export default function RiskFactorCard({ c, effectiveWeight, history, liquidityBackfill }: {
  c: ComponentScore;
  effectiveWeight: number;
  history: ScorePoint[];
  liquidityBackfill?: { date: string; score: number }[];
}) {
  const [tab, setTab] = useState<Tab | null>(null);
  const toggle = (t: Tab) => setTab((cur) => (cur === t ? null : t));
  const series = c.key === 'liquidity' && liquidityBackfill && liquidityBackfill.length > 1
    ? liquidityBackfill.map((x) => ({ date: x.date, v: x.score }))
    : history.filter((h) => h[c.key] != null).map((h) => ({ date: h.date, v: h[c.key] as number }));
  const first = series[0];
  const last = series[series.length - 1];
  const change = first && last && series.length > 1 ? last.v - first.v : null;
  const lead = c.explanation?.split('. ')[0];

  return (
    <div className="card fcard">
      <div className="fhead">
        <div>
          <div className="fname"><i style={{ width: 10, height: 10, background: componentColor[c.key], borderRadius: 2, display: 'inline-block' }} />{c.label}</div>
          <div className="fweight">Weight {Math.round(c.weight * 100)}%{effectiveWeight !== Math.round(c.weight * 100) ? ` → ${effectiveWeight}% effective` : ''}</div>
        </div>
        <div className="fscore tnum">{c.score == null ? '—' : Math.round(c.score)}<small>/100</small></div>
      </div>
      <div className="fexp">{c.score == null ? (c.note ?? 'Not applicable.') : lead ? `${lead}.` : ''}</div>
      <div className="ftoggle" role="tablist">
        <button type="button" aria-expanded={tab === 'why'} onClick={() => toggle('why')}>Why this score</button>
        <button type="button" aria-expanded={tab === 'affects'} onClick={() => toggle('affects')}>Inputs & weights</button>
        <button type="button" aria-expanded={tab === 'history'} onClick={() => toggle('history')}>History</button>
      </div>
      {tab === 'why' && (
        <div className="fbody">
          {c.score == null ? (c.note ?? 'Not applicable for this protocol.') : c.explanation}
          {c.note && c.score != null && <div className="muted" style={{ marginTop: 8, fontSize: 11.5 }}>{c.note}</div>}
        </div>
      )}
      {tab === 'affects' && (
        <div className="fbody">
          {c.factors.length ? (
            <ul>
              {c.factors.map((f) => (
                <li key={f.key}>
                  <b style={{ color: 'var(--color-text)' }}>{f.label}</b> · {Math.round(f.weight * 100)}% of this component · observed <span className="mono">{f.value}</span> → score <span className="mono">{f.score == null ? 'n/a' : Math.round(f.score)}</span>
                  {f.explanation && <div className="muted" style={{ fontSize: 11.5 }}>{f.explanation}</div>}
                </li>
              ))}
            </ul>
          ) : 'No inputs available for this component.'}
        </div>
      )}
      {tab === 'history' && (
        <div className="fbody">
          {series.length > 1 ? (
            <>
              <div style={{ display: 'flex', gap: 16, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span><b style={{ color: 'var(--color-text)' }} className="tnum">{Math.round(last.v)}</b> now</span>
                <span className="muted"><span className="tnum">{Math.round(first.v)}</span> on {first.date}</span>
                <span className={change == null ? '' : change > 0 ? 'c-Low' : change < 0 ? 'c-Elevated' : ''}>{change == null ? '' : `${change > 0 ? '▲' : change < 0 ? '▼' : '—'} ${Math.abs(Math.round(change))} pts`}</span>
              </div>
              <svg viewBox="0 0 320 48" style={{ width: '100%', height: 48, marginTop: 10, display: 'block' }} aria-hidden>
                <polyline fill="none" stroke={componentColor[c.key]} strokeWidth={2} strokeLinejoin="round" points={series.map((s, i) => `${(i / (series.length - 1)) * 316 + 2},${44 - (s.v / 100) * 40}`).join(' ')} />
              </svg>
              <div className="muted" style={{ fontSize: 11 }}>{c.key === 'liquidity' && liquidityBackfill && liquidityBackfill.length > 1 ? 'Back-filled from TVL history with the v1.0 liquidity formula.' : `${series.length} scoring runs so far; history grows one point per run.`}</div>
            </>
          ) : (
            'History accumulates one point per scoring run; only the current run exists for this component so far.'
          )}
        </div>
      )}
    </div>
  );
}
