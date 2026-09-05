import type { StrategySummary } from '../types';

/**
 * The one open strategy the demo inspects: a concentrated NVDA/USDC band opened
 * 14 days ago from executable exposure only.
 *
 * Kept for callers that only ever dealt with a single strategy. New code
 * should read from `strategies` instead, which is what the Strategies list
 * and its `/strategy/[ticker]` detail route are keyed off.
 */
export const activeStrategy = {
  ticker: 'NVDA',
  mechanism: 'concentrated',
  openDays: 14,
  depositedUsd: 12000,
  bandPct: 10,
  /** Both derived from NVDA spot at 10%: 178.40 × 0.9 and × 1.1. */
  lowerUsd: 160.56,
  upperUsd: 196.24,
  spotUsd: 178.4,
  fills: 318,
  feesEarnedUsd: 247.18,
  /** Share of the position currently held as stock rather than USDC. */
  stockPct: 38,
  timeInBandPct: 91,
  gainVsDepositPct: 2.06,
  feeTierPct: 0.3,
  networkFeeUsd: 0.04,
} as const satisfies StrategySummary;

/**
 * Every strategy the sandbox account currently has open. The list drives the
 * Strategies tab; each row routes to `/strategy/[ticker]` for the same detail
 * scene the old single-strategy screen rendered.
 */
export const strategies: readonly StrategySummary[] = [
  activeStrategy,
  {
    ticker: 'AAPL',
    mechanism: 'concentrated',
    openDays: 6,
    depositedUsd: 6000,
    bandPct: 14,
    /** Derived from AAPL spot at 14%: 226.20 × 0.86 and × 1.14. */
    lowerUsd: 194.53,
    upperUsd: 257.87,
    spotUsd: 226.2,
    fills: 84,
    feesEarnedUsd: 41.6,
    stockPct: 52,
    timeInBandPct: 78,
    gainVsDepositPct: 0.94,
    feeTierPct: 0.3,
    networkFeeUsd: 0.04,
  },
];

/**
 * The Nvidia 10-for-1 split. Value and token count are unchanged; only the
 * multiplier moves, which is why the band's price bounds have to be rescaled.
 */
export const nvdaSplit = {
  id: 'nvda-split',
  title: 'Nvidia 10-for-1',
  effective: '11 Sep',
  multiplierBefore: 1,
  multiplierAfter: 10,
  shareEquivalentsBefore: 236.4,
  affectedStrategies: 1,
} as const;

/** Apple's cash dividend, paid onchain as a multiplier rather than as cash. */
export const aaplDividend = {
  id: 'aapl-div',
  paid: '29 Aug',
  perShareUsd: 0.25,
  multiplier: 1.0026,
  brokerageCashUsd: 35.5,
  tokens: 11.5,
} as const;
