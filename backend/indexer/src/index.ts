/**
 * BTCFi Risk Layer — Indexer
 *
 * For every protocol in config/protocols.json:
 *   1. DefiLlama  -> TVL history (Stacks chain), borrowed history, token breakdown
 *   2. Hiro API   -> contract existence, deployment time, transaction activity (7d + prior 7d)
 * and writes a ProtocolRaw record to the store (file store by default, PostgreSQL when DATABASE_URL is set).
 *
 * Run: npm run index            (all protocols)
 *      npm run index -- zest    (one protocol)
 */
import { createStore, loadRegistry, log } from '@btcfi/shared';
import type { ProtocolRaw } from '@btcfi/shared';
import { fetchActivity, fetchContract, fetchLlama } from './sources.js';

const info = log('indexer');

async function indexProtocol(cfg: ReturnType<typeof loadRegistry>[number]): Promise<ProtocolRaw> {
  const errors: string[] = [];
  const fetchedAt = new Date().toISOString();

  const llama = await fetchLlama(cfg.llamaSlug).catch((e: Error) => {
    errors.push(`llama: ${e.message}`);
    return { currentUsd: 0, borrowedUsd: null, history: [], tokens: {} };
  });
  info(`${cfg.slug}: tvl $${Math.round(llama.currentUsd).toLocaleString()} (${llama.history.length} daily points)`);

  const contracts = [];
  for (const c of cfg.contracts) {
    const ci = await fetchContract(c.id, c.role);
    if (!ci.found) errors.push(`contract not found: ${c.id}`);
    contracts.push(ci);
  }

  const activity = await fetchActivity(contracts.filter((c) => c.found).map((c) => c.id), 7).catch((e: Error) => {
    errors.push(`activity: ${e.message}`);
    return { current: { days: 7, txCount: 0, uniqueSenders: 0, successRate: 1, coverageDays: 0, sampled: true, byContract: {} }, prior: null };
  });
  info(
    `${cfg.slug}: 7d tx=${activity.current.txCount} senders=${activity.current.uniqueSenders} ` +
      `success=${(activity.current.successRate * 100).toFixed(1)}% coverage=${activity.current.coverageDays}d${activity.current.sampled ? ' (sampled)' : ''}`,
  );

  return {
    slug: cfg.slug,
    fetchedAt,
    tvl: { currentUsd: llama.currentUsd, borrowedUsd: llama.borrowedUsd, history: llama.history, tokens: llama.tokens },
    activity: { current7d: activity.current, prior7d: activity.prior },
    contracts,
    errors,
  };
}

async function main() {
  const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const registry = loadRegistry().filter((p) => !only.length || only.includes(p.slug));
  const store = await createStore();
  info(`store: ${store.kind}; protocols: ${registry.map((p) => p.slug).join(', ')}`);

  let failures = 0;
  for (const cfg of registry) {
    try {
      const raw = await indexProtocol(cfg);
      await store.saveRaw(raw);
      if (raw.errors.length) info(`${cfg.slug}: warnings -> ${raw.errors.join('; ')}`);
    } catch (e) {
      failures++;
      info(`${cfg.slug}: FAILED ${(e as Error).message}`);
    }
  }
  await store.recordRun('indexer', failures ? 'error' : 'ok', `${registry.length - failures}/${registry.length} protocols indexed`);
  await store.close();
  if (failures) process.exitCode = 1;
}

main();
