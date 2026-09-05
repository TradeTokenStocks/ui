import type { CompanyDetail, CompanyExposure } from '../types';

/**
 * EVERYTHING IN THIS DIRECTORY IS SIMULATED. Nothing here talks to a brokerage,
 * a chain, or Aqua. These are the numbers the design was drawn against, so the
 * screens render the figures they were reviewed with rather than invented ones.
 *
 * When a service layer lands these become the fixture implementation behind the
 * portfolio and strategy interfaces rather than being deleted.
 */

export const account = {
  name: 'Maya',
  initial: 'M',
  /** Drives the amber "Sandbox" chip. Never hide this while data is simulated. */
  isSandbox: true,
} as const;

export const totals = {
  /** Wallet + brokerage. The design shows the cents at 30% opacity. */
  exposureUsd: 184320.55,
  changeAbsoluteUsd: 2104.9,
  changePct: 1.15,
  /** Onchain, and the only figure a strategy can actually draw on. */
  walletAllocatableUsd: 71910,
  /** Brokerage, observed only. */
  brokerageObservedUsd: 112410,
  /** Only three are itemised below; the rest sit in the aggregate. */
  holdingsCount: 14,
} as const;

export const companies: CompanyExposure[] = [
  {
    ticker: 'NVDA',
    initials: 'NV',
    name: 'Nvidia',
    observedPct: 58,
    onchainPct: 42,
    valueUsd: 42180,
    changePct: 2.4,
  },
  {
    ticker: 'AAPL',
    initials: 'AA',
    name: 'Apple',
    observedPct: 88,
    onchainPct: 12,
    valueUsd: 31905,
    changePct: -0.3,
  },
  {
    ticker: 'TSLA',
    initials: 'TS',
    name: 'Tesla',
    observedPct: 22,
    onchainPct: 78,
    valueUsd: 19640,
    changePct: 4.1,
  },
];

/**
 * NVDA is the demo path and its figures come straight from the design document.
 * Apple and Tesla are extrapolated from their observed/onchain splits above so
 * that opening any row leads somewhere real rather than a dead end — same
 * rules, same arithmetic, still simulated. Apple's 1.0026 multiplier is the
 * cash dividend in the events ledger.
 */
export const companyDetails: Record<string, CompanyDetail> = {
  NVDA: {
    ticker: 'NVDA',
    name: 'Nvidia',
    priceUsd: 178.4,
    changePct: 2.4,
    totalUsd: 42180.1,
    shareEquivalents: 236.4,
    representations: [
      {
        id: 'nvda-brokerage',
        label: 'Brokerage · Test Brokerage One',
        detail: '118 shares · basis $142.10 · simulated',
        valueUsd: 21051,
        tint: 'outline',
        executable: false,
        sharePct: 58,
      },
      {
        id: 'nvda-b20',
        label: 'Coinbase B20 · nvda',
        detail: '64.2 tokens · multiplier 1.0000',
        valueUsd: 11453,
        tint: 'cobalt',
        executable: true,
        sharePct: 27,
      },
      {
        id: 'nvda-partner',
        label: 'xNVDA · partner mint',
        detail: '54.5 tokens · peg 0.998',
        valueUsd: 9676,
        tint: 'violet',
        executable: true,
        sharePct: 15,
      },
    ],
  },
  AAPL: {
    ticker: 'AAPL',
    name: 'Apple',
    priceUsd: 232.15,
    changePct: -0.3,
    totalUsd: 31905,
    shareEquivalents: 137.4,
    representations: [
      {
        id: 'aapl-brokerage',
        label: 'Brokerage · Test Brokerage One',
        detail: '121 shares · basis $198.40 · simulated',
        valueUsd: 28076,
        tint: 'outline',
        executable: false,
        sharePct: 88,
      },
      {
        id: 'aapl-b20',
        label: 'Coinbase B20 · aapl',
        detail: '16.5 tokens · multiplier 1.0026',
        valueUsd: 3829,
        tint: 'cobalt',
        executable: true,
        sharePct: 12,
      },
    ],
  },
  TSLA: {
    ticker: 'TSLA',
    name: 'Tesla',
    priceUsd: 412.8,
    changePct: 4.1,
    totalUsd: 19640,
    shareEquivalents: 47.6,
    representations: [
      {
        id: 'tsla-brokerage',
        label: 'Brokerage · Test Brokerage One',
        detail: '10 shares · basis $301.55 · simulated',
        valueUsd: 4321,
        tint: 'outline',
        executable: false,
        sharePct: 22,
      },
      {
        id: 'tsla-b20',
        label: 'Coinbase B20 · tsla',
        detail: '37.1 tokens · multiplier 1.0000',
        valueUsd: 15319,
        tint: 'cobalt',
        executable: true,
        sharePct: 78,
      },
    ],
  },
};

/** The embedded wallet the sandbox signs with. Not a funded address. */
export const wallet = {
  address: '0x7A4C18D2F37e65a9C3b92E49A8107D459B2C9E21',
  short: '0x7A4C…9E21',
  chain: 'Base',
} as const;
