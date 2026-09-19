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
  audits: { name: string; url: string; year?: number; source?: string }[];
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
}

export interface ComponentScore {
  key: 'liquidity' | 'activity' | 'collateral' | 'transparency';
  label: string;
  weight: number; // nominal weight from methodology
  score: number | null; // null = not applicable
  factors: Factor[];
  note?: string;
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
}

export interface ScorePoint {
  date: string;
  overall: number;
  liquidity: number | null;
  activity: number | null;
  collateral: number | null;
  transparency: number | null;
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
  };
  dataQuality: { excludedTvlPoints: number; note: string | null; activitySampled: boolean; warnings: string[] };
  score: RiskScore;
  delta7d: number | null;
  tvlHistory: TvlPoint[]; // last 90 days
  liquidityScoreHistory: { date: string; score: number }[]; // backfilled from TVL history
  scoreHistory: ScorePoint[]; // accumulated across runs
  events: RiskEvent[];
}

export interface Snapshot {
  generatedAt: string;
  methodologyVersion: string;
  market: {
    protocolsTracked: number;
    totalTvlUsd: number;
    totalTvlChange7d: number | null;
    totalTvlChange30d: number | null;
    activeAddresses7d: number;
    tx7d: number;
    avgScore: number;
    bandDistribution: Record<Band, number>;
    ecosystemTvlHistory: TvlPoint[];
  };
  protocols: SnapshotProtocol[];
  events: RiskEvent[];
}
