import { isoDay, sleep } from '@bicora/shared';
import type { ActivityWindow, ContractInfo, TvlPoint } from '@bicora/shared';

const HIRO = (process.env.HIRO_API_URL ?? 'https://api.hiro.so').replace(/\/$/, '');
const HIRO_KEY = process.env.HIRO_API_KEY;
const LLAMA = 'https://api.llama.fi';

const MAX_ATTEMPTS = 5;

/** GET JSON with exponential backoff on 429, 5xx and network errors (the public Hiro API is bursty). */
async function getJson<T>(url: string, attempt = 1): Promise<T> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (HIRO_KEY && url.startsWith(HIRO)) headers['x-api-key'] = HIRO_KEY;
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
    if ((res.status === 429 || res.status >= 500) && attempt < MAX_ATTEMPTS) {
      await sleep(1000 * 2 ** (attempt - 1));
      return getJson<T>(url, attempt + 1);
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
    return (await res.json()) as T;
  } catch (e) {
    const isHttp = e instanceof Error && /^\d{3} /.test(e.message);
    if (!isHttp && attempt < MAX_ATTEMPTS) {
      await sleep(1000 * 2 ** (attempt - 1));
      return getJson<T>(url, attempt + 1);
    }
    throw e;
  }
}

// ---------------------------------------------------------------- DefiLlama

interface LlamaProtocol {
  tvl: { date: number; totalLiquidityUSD: number }[];
  chainTvls: Record<string, { tvl: { date: number; totalLiquidityUSD: number }[]; tokensInUsd?: { date: number; tokens: Record<string, number> }[] }>;
  currentChainTvls: Record<string, number>;
}

export interface LlamaResult {
  currentUsd: number;
  borrowedUsd: number | null;
  history: TvlPoint[];
  tokens: Record<string, number>;
}

/** Stacks-chain TVL history (excluding borrowed), plus borrowed history when the adapter reports it. */
export async function fetchLlama(slug: string): Promise<LlamaResult> {
  const p = await getJson<LlamaProtocol>(`${LLAMA}/protocol/${slug}`);
  const chain = p.chainTvls['Stacks'] ?? { tvl: p.tvl };
  const borrowed = p.chainTvls['Stacks-borrowed'];
  const borrowedByDay = new Map<string, number>();
  for (const b of borrowed?.tvl ?? []) borrowedByDay.set(isoDay(b.date * 1000), b.totalLiquidityUSD);

  const byDay = new Map<string, TvlPoint>();
  for (const t of chain.tvl) {
    const date = isoDay(t.date * 1000);
    const point: TvlPoint = { date, tvlUsd: t.totalLiquidityUSD };
    const bor = borrowedByDay.get(date);
    if (bor != null) point.borrowedUsd = bor;
    byDay.set(date, point); // later entries for the same day win
  }
  const history = [...byDay.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  const tokensLatest = chain.tokensInUsd?.at(-1)?.tokens ?? {};
  return {
    currentUsd: p.currentChainTvls['Stacks'] ?? history.at(-1)?.tvlUsd ?? 0,
    borrowedUsd: p.currentChainTvls['Stacks-borrowed'] ?? null,
    history,
    tokens: tokensLatest,
  };
}

// --------------------------------------------------------------------- Hiro

interface HiroContract {
  contract_id: string;
  tx_id: string;
  block_height: number;
  source_code: string;
}
interface HiroTx {
  tx_id: string;
  tx_type: string;
  tx_status: string;
  sender_address: string;
  burn_block_time_iso: string;
  contract_call?: { contract_id: string; function_name: string };
}
interface HiroTxPage {
  total: number;
  results: HiroTx[];
}

export async function fetchContract(id: string, role: string): Promise<ContractInfo> {
  try {
    const c = await getJson<HiroContract>(`${HIRO}/extended/v1/contract/${id}`);
    let deployedAt: string | undefined;
    try {
      const tx = await getJson<{ burn_block_time_iso?: string }>(`${HIRO}/extended/v1/tx/${c.tx_id}`);
      deployedAt = tx.burn_block_time_iso;
    } catch {
      /* deployment time is optional */
    }
    const page = await getJson<HiroTxPage>(`${HIRO}/extended/v1/address/${id}/transactions?limit=1`);
    return { id, role, found: true, blockHeight: c.block_height, deployedAt, sourceBytes: c.source_code?.length ?? 0, txTotal: page.total };
  } catch (e) {
    return { id, role, found: false };
  }
}

const PAGE = 50;
const MAX_PAGES_PER_CONTRACT = 24; // 1,200 transactions per contract per run

/**
 * Walks each contract's transaction list backwards in time, collecting everything inside the
 * last `days` days. Returns the current window and, when coverage allows, the prior window.
 */
export async function fetchActivity(contractIds: string[], days = 7): Promise<{ current: ActivityWindow; prior: ActivityWindow | null }> {
  const now = Date.now();
  const cutoffCurrent = now - days * 864e5;
  const cutoffPrior = now - 2 * days * 864e5;
  const txs: HiroTx[] = [];
  let sampled = false;
  let oldestSeen = now;

  for (const id of contractIds) {
    let offset = 0;
    for (let page = 0; page < MAX_PAGES_PER_CONTRACT; page++) {
      const res = await getJson<HiroTxPage>(`${HIRO}/extended/v1/address/${id}/transactions?limit=${PAGE}&offset=${offset}`);
      let reachedCutoff = false;
      for (const t of res.results) {
        const ts = Date.parse(t.burn_block_time_iso);
        if (!Number.isFinite(ts)) continue;
        if (ts < cutoffPrior) {
          reachedCutoff = true;
          break;
        }
        txs.push(t);
        oldestSeen = Math.min(oldestSeen, ts);
      }
      if (reachedCutoff || res.results.length < PAGE) break;
      offset += PAGE;
      if (page === MAX_PAGES_PER_CONTRACT - 1) sampled = true;
      await sleep(120);
    }
  }

  const build = (from: number, to: number): ActivityWindow => {
    const inWin = txs.filter((t) => {
      const ts = Date.parse(t.burn_block_time_iso);
      return ts >= from && ts < to;
    });
    const byContract: Record<string, number> = {};
    for (const t of inWin) {
      const k = t.contract_call?.contract_id ?? 'other';
      byContract[k] = (byContract[k] ?? 0) + 1;
    }
    const ok = inWin.filter((t) => t.tx_status === 'success').length;
    const coverageMs = Math.min(to - from, to - Math.max(from, oldestSeen));
    return {
      days,
      txCount: inWin.length,
      uniqueSenders: new Set(inWin.map((t) => t.sender_address)).size,
      successRate: inWin.length ? ok / inWin.length : 1,
      coverageDays: Math.round((Math.max(0, coverageMs) / 864e5) * 10) / 10,
      sampled: sampled && oldestSeen > from,
      byContract,
    };
  };

  const current = build(cutoffCurrent, now);
  const priorCovered = oldestSeen <= cutoffPrior + 864e5; // we saw at least ~6 of the prior 7 days
  const prior = priorCovered ? build(cutoffPrior, cutoffCurrent) : null;
  return { current, prior };
}
