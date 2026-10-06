/**
 * Types and loader for config/tvl-mapping.json — the contract and asset map for a future
 * Bicora-calculated protocol TVL. Mapping only: nothing in the pipeline, snapshot, API or scoring reads it.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '@bicora/shared';

export type Evidence = 'source' | 'documented' | 'unverified' | 'onchain';

export interface MappedAsset {
  contract: string | null;
  native?: boolean;
  decimals: number;
  priceRef: 'STX' | 'BTC' | 'USD';
  ratio?: { contract?: string; function?: string | null; fixed?: number; evidence: Evidence; note?: string };
  backedBy?: string;
  evidence: Evidence;
  note?: string;
}

export interface Holder {
  contract: string | null;
  kind: 'lending-vault' | 'collateral-custody' | 'strategy-idle' | 'stx-reserve' | 'sbtc-reserve';
  asset?: string;
  assets?: string[];
  shareToken?: string;
  reads?: Record<string, string>;
  excludeShareTokens?: boolean;
  evidence: Evidence;
  note?: string;
}

export interface Deployment {
  name: string;
  deployer: string;
  source: string;
  holders: Holder[];
  excluded?: { contract: string; reason: string }[];
  crossChecks?: { name: string; formula: string; evidence: Evidence; note?: string }[];
  evidence?: Evidence;
  note?: string;
}

export interface TvlMapping {
  version: number;
  status: string;
  evidence: Record<Evidence, string>;
  rules: string[];
  assets: Record<string, MappedAsset>;
  protocols: Record<string, { registrySlug: string; llamaSlug: string; deployments: Deployment[] }>;
  openItems: string[];
}

export function loadTvlMapping(file = path.join(REPO_ROOT, 'config', 'tvl-mapping.json')): TvlMapping {
  return JSON.parse(readFileSync(file, 'utf8')) as TvlMapping;
}

/** Assets a holder is mapped to hold, whether declared singly or as a list. */
export const holderAssets = (h: Holder): string[] => (h.asset ? [h.asset] : h.assets ?? []);
