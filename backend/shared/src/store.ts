import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './registry.js';
import type { ProtocolRaw, RiskScore, RiskEvent, ScorePoint, Snapshot } from './types.js';

/**
 * Storage boundary between indexer -> scoring engine -> API.
 * Two implementations: a file store (zero setup, used by default) and PostgreSQL
 * (used when DATABASE_URL is set). Both expose the same interface.
 */
export interface Store {
  readonly kind: 'file' | 'postgres';
  saveRaw(raw: ProtocolRaw): Promise<void>;
  getAllRaw(): Promise<ProtocolRaw[]>;
  saveScores(scores: RiskScore[]): Promise<void>;
  getLatestScores(): Promise<RiskScore[]>;
  getScoreHistory(slug: string, days: number): Promise<ScorePoint[]>;
  saveEvents(events: RiskEvent[]): Promise<void>;
  getEvents(sinceIso?: string): Promise<RiskEvent[]>;
  saveSnapshot(snapshot: Snapshot): Promise<void>;
  getSnapshot(): Promise<Snapshot | null>;
  recordRun(job: 'indexer' | 'scoring', status: 'ok' | 'error', notes: string): Promise<void>;
  close(): Promise<void>;
}

const toPoint = (s: RiskScore): ScorePoint => {
  const c = (k: string) => s.components.find((x) => x.key === k)?.score ?? null;
  return {
    date: s.computedAt.slice(0, 10),
    overall: s.overall,
    liquidity: c('liquidity'),
    activity: c('activity'),
    collateral: c('collateral'),
    transparency: c('transparency'),
  };
};

// ---------------------------------------------------------------- file store

class FileStore implements Store {
  readonly kind = 'file' as const;
  constructor(private dir: string) {
    for (const d of ['raw', 'scores', 'history']) mkdirSync(path.join(dir, d), { recursive: true });
  }
  private p(...s: string[]) { return path.join(this.dir, ...s); }
  private readJson<T>(file: string, fallback: T): T {
    return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as T) : fallback;
  }
  private readJsonl<T>(file: string): T[] {
    if (!existsSync(file)) return [];
    return readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as T);
  }

  async saveRaw(raw: ProtocolRaw) {
    writeFileSync(this.p('raw', `${raw.slug}.json`), JSON.stringify(raw, null, 2));
  }
  async getAllRaw() {
    return readdirSync(this.p('raw'))
      .filter((f) => f.endsWith('.json'))
      .map((f) => this.readJson<ProtocolRaw | null>(this.p('raw', f), null))
      .filter((x): x is ProtocolRaw => x != null);
  }
  async saveScores(scores: RiskScore[]) {
    writeFileSync(this.p('scores', 'latest.json'), JSON.stringify(scores, null, 2));
    for (const s of scores) {
      // One point per protocol per day: replace same-day entries.
      const file = this.p('history', `${s.slug}.jsonl`);
      const pts = this.readJsonl<ScorePoint>(file).filter((p) => p.date !== s.computedAt.slice(0, 10));
      pts.push(toPoint(s));
      writeFileSync(file, pts.map((p) => JSON.stringify(p)).join('\n') + '\n');
    }
  }
  async getLatestScores() { return this.readJson<RiskScore[]>(this.p('scores', 'latest.json'), []); }
  async getScoreHistory(slug: string, days: number) {
    const cutoff = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
    return this.readJsonl<ScorePoint>(this.p('history', `${slug}.jsonl`)).filter((p) => p.date >= cutoff);
  }
  async saveEvents(events: RiskEvent[]) {
    if (!events.length) return;
    appendFileSync(this.p('events.jsonl'), events.map((e) => JSON.stringify(e)).join('\n') + '\n');
  }
  async getEvents(sinceIso?: string) {
    const all = this.readJsonl<RiskEvent>(this.p('events.jsonl'));
    return (sinceIso ? all.filter((e) => e.ts >= sinceIso) : all).sort((a, b) => (a.ts < b.ts ? 1 : -1));
  }
  async saveSnapshot(snapshot: Snapshot) {
    writeFileSync(this.p('snapshot.json'), JSON.stringify(snapshot, null, 2));
  }
  async getSnapshot() { return this.readJson<Snapshot | null>(this.p('snapshot.json'), null); }
  async recordRun(job: string, status: string, notes: string) {
    appendFileSync(this.p('runs.jsonl'), JSON.stringify({ job, status, notes, at: new Date().toISOString() }) + '\n');
  }
  async close() {}
}

// ------------------------------------------------------------ postgres store

type Pool = import('pg').Pool;

class PgStore implements Store {
  readonly kind = 'postgres' as const;
  constructor(private pool: Pool) {}

