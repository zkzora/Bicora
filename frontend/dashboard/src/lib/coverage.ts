/**
 * What each protocol's DefiLlama TVL covers, as reviewed by Bicora against the adapter source.
 * Display-only: none of this changes a score. Protocols without an entry have not been reviewed.
 */
export interface Coverage {
  reviewedAt: string; // date the adapter source was read
  adapter: { label: string; url: string };
  tvlCovers: string[];
  tvlExcludes: string[];
  /** Present for lending protocols that report borrowing. */
  borrowed?: string;
  /** Why "gross supplied = TVL + borrowed" is only an estimate for this protocol. */
  grossSuppliedCaveat?: string;
  /** Why Bicora shows withdrawal liquidity as N/A. */
  withdrawable: string;
  /** Official protocol-reported total, only when a reliable timestamped source exists. */
  official: { status: 'shown'; label: string; value: number; asOf: string; covers: string; url: string } | { status: 'na'; reason: string };
  /** Verified and unresolved differences between DefiLlama and the protocol's own figures. */
  differences: { text: string; status: 'verified' | 'unresolved' }[];
}

export const COVERAGE: Record<string, Coverage> = {
  stackingdao: {
    reviewedAt: '2026-10-08',
    adapter: { label: 'DefiLlama-Adapters · projects/stackingdao/api.js', url: 'https://github.com/DefiLlama/DefiLlama-Adapters/blob/main/projects/stackingdao/api.js' },
    tvlCovers: [
      'STX backing stSTX and stSTXbtc: reserve-v1 and stx-reserve-v2, get-total-stx',
      'sBTC backing stBTC: stbtc-reserve, get-total-sbtc',
    ],
    tvlExcludes: [
      'Receipt tokens themselves (stSTX, stSTXbtc, stBTC): only their backing is counted, so nothing is counted twice inside StackingDAO',
      'Any STX not held in those reserves, such as native-staking STX that stays in users’ own accounts (inferred from the adapter reading only the reserves; amount not measured)',
    ],
    withdrawable: 'N/A. Reserve STX can be stacked and locked until its reward cycle ends, and DefiLlama does not report the idle share. TVL is not immediately withdrawable.',
    official: { status: 'na', reason: 'StackingDAO’s own dashboard reports a higher total, but Bicora has no timestamped, machine-readable source for it, so it is not shown.' },
    differences: [
      { text: 'Coverage: DefiLlama reads only the three reserves, so STX held outside them (for example native staking) is not in this TVL.', status: 'verified' },
      { text: 'StackingDAO’s own dashboard was reported at about $101M across stBTC, stSTX, stSTXbtc and native staking, against $83.0M here (2026-10-08 13:45 UTC). That figure, its timestamp and its prices could not be checked from Bicora, so the gap (about $18M) and how much native staking explains it are not established.', status: 'unresolved' },
      { text: 'On 2026-10-07 the sBTC in the stBTC reserve rose by about $27M while Zest’s sBTC fell and its stBTC and borrowed value rose by similar amounts (DefiLlama token data). This matches Zest’s stBTC strategy vault, which borrows sBTC to mint stBTC; the attribution is inferred, not traced on-chain.', status: 'verified' },
    ],
  },
  zest: {
    reviewedAt: '2026-10-08',
    adapter: { label: 'DefiLlama-Adapters · projects/zest-v2/api.js', url: 'https://github.com/DefiLlama/DefiLlama-Adapters/blob/main/projects/zest-v2/api.js' },
    tvlCovers: [
      'Token balances held by the seven Zest v2 vaults (STX, sBTC, stBTC, stSTX, stSTXbtc, USDCx, USDh)',
      'sBTC posted as collateral in v0-market-vault',
      'stBTC held by the stBTC strategy vault (zv-state-stbtc-0)',
    ],
    tvlExcludes: [
      'Other collateral in v0-market-vault: only its sBTC is read',
      'Strategy vault balances in zv-ops-stbtc-0',
      'Interest accrued but not yet repaid',
      'The legacy Zest deployment (a separate DefiLlama listing, not tracked by Bicora)',
    ],
    borrowed: 'Per vault, get-assets − get-available-assets: principal lent out, excluding accrued interest. From the same DefiLlama response and day as TVL.',
    grossSuppliedCaveat: 'TVL + borrowed also counts collateral that is not lendable (sBTC in the market vault, strategy stBTC) and leaves out accrued interest and collateral the adapter does not read. It is an estimate from DefiLlama inputs, not Zest’s official total supplied.',
    withdrawable: 'N/A. Only the vaults’ idle balances can be withdrawn by suppliers, but DefiLlama reports TVL by token, not by holder, so Bicora cannot separate them from collateral. Collateral backing open loans is not withdrawable.',
    official: { status: 'na', reason: 'No reliable timestamped total from Zest is available to Bicora.' },
    differences: [
      { text: 'stBTC in Zest (about $51M on 2026-10-08) is a StackingDAO receipt token whose sBTC backing is also in StackingDAO’s TVL; Bicora removes it from the de-duplicated ecosystem total.', status: 'verified' },
      { text: 'Borrowed rose from about $16M to $43M on 2026-10-07 (DefiLlama). The matching token moves fit the stBTC strategy vault borrowing sBTC to mint stBTC; that attribution is inferred, not traced on-chain.', status: 'verified' },
    ],
  },
};
