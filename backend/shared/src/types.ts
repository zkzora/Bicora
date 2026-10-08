// Shared domain types for the Bicora Risk Layer pipeline.

export type Governance = 'dao' | 'governance-contract' | 'multisig' | 'unknown';

export interface ProtocolConfig {
  slug: string;
  name: string;
  category: string;
  description: string;
  website: string;
  docs: string | null;
  github: string | null;
  llamaSlug: string;
  hasCollateral: boolean;
  assets: string[];
  contracts: { id: string; role: string }[];
  /** One entry per distinct, publicly verifiable report. `source` is the primary page that lists it. */
  audits: { name: string; url: string; year?: number; source?: string; auditor?: string; scope?: string }[];
  governance: Governance;
  governanceNote?: string;
  bugBounty: string | null;
}

export interface TvlPoint {
  date: string; // YYYY-MM-DD (UTC)
  tvlUsd: number;
  borrowedUsd?: number;
}

export interface ContractInfo {
  id: string;
  role: string;
  found: boolean;
  blockHeight?: number;
  deployedAt?: string; // ISO
  sourceBytes?: number;
  txTotal?: number;
}

export interface ActivityWindow {
  days: number;
  txCount: number;
  uniqueSenders: number;
  successRate: number; // 0..1
  coverageDays: number; // how many days the sampled transactions actually cover
  sampled: boolean; // true when pagination cap was hit before the window cutoff
  byContract: Record<string, number>;
}

export interface ProtocolRaw {
  slug: string;
  fetchedAt: string;
  tvl: {
    currentUsd: number;
    borrowedUsd: number | null;
    history: TvlPoint[]; // daily, ascending
    tokens: Record<string, number>; // latest token breakdown in USD
    asOf?: string; // time of DefiLlama's latest data point (ISO)
  };
  activity: {
    current7d: ActivityWindow;
    prior7d: ActivityWindow | null;
  };
  contracts: ContractInfo[];
  errors: string[];
}

export interface Factor {
  key: string;
  label: string;
  value: string; // human readable input, e.g. "$65.4M"
  raw: number | null;
  score: number | null; // 0..100, null when not available
  weight: number; // within its component
  note?: string;
  explanation?: string;
}

export interface ComponentScore {
  key: 'liquidity' | 'activity' | 'collateral' | 'transparency';
  label: string;
  weight: number; // nominal weight from methodology
  score: number | null; // null = not applicable
  factors: Factor[];
  note?: string;
  /** Rule-based prose answering "why this score?" (see scoring-engine/explain.ts). */
  explanation?: string;
}

export type Band = 'Low' | 'Moderate' | 'Elevated' | 'High';

export interface RiskScore {
  slug: string;
  computedAt: string;
  methodologyVersion: string;
  overall: number;
  band: Band;
  components: ComponentScore[];
  effectiveWeights: Record<string, number>;
}

export type EventKind = 'liquidity' | 'activity' | 'collateral' | 'transparency' | 'score';
export type Severity = 'info' | 'watch' | 'alert';

export interface RiskEvent {
  id: string;
  slug: string;
  ts: string;
  kind: EventKind;
  severity: Severity;
  message: string;
  delta: number | null;
  impact?: 'Low' | 'Medium' | 'High';
  reason?: string;
}

export interface ScorePoint {
  date: string;
  overall: number;
  liquidity: number | null;
  activity: number | null;
  collateral: number | null;
  transparency: number | null;
}

/**
 * Bicora's estimate of value counted twice in the summed TVL. Coverage is limited to the receipt tokens in
 * `mappedTokens`; any other overlap (unmapped receipt or LP tokens, wrapped or bridged assets) is not
 * detected, so this is never proof of complete de-duplication.
 */
export interface ReceiptOverlap {
  totalUsd: number;
  items: { holder: string; token: string; backedBy: string; usd: number }[];
  /** Receipt-token symbols the estimate looks for (StackingDAO stSTX, stSTXbtc, stBTC today). */
  mappedTokens: string[];
  /** Tracked protocols with no DefiLlama token breakdown this run; their holdings could not be checked. */
  missingBreakdowns: string[];
}

