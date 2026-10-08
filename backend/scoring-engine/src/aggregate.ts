/**
 * Ecosystem aggregates that must not count the same value twice. Display-only: nothing here feeds
 * protocol scores or the Risk Index.
 */
import type { ReceiptOverlap } from '@bicora/shared';

/**
 * Receipt tokens and the tracked protocol whose TVL already holds their backing, keyed by the symbol
 * DefiLlama uses in token breakdowns. stSTX / stSTXbtc are backed by STX in StackingDAO's reserves and
 * stBTC by sBTC in its stBTC reserve; DefiLlama's StackingDAO adapter counts those reserves.
 */
export const RECEIPT_TOKENS: Record<string, string> = { STSTX: 'stackingdao', STSTXBTC: 'stackingdao', STBTC: 'stackingdao' };

interface ProtocolTokens {
  slug: string;
  category: string;
  tvlUsd: number;
  tokens: Record<string, number>;
}

/**
 * Value of receipt tokens held by other tracked protocols whose backing protocol is also tracked.
 * Valued at the holder's DefiLlama price, capped at the backer's TVL. Null when no protocol has a breakdown.
 */
export function receiptOverlap(protocols: ProtocolTokens[]): ReceiptOverlap | null {
  const withTokens = protocols.filter((p) => Object.keys(p.tokens).length > 0);
  if (!withTokens.length) return null;
  const tracked = new Map(protocols.map((p) => [p.slug, p]));
  const items: ReceiptOverlap['items'] = [];
  for (const p of withTokens) {
    for (const [token, usd] of Object.entries(p.tokens)) {
      const backedBy = RECEIPT_TOKENS[token.toUpperCase()];
      if (!backedBy || backedBy === p.slug || !tracked.has(backedBy) || !(usd > 0)) continue;
      items.push({ holder: p.slug, token: token.toUpperCase(), backedBy, usd });
    }
  }
  // Never subtract more than the backing protocol actually reports.
  let totalUsd = 0;
  for (const backer of new Set(items.map((i) => i.backedBy))) {
    const held = items.filter((i) => i.backedBy === backer).reduce((s, i) => s + i.usd, 0);
    totalUsd += Math.min(held, tracked.get(backer)!.tvlUsd);
  }
  items.sort((a, b) => b.usd - a.usd);
  return { totalUsd, items, partial: withTokens.length < protocols.length };
}

/**
 * STX held by tracked liquid-stacking protocols (their DefiLlama STX token row): the part of the DeFi
 * figures that is also inside STX committed to PoX. sBTC and other assets are excluded — they are not stacked STX.
 * Null when no liquid-stacking protocol reports an STX row.
 */
export function liquidStackedStxUsd(protocols: ProtocolTokens[]): number | null {
  const rows = protocols.filter((p) => p.category === 'Liquid Stacking').map((p) => p.tokens['STX']).filter((v): v is number => v != null && v > 0);
  return rows.length ? rows.reduce((s, v) => s + v, 0) : null;
}
