/**
 * Stacks Bitcoin Staking / PoX tracker — data methodology.
 *
 * Informational only; NOT part of the Risk Index or the scored `protocols` array.
 *
 * Sources (all public, no key required beyond the optional Hiro key):
 *   - STX committed, supply, cycle timing : Hiro  GET /v2/pox
 *   - Stacked history by reward cycle      : Hiro  GET /extended/v2/pox/cycles
 *   - Realized BTC yield (PoX rewards)     : Hiro  GET /extended/v1/burnchain/rewards
 *   - STX price                            : CoinGecko simple price (id=blockstack)
 *
 * What is deliberately N/A (null), never zero:
 *   - btcBonded: the native "Bitcoin Staking" program locks BTC in individual Bitcoin L1
 *     timelocks under users' own keys; there is no public aggregate API for it (whitepaper
 *     published 2026-05-13, PoX-5 bootstrap). We do not invent a figure.
 *
 * Double counting: stackingTvlUsd (STX stacked × price) is disjoint from DeFi-app TVL on
 * DefiLlama, so it does not overlap the scored index — except STX stacked *via* liquid-staking
 * protocols (StackingDAO, LISA). `liquidStackedUsd` carries the tracked portion (StackingDAO's
 * TVL) so the UI can flag the overlap instead of summing the two into a misleading total.
 */
import { log } from '@bicora/shared';
import type { StakingCyclePoint, StakingSnapshot, Snapshot } from '@bicora/shared';

const info = log('staking');

const HIRO = (process.env.HIRO_API_URL ?? 'https://api.hiro.so').replace(/\/$/, '');
const HIRO_KEY = process.env.HIRO_API_KEY;
const COINGECKO = 'https://api.coingecko.com/api/v3';

