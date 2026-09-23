-- Bicora Risk Layer v0.1 — PostgreSQL schema
-- Raw indexed data, computed scores, detected events, and denormalised snapshots.

CREATE TABLE IF NOT EXISTS protocol_raw (
  slug        text PRIMARY KEY,
  fetched_at  timestamptz NOT NULL,
  payload     jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS tvl_snapshots (
  slug         text NOT NULL,
  day          date NOT NULL,
  tvl_usd      numeric NOT NULL,
  borrowed_usd numeric,
  PRIMARY KEY (slug, day)
);

CREATE TABLE IF NOT EXISTS activity_snapshots (
  id             bigserial PRIMARY KEY,
  slug           text NOT NULL,
  fetched_at     timestamptz NOT NULL,
  window_days    int NOT NULL,
  tx_count       int NOT NULL,
  unique_senders int NOT NULL,
  success_rate   numeric NOT NULL,
  coverage_days  numeric NOT NULL,
  sampled        boolean NOT NULL,
  by_contract    jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS activity_snapshots_slug_idx ON activity_snapshots (slug, fetched_at DESC);

CREATE TABLE IF NOT EXISTS contract_info (
  contract_id  text PRIMARY KEY,
  slug         text NOT NULL,
  role         text NOT NULL,
  found        boolean NOT NULL,
  block_height int,
  deployed_at  timestamptz,
  source_bytes int,
  tx_total     int,
  fetched_at   timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS risk_scores (
  slug                text NOT NULL,
  day                 date NOT NULL,
  computed_at         timestamptz NOT NULL,
  methodology_version text NOT NULL,
  overall             numeric NOT NULL,
  band                text NOT NULL,
  liquidity           numeric,
  activity            numeric,
  collateral          numeric,
  transparency        numeric,
  details             jsonb NOT NULL,
  PRIMARY KEY (slug, day)
);

CREATE TABLE IF NOT EXISTS risk_events (
  id        text PRIMARY KEY,
  slug      text NOT NULL,
  ts        timestamptz NOT NULL,
  kind      text NOT NULL,
  severity  text NOT NULL,
  message   text NOT NULL,
  delta     numeric
);
CREATE INDEX IF NOT EXISTS risk_events_ts_idx ON risk_events (ts DESC);

CREATE TABLE IF NOT EXISTS snapshots (
  id           bigserial PRIMARY KEY,
  generated_at timestamptz NOT NULL,
  payload      jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id      bigserial PRIMARY KEY,
  job     text NOT NULL,
  status  text NOT NULL,
  notes   text,
  at      timestamptz NOT NULL DEFAULT now()
);
