import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liquidStackedStxUsd, receiptOverlap } from './aggregate.js';

// Token breakdowns from the 2026-10-08 13:45 UTC snapshot (DefiLlama, USD).
const sd = { slug: 'stackingdao', category: 'Liquid Stacking', tvlUsd: 83_024_570, tokens: { SBTC: 52_783_936, STX: 30_240_635 } };
const zest = {
  slug: 'zest', category: 'Lending', tvlUsd: 75_982_884,
  tokens: { STBTC: 51_495_696, SBTC: 14_095_163, STSTX: 3_916_229, USDCX: 2_851_238, STSTXBTC: 2_654_036, STX: 648_952, USDH: 321_570 },
};

test('receipt tokens held in Zest are counted once, against StackingDAO', () => {
  const o = receiptOverlap([sd, zest])!;
  assert.equal(o.totalUsd, 51_495_696 + 3_916_229 + 2_654_036);
  assert.deepEqual(o.items.map((i) => i.token), ['STBTC', 'STSTX', 'STSTXBTC']);
  assert.ok(o.items.every((i) => i.holder === 'zest' && i.backedBy === 'stackingdao'));
  assert.deepEqual(o.mappedTokens, ['STSTX', 'STSTXBTC', 'STBTC']);
  assert.deepEqual(o.missingBreakdowns, []);
});

test('no overlap when the backing protocol is not tracked', () => {
  assert.equal(receiptOverlap([zest])!.totalUsd, 0);
});

test('overlap is capped at the backing protocol TVL', () => {
  const smallSd = { ...sd, tvlUsd: 10_000_000 };
  assert.equal(receiptOverlap([smallSd, zest])!.totalUsd, 10_000_000);
});

test('missing breakdowns: null when none, listed when some', () => {
  assert.equal(receiptOverlap([{ ...sd, tokens: {} }, { ...zest, tokens: {} }]), null);
  assert.deepEqual(receiptOverlap([sd, zest, { slug: 'alex', category: 'DEX / AMM', tvlUsd: 1, tokens: {} }])!.missingBreakdowns, ['alex']);
});

test('unmapped tokens are not treated as overlap, even with full breakdowns', () => {
  const lp = { slug: 'bitflow', category: 'DEX / AMM', tvlUsd: 5, tokens: { 'LISTX': 3, 'STX-STSTX-LP': 2 } };
  assert.equal(receiptOverlap([sd, lp])!.totalUsd, 0);
});

test('liquid-stacked overlap is the STX row only, not sBTC', () => {
  assert.equal(liquidStackedStxUsd([sd, zest]), 30_240_635);
  assert.equal(liquidStackedStxUsd([{ ...sd, tokens: { SBTC: 1 } }, zest]), null);
});
