# Bicora Risk Layer — Risk Scoring Methodology

**Version 1.0.0 · September 2026 · applies to prototype v0.1**

Every tracked protocol receives an **Overall Risk Score from 0 to 100, where higher means lower risk**, plus four component scores. All inputs, mappings and weights are public, versioned with the API (`GET /v1/methodology`), and every observed factor value is shown on the protocol page and returned by `GET /v1/protocol-risk`.

Scores are analytics, not financial advice or an audit.

---

## 1. Composite score

```
overall = 0.30 · Liquidity + 0.25 · Activity + 0.25 · Collateral + 0.20 · Transparency
```

| Component | Weight | Question it answers |
|---|---|---|
| Liquidity Health | 30% | How deep, how stable and how trending is the value locked? |
| Protocol Activity | 25% | Is the protocol actually used, by how many addresses, and reliably? |
| Collateral Health | 25% | For lending / CDP markets: how stretched is utilisation? |
| Security & Transparency | 20% | Can the public verify the code, audits, docs and control? |

**Re-weighting.** When a component is not applicable (no collateralised borrowing) or its inputs are unavailable, its weight is redistributed proportionally across the remaining components. The effective weights are published with every score (`effective_weights`). Example: a DEX with no collateral component is scored `0.40·L + 0.333·A + 0.267·T`.

**Rounding.** Factor and component scores are kept to one decimal; the overall score is rounded to an integer before banding.

### Risk bands

| Band | Score | Meaning |
|---|---|---|
| Low | 75–100 | Deep liquidity, healthy collateral, documented |
| Moderate | 60–74 | Acceptable conditions, one indicator lagging |
| Elevated | 40–59 | Two or more indicators under threshold |
| High | 0–39 | Thin liquidity or unhealthy collateral |

---

## 2. Component definitions

Every factor maps an observed value to 0–100 with a documented piecewise-linear function (values between breakpoints are interpolated; values outside are clamped). Factor weights are within the component.

### 2.1 Liquidity Health (30%)

Source: DefiLlama Stacks-chain TVL history (`chainTvls.Stacks`), cleaned per §3.

| Factor | Weight | Observed value | Mapping |
|---|---|---|---|
| Liquidity depth | 50% | current TVL (USD) | log₁₀ scale: $100K → 0 · $1M → 25 · $10M → 50 · $100M → 75 · $1B → 100 |
| 30-day trend | 25% | TVL now ÷ TVL 30 days ago − 1 | −50% → 0 · −20% → 30 · 0% → 65 · +20% → 90 · +50% → 100 |
| 30-day stability | 25% | max drawdown (dd) and daily volatility (σ) over the last 30 points | 0.6 · f(dd) + 0.4 · g(σ), where f: 2% → 100 · 10% → 80 · 25% → 45 · 50% → 10 · 80% → 0 and g: 1%/d → 100 · 3% → 80 · 6% → 50 · 12% → 15 · 25% → 0 |

Rationale: depth is the primary buffer against exit pressure; the log scale reflects diminishing returns of size within a small ecosystem. Trend and stability penalise capital flight and erratic adapters alike.

### 2.2 Protocol Activity (25%)

Source: Hiro Stacks API, confirmed transactions whose **direct target** is one of the protocol's registered entry-point contracts (`config/protocols.json`), over the last 7 days and the prior 7 days.

| Factor | Weight | Observed value | Mapping |
|---|---|---|---|
| Transactions, 7d | 40% | count | log₁₀ scale: 10 → 0 · 100 → 33 · 1,000 → 67 · 10,000 → 100 |
| Unique senders, 7d | 35% | distinct sender principals | log₁₀ scale: 5 → 0 · 50 → 37 · 500 → 74 · 2,500 → 100 |
| Week-over-week trend | 15% | tx (7d) ÷ tx (prior 7d) − 1 | −60% → 10 · −30% → 35 · 0% → 60 · +30% → 85 · +100% → 100. **Excluded** when the prior week is not covered. |
| Success rate | 10% | successful ÷ all | 70% → 0 · 85% → 40 · 95% → 80 · 99% → 100 |

Sampling: the indexer pages at most 1,200 transactions per contract per run. If the cap is reached before 7 days are covered, counts are extrapolated linearly to 7 days and flagged `sampled` / “est.” in the UI and API.

### 2.3 Collateral Health (25%)