  async saveRaw(raw: ProtocolRaw) {
    const c = await this.pool.connect();
    try {
      await c.query('BEGIN');
      await c.query(
        `INSERT INTO protocol_raw (slug, fetched_at, payload) VALUES ($1,$2,$3)
         ON CONFLICT (slug) DO UPDATE SET fetched_at = EXCLUDED.fetched_at, payload = EXCLUDED.payload`,
        [raw.slug, raw.fetchedAt, raw],
      );
      for (const p of raw.tvl.history.slice(-400)) {
        await c.query(
          `INSERT INTO tvl_snapshots (slug, day, tvl_usd, borrowed_usd) VALUES ($1,$2,$3,$4)
           ON CONFLICT (slug, day) DO UPDATE SET tvl_usd = EXCLUDED.tvl_usd, borrowed_usd = EXCLUDED.borrowed_usd`,
          [raw.slug, p.date, p.tvlUsd, p.borrowedUsd ?? null],
        );
      }
      const a = raw.activity.current7d;
      await c.query(
        `INSERT INTO activity_snapshots (slug, fetched_at, window_days, tx_count, unique_senders, success_rate, coverage_days, sampled, by_contract)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [raw.slug, raw.fetchedAt, a.days, a.txCount, a.uniqueSenders, a.successRate, a.coverageDays, a.sampled, a.byContract],
      );
      for (const k of raw.contracts) {
        await c.query(
          `INSERT INTO contract_info (contract_id, slug, role, found, block_height, deployed_at, source_bytes, tx_total, fetched_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (contract_id) DO UPDATE SET found = EXCLUDED.found, block_height = EXCLUDED.block_height,
             deployed_at = EXCLUDED.deployed_at, source_bytes = EXCLUDED.source_bytes, tx_total = EXCLUDED.tx_total, fetched_at = EXCLUDED.fetched_at`,
          [k.id, raw.slug, k.role, k.found, k.blockHeight ?? null, k.deployedAt ?? null, k.sourceBytes ?? null, k.txTotal ?? null, raw.fetchedAt],
        );
      }
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      c.release();
    }
  }
  async getAllRaw() {
    const r = await this.pool.query<{ payload: ProtocolRaw }>('SELECT payload FROM protocol_raw ORDER BY slug');
    return r.rows.map((x) => x.payload);
  }
  async saveScores(scores: RiskScore[]) {
    for (const s of scores) {
      const p = toPoint(s);
      await this.pool.query(
        `INSERT INTO risk_scores (slug, computed_at, day, methodology_version, overall, band, liquidity, activity, collateral, transparency, details)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (slug, day) DO UPDATE SET computed_at = EXCLUDED.computed_at, overall = EXCLUDED.overall, band = EXCLUDED.band,
           liquidity = EXCLUDED.liquidity, activity = EXCLUDED.activity, collateral = EXCLUDED.collateral, transparency = EXCLUDED.transparency, details = EXCLUDED.details`,
        [s.slug, s.computedAt, p.date, s.methodologyVersion, s.overall, s.band, p.liquidity, p.activity, p.collateral, p.transparency, s],
      );
    }
  }
  async getLatestScores() {
    const r = await this.pool.query<{ details: RiskScore }>(
      `SELECT DISTINCT ON (slug) details FROM risk_scores ORDER BY slug, computed_at DESC`,
    );
    return r.rows.map((x) => x.details);
  }
  async getScoreHistory(slug: string, days: number) {
    const r = await this.pool.query<ScorePoint>(
      `SELECT day::text AS date, overall, liquidity, activity, collateral, transparency FROM risk_scores
       WHERE slug = $1 AND day >= CURRENT_DATE - $2::int ORDER BY day`,
      [slug, days],
    );
    return r.rows.map((p) => ({
      ...p,
      overall: Number(p.overall),
      liquidity: num(p.liquidity),
      activity: num(p.activity),
      collateral: num(p.collateral),
      transparency: num(p.transparency),
    }));
  }
  async saveEvents(events: RiskEvent[]) {
    for (const e of events) {
      await this.pool.query(
        `INSERT INTO risk_events (id, slug, ts, kind, severity, message, delta) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [e.id, e.slug, e.ts, e.kind, e.severity, e.message, e.delta],
      );
    }
  }
  async getEvents(sinceIso?: string) {
    const r = await this.pool.query<RiskEvent>(
      `SELECT id, slug, ts::text AS ts, kind, severity, message, delta FROM risk_events
       WHERE ($1::timestamptz IS NULL OR ts >= $1) ORDER BY ts DESC LIMIT 500`,
      [sinceIso ?? null],
    );
    return r.rows.map((e) => ({ ...e, ts: new Date(e.ts).toISOString(), delta: num(e.delta) }));
  }
  async saveSnapshot(snapshot: Snapshot) {
    await this.pool.query(`INSERT INTO snapshots (generated_at, payload) VALUES ($1,$2)`, [snapshot.generatedAt, snapshot]);
  }
  async getSnapshot() {
    const r = await this.pool.query<{ payload: Snapshot }>(`SELECT payload FROM snapshots ORDER BY generated_at DESC LIMIT 1`);
    return r.rows[0]?.payload ?? null;
  }
  async recordRun(job: string, status: string, notes: string) {
    await this.pool.query(`INSERT INTO pipeline_runs (job, status, notes) VALUES ($1,$2,$3)`, [job, status, notes]);
  }
  async close() { await this.pool.end(); }
}

const num = (v: unknown): number | null => (v == null ? null : Number(v));

export async function createStore(): Promise<Store> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: url });
    await pool.query('SELECT 1');
    return new PgStore(pool);
  }
  return new FileStore(DATA_DIR);
}
