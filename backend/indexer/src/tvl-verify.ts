/**
 * Checks config/tvl-mapping.json against Stacks mainnet through the Hiro API and prints a report.
 * Read-only and standalone: it writes nothing and is not part of `npm run pipeline`.
 *
 *   npm run tvl:verify            (all protocols)
 *   npm run tvl:verify -- zest    (one protocol)
 *
 * For every mapped contract: does it exist; for holders, the balances of their mapped assets; for vault
 * reads and ratio functions, the decoded value. Exit code 1 when any contract or read fails, so a
 * reviewer can promote only what passed to `evidence: "onchain"`.
 */
import { log, sleep } from '@bicora/shared';
import { decodeClarity, toBigInt } from './clarity.js';
import { holderAssets, loadTvlMapping } from './tvl-mapping.js';

const info = log('tvl-verify');
const HIRO = (process.env.HIRO_API_URL ?? 'https://api.hiro.so').replace(/\/$/, '');
const HIRO_KEY = process.env.HIRO_API_KEY;

async function hiro<T>(pathname: string, body?: unknown, attempt = 1): Promise<T> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (HIRO_KEY) headers['x-api-key'] = HIRO_KEY;
  if (body) headers['content-type'] = 'application/json';
  const res = await fetch(`${HIRO}${pathname}`, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30_000) });
  if ((res.status === 429 || res.status >= 500) && attempt < 5) {
    await sleep(1000 * 2 ** (attempt - 1));
    return hiro<T>(pathname, body, attempt + 1);
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

const split = (id: string) => {
  const [addr, name] = id.split('.');
  return { addr, name };
};

/** true / false from the API; throws when Hiro could not answer, so an outage is never reported as "not found". */
async function exists(id: string): Promise<boolean> {
  try {
    await hiro(`/extended/v1/contract/${id}`);
    return true;
  } catch (e) {
    if ((e as Error).message.startsWith('404 ')) return false;
    throw e;
  }
}

async function callRead(id: string, fn: string): Promise<bigint> {
  const { addr, name } = split(id);
  const r = await hiro<{ okay: boolean; result?: string; cause?: string }>(`/v2/contracts/call-read/${addr}/${name}/${fn}`, { sender: addr, arguments: [] });
  if (!r.okay || !r.result) throw new Error(r.cause ?? 'call failed');
  return toBigInt(decodeClarity(r.result));
}

interface Balances { stx: { balance: string }; fungible_tokens: Record<string, { balance: string }> }

const scaled = (v: bigint, decimals: number) => (Number(v) / 10 ** decimals).toLocaleString('en-US', { maximumFractionDigits: 4 });

async function main() {
  const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const map = loadTvlMapping();
  let failures = 0;
  const fail = (msg: string) => {
    failures++;
    info(`  FAIL ${msg}`);
  };

  info('assets');
  for (const [sym, a] of Object.entries(map.assets)) {
    if (a.contract) {
      try {
        (await exists(a.contract)) ? info(`  ok   ${sym} ${a.contract}`) : fail(`${sym} token contract not found: ${a.contract}`);
      } catch (e) {
        fail(`${sym} ${a.contract}: Hiro unreachable (${(e as Error).message})`);
      }
    }
    if (a.ratio?.contract && a.ratio.function) {
      try {
        info(`  ok   ${sym} ratio ${a.ratio.function} = ${await callRead(a.ratio.contract, a.ratio.function)} (raw)`);
      } catch (e) {
        fail(`${sym} ratio ${a.ratio.contract}.${a.ratio.function}: ${(e as Error).message}`);
      }
    }
    await sleep(150);
  }

  for (const [slug, p] of Object.entries(map.protocols)) {
    if (only.length && !only.includes(slug)) continue;
    for (const d of p.deployments) {
      info(`${slug} — ${d.name}`);
      for (const h of d.holders) {
        if (!h.contract) {
          info(`  skip ${h.kind}: holder not identified (${h.evidence})`);
          continue;
        }
        try {
          if (!(await exists(h.contract))) {
            fail(`${h.contract} not found`);
            continue;
          }
        } catch (e) {
          fail(`${h.contract}: Hiro unreachable (${(e as Error).message})`);
          continue;
        }
        try {
          const bal = await hiro<Balances>(`/extended/v1/address/${h.contract}/balances`);
          for (const sym of holderAssets(h)) {
            const a = map.assets[sym];
            const raw = a.native ? BigInt(bal.stx.balance) : BigInt(Object.entries(bal.fungible_tokens).find(([k]) => k.startsWith(`${a.contract}::`))?.[1].balance ?? '0');
            info(`  ok   ${h.contract} holds ${scaled(raw, a.decimals)} ${sym}`);
          }
        } catch (e) {
          fail(`${h.contract} balances: ${(e as Error).message}`);
        }
        for (const [label, fn] of Object.entries(h.reads ?? {})) {
          try {
            const v = await callRead(h.contract, fn);
            info(`  ok   ${h.contract} ${label} (${fn}) = ${scaled(v, map.assets[h.asset!].decimals)} ${h.asset}`);
          } catch (e) {
            fail(`${h.contract}.${fn}: ${(e as Error).message}`);
          }
          await sleep(150);
        }
      }
    }
  }

  info(failures ? `${failures} check(s) failed` : 'all mapped contracts and reads resolved');
  if (failures) process.exitCode = 1;
}

main();
