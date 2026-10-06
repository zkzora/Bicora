import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { StakingSnapshot } from '@bicora/shared';
import { carryForward } from './staking.js';

const T0 = '2026-10-06T00:17:00.000Z';
const T1 = new Date('2026-10-06T06:17:00.000Z');
const T2 = new Date('2026-10-06T12:17:00.000Z');

const live = (over: Partial<StakingSnapshot> = {}): StakingSnapshot => ({
  source: 'live', fetchedAt: T0, observedAt: T0, lastAttemptAt: T0,
  stackedStx: 448e6, stackedUsd: 168e6, stxPriceUsd: 0.375, totalStxSupply: 1.87e9, pctSupplyStacked: 0.24,
  currentCycle: 144, cycleLengthBlocks: 2100, blocksUntilNextCycle: 431, nextCycleEta: T0, minThresholdStx: 50_000, totalSigners: 31,
  btcRewardPerBlockAvg: 0.0046, btcYieldPerCycleEst: 9.2, targetBtcApy: 0.03, cumulativeBtcDistributed: 4224,
  btcBonded: null, bondPeriodBlocks: 25_200, programStatus: 'x', liquidStackedUsd: 56e6, stackingTvlUsd: 168e6,
  history: [], sources: [], notes: ['Informational only.'],
  ...over,
});

test('carry-forward keeps values and the original observation time, records the new attempt', () => {
  const c = carryForward(live(), T1);
  assert.equal(c.source, 'carried-forward');
  assert.equal(c.observedAt, T0);
  assert.equal(c.lastAttemptAt, T1.toISOString());
  assert.equal(c.fetchedAt, T1.toISOString());
  assert.equal(c.stackedStx, 448e6);
  assert.match(c.notes[0], new RegExp(`last successful fetch at ${T0}`));
});

test('repeated carry-forward does not move observedAt or stack notes', () => {
  const c = carryForward(carryForward(live(), T1), T2);
  assert.equal(c.observedAt, T0);
  assert.equal(c.lastAttemptAt, T2.toISOString());
  assert.equal(c.notes.filter((n) => n.startsWith('Live PoX fetch failed')).length, 1);
  assert.equal(c.notes.at(-1), 'Informational only.');
});

test('legacy live block without observedAt uses its write time', () => {
  const legacy = live();
  delete legacy.observedAt;
  delete legacy.lastAttemptAt;
  assert.equal(carryForward(legacy, T1).observedAt, T0);
});

test('legacy carried-forward block without observedAt is reported as unknown, not as its write time', () => {
  const legacy = live({ source: 'carried-forward' });
  delete legacy.observedAt;
  const c = carryForward(legacy, T1);
  assert.equal(c.observedAt, null);
  assert.match(c.notes[0], /whose time was not recorded/);
});

test('carrying an empty block keeps observedAt null', () => {
  const c = carryForward(live({ stackedStx: null, observedAt: null }), T1);
  assert.equal(c.observedAt, null);
});
