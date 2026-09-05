/**
 * The one open strategy the demo inspects: a concentrated NVDA/USDC band opened
 * 14 days ago from executable exposure only.
 */
export const activeStrategy = {
  ticker: 'NVDA',
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
} as const;

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