/** Denormalised view served to the dashboard and API. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string;
  description: string;
  website: string;
  docs: string | null;
  github: string | null;
  assets: string[];
  contracts: ContractInfo[];
  hasCollateral: boolean;
  metrics: {
    tvlUsd: number;
    borrowedUsd: number | null;
    utilization: number | null;
    tvlChange24h: number | null;
    tvlChange7d: number | null;
    tvlChange30d: number | null;
    tx7d: number;
    uniqueSenders7d: number;
    activitySampled: boolean;
    tokens: Record<string, number>;
    /** Source of tvlUsd / borrowedUsd. Always DefiLlama today. */
    tvlSource?: 'DefiLlama';
    /** When Bicora's indexer fetched the DefiLlama figures (ISO). */
    tvlFetchedAt?: string;
    /** Time of DefiLlama's latest data point at fetch (ISO); null when unknown. */
    tvlAsOf?: string | null;
  };
  dataQuality: { excludedTvlPoints: number; note: string | null; activitySampled: boolean; warnings: string[] };
  score: RiskScore;
  delta7d: number | null;
  tvlHistory: TvlPoint[]; // last 90 days
  liquidityScoreHistory: { date: string; score: number }[]; // backfilled from TVL history
  scoreHistory: ScorePoint[]; // accumulated across runs
  events: RiskEvent[];
}

/** One reward cycle's stacking level (x-axis is the cycle number, not a date). */
export interface StakingCyclePoint {
  cycle: number;
  stackedStx: number;
  signers: number | null;
}

/**
 * Stacks Bitcoin Staking / PoX tracker. Informational only — NOT part of the Risk Index or the
 * scored `protocols` array. Fields that have no authoritative public source are null (shown as N/A),
 * never zero. See scoring-engine/staking.ts for the data methodology.
 */
export interface StakingSnapshot {
  source: 'live' | 'carried-forward';
  fetchedAt: string;
  // STX committed to PoX (classic stacking, live on-chain)
  stackedStx: number | null;
  stackedUsd: number | null;
  stxPriceUsd: number | null;
  totalStxSupply: number | null;
  pctSupplyStacked: number | null; // 0..1
  // Reward cycle / unlock timing
  currentCycle: number | null;
  cycleLengthBlocks: number | null; // Bitcoin blocks per cycle (~2100 ≈ 2 weeks)
  blocksUntilNextCycle: number | null;
  nextCycleEta: string | null; // ISO, estimated from blocks remaining
  minThresholdStx: number | null;
  totalSigners: number | null;
  // Realized BTC yield (from PoX burnchain rewards; estimates from a recent sample)
  btcRewardPerBlockAvg: number | null; // BTC paid per rewarded Bitcoin block (recent sample)
  btcYieldPerCycleEst: number | null; // BTC distributed per cycle (estimate)
  targetBtcApy: number | null; // native Bitcoin Staking target APY (0..1), cited target not a guarantee
  cumulativeBtcDistributed: number | null; // cited stat, see notes for as-of date
  // Native Bitcoin Staking program (BTC bonded on L1) — no public API
  btcBonded: number | null; // N/A
  bondPeriodBlocks: number; // ~25,200 Bitcoin blocks (~6 months)
  programStatus: string;
  // Double-count guard: STX held by tracked liquid-staking protocols (their DefiLlama STX row; overlaps their DeFi TVL)
  liquidStackedUsd: number | null;
  stackingTvlUsd: number | null; // stackedStx × price — distinct from DeFi TVL and chain-wide TVL
  history: StakingCyclePoint[];
  sources: { label: string; url: string }[];
  notes: string[];
}

export interface Snapshot {
  generatedAt: string;
  methodologyVersion: string;
  /** Informational Bitcoin Staking / PoX metrics, outside the scored index. Optional for back-compat. */
  staking?: StakingSnapshot;
  market: {
    protocolsTracked: number;
    totalTvlUsd: number;
    totalTvlChange7d: number | null;
    totalTvlChange30d: number | null;
    activeAddresses7d: number;
    tx7d: number;
    avgScore: number;
    /** Bicora Risk Index: mean of tracked protocol scores, with movement from stored history. */
    index: { score: number; band: Band; previous: number | null; change7d: number | null; change30d: number | null; history: { date: string; score: number }[] };
    bandDistribution: Record<Band, number>;
    ecosystemTvlHistory: TvlPoint[];
    /**
     * Mapped StackingDAO receipt tokens (stSTX, stSTXbtc, stBTC) held in other tracked protocols, valued from
     * those protocols' DefiLlama token breakdowns. Their backing is already in StackingDAO's TVL, so
     * totalTvlUsd counts them twice. Null when no breakdown is available. Secondary detail only.
     */
    receiptOverlap?: ReceiptOverlap | null;
    /** Bicora estimate: totalTvlUsd − receiptOverlap.totalUsd. Covers mapped tokens only. Null when unknown. */
    overlapAdjustedEstimateUsd?: number | null;
  };
  protocols: SnapshotProtocol[];
  events: RiskEvent[];
}
