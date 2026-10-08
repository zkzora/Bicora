// Frontend copy of the snapshot contract. Kept in sync with backend/shared/src/types.ts.
export type Band = 'Low' | 'Moderate' | 'Elevated' | 'High';
export type ComponentKey = 'liquidity' | 'activity' | 'collateral' | 'transparency';

export interface TvlPoint { date: string; tvlUsd: number; borrowedUsd?: number }
export interface ContractInfo { id: string; role: string; found: boolean; blockHeight?: number; deployedAt?: string; sourceBytes?: number; txTotal?: number }
export interface Factor { key: string; label: string; value: string; raw: number | null; score: number | null; weight: number; note?: string; explanation?: string }
export interface ComponentScore { key: ComponentKey; label: string; weight: number; score: number | null; factors: Factor[]; note?: string; explanation?: string }
export interface RiskScore { slug: string; computedAt: string; methodologyVersion: string; overall: number; band: Band; components: ComponentScore[]; effectiveWeights: Record<string, number> }
export interface RiskEvent { id: string; slug: string; ts: string; kind: 'liquidity' | 'activity' | 'collateral' | 'transparency' | 'score'; severity: 'info' | 'watch' | 'alert'; message: string; delta: number | null; impact?: 'Low' | 'Medium' | 'High'; reason?: string }
export interface ScorePoint { date: string; overall: number; liquidity: number | null; activity: number | null; collateral: number | null; transparency: number | null }

/** Bicora estimate of mapped StackingDAO receipt tokens held in other tracked protocols (counted twice in totalTvlUsd). Not proof of complete de-duplication. */
export interface ReceiptOverlap { totalUsd: number; items: { holder: string; token: string; backedBy: string; usd: number }[]; mappedTokens: string[]; missingBreakdowns: string[] }

export interface SnapshotProtocol {
  slug: string; name: string; category: string; description: string; website: string; docs: string | null; github: string | null;
  assets: string[]; contracts: ContractInfo[]; hasCollateral: boolean;
  metrics: { tvlUsd: number; borrowedUsd: number | null; utilization: number | null; tvlChange24h: number | null; tvlChange7d: number | null; tvlChange30d: number | null; tx7d: number; uniqueSenders7d: number; activitySampled: boolean; tokens: Record<string, number>; tvlSource?: 'DefiLlama'; tvlFetchedAt?: string; tvlAsOf?: string | null };
  dataQuality: { excludedTvlPoints: number; note: string | null; activitySampled: boolean; warnings: string[] };
  score: RiskScore; delta7d: number | null; tvlHistory: TvlPoint[]; liquidityScoreHistory: { date: string; score: number }[]; scoreHistory: ScorePoint[]; events: RiskEvent[];
}
export interface Snapshot {
  generatedAt: string; methodologyVersion: string;
  market: { protocolsTracked: number; totalTvlUsd: number; totalTvlChange7d: number | null; totalTvlChange30d: number | null; activeAddresses7d: number; tx7d: number; avgScore: number; index: { score: number; band: Band; previous: number | null; change7d: number | null; change30d: number | null; history: { date: string; score: number }[] }; bandDistribution: Record<Band, number>; ecosystemTvlHistory: TvlPoint[]; receiptOverlap?: ReceiptOverlap | null; overlapAdjustedEstimateUsd?: number | null };
  protocols: SnapshotProtocol[]; events: RiskEvent[];
  staking?: StakingSnapshot;
}

/** One reward cycle's stacking level (x-axis is the cycle number, not a date). */
export interface StakingCyclePoint { cycle: number; stackedStx: number; signers: number | null }

/** Bitcoin Staking / PoX tracker — informational, outside the scored index. Null = N/A (never zero). */
export interface StakingSnapshot {
  source: 'live' | 'carried-forward';
  fetchedAt: string;
  stackedStx: number | null; stackedUsd: number | null; stxPriceUsd: number | null;
  totalStxSupply: number | null; pctSupplyStacked: number | null;
  currentCycle: number | null; cycleLengthBlocks: number | null; blocksUntilNextCycle: number | null;
  nextCycleEta: string | null; minThresholdStx: number | null; totalSigners: number | null;
  btcRewardPerBlockAvg: number | null; btcYieldPerCycleEst: number | null; targetBtcApy: number | null; cumulativeBtcDistributed: number | null;
  btcBonded: number | null; bondPeriodBlocks: number; programStatus: string;
  liquidStackedUsd: number | null; stackingTvlUsd: number | null;
  history: StakingCyclePoint[];
  sources: { label: string; url: string }[];
  notes: string[];
}