Applies to protocols flagged `hasCollateral` (lending, CDP). Source: DefiLlama `Stacks-borrowed` series. DefiLlama TVL for lending markets excludes borrowed value, so **supplied = TVL + borrowed** and **utilisation = borrowed ÷ supplied**.

| Factor | Weight | Observed value | Mapping |
|---|---|---|---|
| Utilisation | 70% | borrowed ÷ supplied | ≤50% → 100 · 80% → 60 · 95% → 20 · 100% → 0 |
| Utilisation change, 7d | 30% | utilisation now − 7 days ago (points) | −10 pts → 100 · 0 → 80 · +10 pts → 40 · +20 pts → 10 |

Not applicable (weight redistributed) when the protocol has no collateralised borrowing, or when the adapter exposes no borrowed value (recorded in the component note).

### 2.4 Security & Transparency (20%)

Rubric over public sources. Static fields come from the protocol registry, each citing a public source; dynamic fields come from Hiro contract metadata.

| Factor | Weight | Observed value | Mapping |
|---|---|---|---|
| Contract source verifiable on-chain | 20% | registered contracts found on Stacks with readable Clarity source ÷ registered | share × 100 |
| Public audits listed | 25% | count of public audit references | 0 → 0 · 1 → 60 · 2+ → 100 |
| Public source repository | 15% | GitHub organisation / repo | yes → 100 |
| Public documentation | 10% | docs site | yes → 100 |
| Oldest tracked contract age | 15% | months since the earliest deployment | 0 → 0 · 6 → 35 · 12 → 65 · 24+ → 100 |
| Governance / upgrade control | 10% | dao · governance-contract · multisig · unknown | dao or governance contract → 100 · multisig → 60 · unknown → 0 |
| Bug bounty programme | 5% | public programme | yes → 100 |

This rubric does not assess audit scope or quality, nor does it detect admin keys in code. “unknown” governance means *not verified in v0.1*, which is scored as a transparency gap by design.

---

## 3. Data quality rules

1. **Adapter outliers.** Daily TVL points below 5% of the 90-day median are excluded when the series has since recovered above 50% of the median. A genuine, ongoing collapse is never excluded. Exclusions are counted and shown on the protocol page (`dataQuality.note`).
2. **Common calendar.** Ecosystem totals sum forward-filled protocol series on a daily calendar so that adapter gaps do not create false dips.
3. **Missing inputs are excluded, not zeroed.** A factor with no input is dropped and its weight redistributed inside the component; a component with no factors is dropped and its weight redistributed across components.
4. **Registry drift.** A registered contract that is not found on-chain lowers the source-verifiability factor and raises a transparency event.

---

## 4. Risk events

The scoring engine emits events on every run, deduplicated per protocol, day and rule. Severity is `info`, `watch` or `alert`.

| Kind | Rule |
|---|---|
| score | overall moves ≥ 3 points vs the previous run (alert at ≥ 8) |
| liquidity | TVL ≥ ±10% in 24h (alert at ≥ 25%), else ≥ ±15% over 7d (alert at ≥ 35%) |
| collateral | utilisation ≥ 80% (watch) or ≥ 90% (alert) |
| activity | weekly transactions ≥ ±40% vs the prior week; success rate < 85% with ≥ 20 transactions |
| transparency | a registered contract is not found on-chain |

---

## 5. Known limitations (v0.1)

- **Direct calls only.** Internal contract-to-contract calls are not counted. Protocols routed through aggregators, routers or newer entry points can be understated; the registry lists user-facing entry points and is reviewed with each release.
- **Borrowed value depends on the adapter.** Granite currently reports no borrowed value on DefiLlama, so its collateral component is not applicable.
- **Score history starts at the first run.** Only the liquidity component is back-filled (from TVL history); other components accumulate one point per scoring run.
- **Small ecosystem.** Absolute thresholds are tuned to Stacks in 2026 (tens of millions in TVL, hundreds to thousands of weekly transactions). They will be revisited as the ecosystem grows; changes bump the methodology version.
- **No price oracle.** All USD figures come from DefiLlama.

---

## 6. Chart palette

Component colours were validated for colour-vision deficiency and normal-vision separation as a four-slot categorical set on the cream surface: Liquidity `#d97a0a`, Activity `#2a78d6`, Collateral `#1baf7a`, Transparency `#4a3aa7`; Overall `#3a2a1c`. Bands use a reserved status palette and always ship with a text label.

---

## 7. Changelog

- **1.0.0 (2026-09)** — initial published methodology for prototype v0.1.
