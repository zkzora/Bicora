import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeClarity, toBigInt } from './clarity.js';
import { holderAssets, loadTvlMapping } from './tvl-mapping.js';

const u128 = (n: bigint) => n.toString(16).padStart(32, '0');

test('decodes uint and unwraps (ok uint)', () => {
  assert.equal(toBigInt(decodeClarity(`0x01${u128(123_456_789n)}`)), 123_456_789n);
  assert.equal(toBigInt(decodeClarity(`0x0701${u128(42n)}`)), 42n);
  assert.equal(toBigInt(decodeClarity(`0x0a01${u128(7n)}`)), 7n);
});

test('decodes negative int and bools', () => {
  assert.deepEqual(decodeClarity(`0x00${'f'.repeat(32)}`), { type: 'int', value: -1n });
  assert.deepEqual(decodeClarity('0x03'), { type: 'bool', value: true });
});

test('err, none and trailing bytes are rejected', () => {
  assert.throws(() => toBigInt(decodeClarity(`0x0801${u128(1n)}`)), /expected an integer, got err/);
  assert.throws(() => toBigInt(decodeClarity('0x09')), /got none/);
  assert.throws(() => decodeClarity(`0x01${u128(1n)}00`), /trailing bytes/);
});

const map = loadTvlMapping();
const PRINCIPAL = /^S[PM][0-9A-Z]{28,40}(\.[a-zA-Z][a-zA-Z0-9-]{0,127})?$/;
const holders = Object.values(map.protocols).flatMap((p) => p.deployments.flatMap((d) => d.holders));

test('every holder asset and ratio is defined', () => {
  for (const h of holders) for (const a of holderAssets(h)) assert.ok(map.assets[a], `unknown asset ${a} on ${h.contract}`);
});

test('share tokens are never mapped as assets', () => {
  const shares = new Set(holders.map((h) => h.shareToken).filter(Boolean));
  for (const sym of Object.keys(map.assets)) assert.ok(!shares.has(sym), `${sym} is a share token`);
  for (const h of holders) for (const a of holderAssets(h)) assert.ok(!shares.has(a), `${h.contract} counts share token ${a}`);
});

test('contract IDs are well-formed and holders are unique', () => {
  const ids = [
    ...Object.values(map.assets).flatMap((a) => [a.contract, a.ratio?.contract]),
    ...holders.map((h) => h.contract),
  ].filter((x): x is string => !!x);
  for (const id of ids) assert.match(id, PRINCIPAL);
  const held = holders.map((h) => h.contract).filter(Boolean);
  assert.equal(new Set(held).size, held.length);
});

test('lending vaults declare their asset, share token and reads', () => {
  for (const h of holders.filter((x) => x.kind === 'lending-vault')) {
    assert.ok(h.asset && h.shareToken, `${h.contract} needs asset and shareToken`);
    assert.deepEqual(Object.keys(h.reads ?? {}).sort(), ['available', 'borrowed', 'supplied']);
  }
});

test('nothing claims on-chain verification until tvl:verify has been run', () => {
  const all = [...Object.values(map.assets), ...holders];
  assert.ok(all.every((x) => x.evidence !== 'onchain'));
});