// Cumulative BTC paid out via Proof of Transfer since 2021, as published on stacks.co.
// Static, cited stat — the `notes` carry the as-of date so it is never mistaken for live data.
const CUMULATIVE_BTC_DISTRIBUTED = 4224;
const CUMULATIVE_AS_OF = '2026-09'; // when the stacks.co figure was last read
const BOND_PERIOD_BLOCKS = 25_200; // ~6 months, per the Bitcoin Staking whitepaper
const TARGET_BTC_APY = 0.03; // ~3% target for the native Bitcoin Staking program (stacks.co), a target not a guarantee

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET JSON with light backoff on 429/5xx; returns null instead of throwing so one source can't sink the run. */
async function tryJson<T>(url: string, attempt = 1): Promise<T | null> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (HIRO_KEY && url.startsWith(HIRO)) headers['x-api-key'] = HIRO_KEY;
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await sleep(800 * 2 ** (attempt - 1));
      return tryJson<T>(url, attempt + 1);
    }
    if (!res.ok) {
      info(`${res.status} ${res.statusText} for ${url}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    if (attempt < 4) {
      await sleep(800 * 2 ** (attempt - 1));
      return tryJson<T>(url, attempt + 1);
    }
    info(`fetch failed for ${url}: ${(e as Error).message}`);
    return null;
  }
}

interface PoxInfo {
  reward_phase_block_length: number;
  prepare_phase_block_length: number;
  total_liquid_supply_ustx: number;
  current_cycle: { id: number; min_threshold_ustx: number; stacked_ustx: number };
  next_cycle: { id: number; blocks_until_reward_phase: number };
}
interface PoxCycles { results: { cycle_number: number; total_stacked_amount: string; total_signers: number }[] }
interface BurnRewards { results: { canonical: boolean; burn_block_height: number; reward_amount: string }[] }
interface Price { blockstack?: { usd?: number } }

const SOURCES = [
  { label: 'Hiro — PoX info (/v2/pox)', url: 'https://api.hiro.so/v2/pox' },
  { label: 'Hiro — PoX cycles', url: 'https://api.hiro.so/extended/v2/pox/cycles' },
  { label: 'Hiro — burnchain rewards', url: 'https://api.hiro.so/extended/v1/burnchain/rewards' },
  { label: 'Stacks — Bitcoin Staking', url: 'https://www.stacks.co/bitcoin-staking' },
];

/**
 * Build the staking section. Never throws. On total fetch failure, carries forward the previous
 * snapshot's staking block (marked 'carried-forward'); if there is none, returns an all-N/A block.
 *
 * @param prev previous snapshot (for fallback)
 * @param now  run timestamp
 * @param liquidStackedUsd STX held by tracked liquid-staking protocols (StackingDAO's STX row) — the overlap figure
 */
export async function buildStaking(prev: Snapshot | null, now: Date, liquidStackedUsd: number | null): Promise<StakingSnapshot> {
  const [pox, cyclesRes, rewardsRes, priceRes] = await Promise.all([
    tryJson<PoxInfo>(`${HIRO}/v2/pox`),
    tryJson<PoxCycles>(`${HIRO}/extended/v2/pox/cycles?limit=16`),
    tryJson<BurnRewards>(`${HIRO}/extended/v1/burnchain/rewards?limit=250`),
    tryJson<Price>(`${COINGECKO}/simple/price?ids=blockstack&vs_currencies=usd`),
  ]);

  if (!pox) {
    if (prev?.staking) {
      info('PoX fetch failed — carrying forward previous staking block');
      return { ...prev.staking, source: 'carried-forward', fetchedAt: now.toISOString() };
    }
    info('PoX fetch failed and no previous data — staking block is all N/A');
    return emptyStaking(now, liquidStackedUsd);
  }

  const stackedStx = pox.current_cycle.stacked_ustx / 1e6;
  const totalStxSupply = pox.total_liquid_supply_ustx / 1e6;
  const stxPriceUsd = priceRes?.blockstack?.usd ?? null;
  const stackedUsd = stxPriceUsd != null ? stackedStx * stxPriceUsd : null;
  const cycleLengthBlocks = pox.reward_phase_block_length + pox.prepare_phase_block_length;
  const blocksUntilNextCycle = pox.next_cycle.blocks_until_reward_phase;
  const nextCycleEta = new Date(now.getTime() + blocksUntilNextCycle * 10 * 60_000).toISOString(); // ~10 min/btc block

  // BTC yield: average payout per rewarded Bitcoin block from a recent sample, then per cycle.
  let btcRewardPerBlockAvg: number | null = null;
  let btcYieldPerCycleEst: number | null = null;
  const rewards = (rewardsRes?.results ?? []).filter((r) => r.canonical);
  if (rewards.length) {
    const byBlock = new Map<number, number>();
    for (const r of rewards) byBlock.set(r.burn_block_height, (byBlock.get(r.burn_block_height) ?? 0) + Number(r.reward_amount));
    const totalSats = [...byBlock.values()].reduce((s, x) => s + x, 0);
    btcRewardPerBlockAvg = totalSats / byBlock.size / 1e8; // BTC per rewarded burn block (summed across recipients)
    btcYieldPerCycleEst = btcRewardPerBlockAvg * pox.reward_phase_block_length;
  }

  // Stacked history by reward cycle (ascending), from the cycles endpoint.
  const history: StakingCyclePoint[] = (cyclesRes?.results ?? [])
    .map((c) => ({ cycle: c.cycle_number, stackedStx: Number(c.total_stacked_amount) / 1e6, signers: c.total_signers ?? null }))
    .sort((a, b) => a.cycle - b.cycle);
  const totalSigners = history.find((h) => h.cycle === pox.current_cycle.id)?.signers ?? null;

  const notes = [
    'Informational only — not part of the Bicora Risk Index or any protocol score.',
    'No Liquidity Health (or Activity / Collateral / Transparency) score is computed: those are the scored methodology. Staked STX is locked per reward cycle; liquid exposure to the same yield is available via liquid-staking tokens such as stSTX (tracked under StackingDAO).',
    'STX committed, supply and cycle timing are live from the Hiro /v2/pox endpoint (contract pox-5).',
    'Realized BTC yield is estimated from a recent sample of PoX burnchain rewards and is approximate.',
    `Cumulative BTC distributed (~${CUMULATIVE_BTC_DISTRIBUTED.toLocaleString()} BTC since 2021) is a published figure from stacks.co, as of ${CUMULATIVE_AS_OF}.`,
    'Target BTC APY (~3%) is the published target for the native Bitcoin Staking program (stacks.co) — a target, not a guarantee; classic PoX stacking yield is variable.',
    'The headline "Stacks TVL" (STX & BTC) on stacks.co is a chain-wide figure: stacked STX + BTC held on Stacks (sBTC) + DeFi. The Staking TVL here is only the STX committed to PoX, so it is several times smaller by design.',
    'BTC bonded (native Bitcoin Staking) is N/A: BTC sits in individual Bitcoin L1 timelocks with no public aggregate API (whitepaper 2026-05-13, PoX-5 bootstrap).',
    'Stacking TVL (STX value) is distinct from DeFi-app TVL and from the chain-wide "Stacks TVL" shown on stacks.co.',
    liquidStackedUsd != null
      ? 'Liquid-stacked overlap is the STX held by tracked liquid-staking protocols (StackingDAO\'s STX row on DefiLlama), already counted in their DeFi TVL. Their sBTC is excluded, and so are LISA and other untracked LSTs.'
      : 'Liquid-stacked overlap is N/A this run.',
  ];

  info(`live: ${(stackedStx / 1e6).toFixed(1)}M STX stacked, cycle ${pox.current_cycle.id}, ${stxPriceUsd != null ? '$' + stxPriceUsd : 'price N/A'}`);
  return {
    source: 'live',
    fetchedAt: now.toISOString(),
    stackedStx,
    stackedUsd,
    stxPriceUsd,
    totalStxSupply,
    pctSupplyStacked: totalStxSupply > 0 ? stackedStx / totalStxSupply : null,
    currentCycle: pox.current_cycle.id,
    cycleLengthBlocks,
    blocksUntilNextCycle,
    nextCycleEta,
    minThresholdStx: pox.current_cycle.min_threshold_ustx / 1e6,
    totalSigners,
    btcRewardPerBlockAvg,
    btcYieldPerCycleEst,
    targetBtcApy: TARGET_BTC_APY,
    cumulativeBtcDistributed: CUMULATIVE_BTC_DISTRIBUTED,
    btcBonded: null,
    bondPeriodBlocks: BOND_PERIOD_BLOCKS,
    programStatus: 'PoX-5 bootstrap (Bitcoin Staking whitepaper, 2026-05-13)',
    liquidStackedUsd,
    stackingTvlUsd: stackedUsd,
    history,
    sources: SOURCES,
    notes,
  };
}

function emptyStaking(now: Date, liquidStackedUsd: number | null): StakingSnapshot {
  return {
    source: 'live',
    fetchedAt: now.toISOString(),
    stackedStx: null,
    stackedUsd: null,
    stxPriceUsd: null,
    totalStxSupply: null,
    pctSupplyStacked: null,
    currentCycle: null,
    cycleLengthBlocks: null,
    blocksUntilNextCycle: null,
    nextCycleEta: null,
    minThresholdStx: null,
    totalSigners: null,
    btcRewardPerBlockAvg: null,
    btcYieldPerCycleEst: null,
    targetBtcApy: TARGET_BTC_APY,
    cumulativeBtcDistributed: CUMULATIVE_BTC_DISTRIBUTED,
    btcBonded: null,
    bondPeriodBlocks: BOND_PERIOD_BLOCKS,
    programStatus: 'PoX-5 bootstrap (Bitcoin Staking whitepaper, 2026-05-13)',
    liquidStackedUsd,
    stackingTvlUsd: null,
    history: [],
    sources: SOURCES,
    notes: ['Staking data could not be fetched this run; live metrics are N/A.'],
  };
}
