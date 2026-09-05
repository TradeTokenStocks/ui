import type { LedgerRow } from '../types';

/**
 * Corporate actions and dividends. The Nvidia split is the demo's centrepiece:
 * the raw token balance does not move, the multiplier does.
 */
export const events: LedgerRow[] = [
  {
    id: 'nvda-split',
    provenance: 'onchain',
    title: 'Nvidia 10-for-1 split',
    meta: 'multiplier 1.0000 → 10.0000 · 1 band affected',
    amount: { kind: 'action', label: 'Review' },
    time: '11 Sep',
  },
  {
    id: 'aapl-div-onchain',
    provenance: 'onchain',
    title: 'Apple cash dividend',
    meta: '$0.25 per share · paid as multiplier',
    amount: { kind: 'multiplier', value: 1.0026 },
    time: '29 Aug',
  },
  {
    id: 'aapl-div-brokerage',
    provenance: 'observed',
    title: 'Apple cash dividend',
    meta: 'Test Brokerage One · simulated',
    amount: { kind: 'money', valueUsd: 35.5 },
    time: '29 Aug',
  },
];

export const activity: LedgerRow[] = [
  {
    id: 'fill-buy',
    provenance: 'onchain',
    title: 'Aqua fill · buy',
    meta: 'nvda·B20 / USDC · 0.42 @ 176.90',
    amount: { kind: 'money', valueUsd: -74.3 },
    time: 'now',
  },
  {
    id: 'fill-sell',
    provenance: 'onchain',
    title: 'Aqua fill · sell',
    meta: 'nvda·B20 / USDC · 0.31 @ 179.85',
    amount: { kind: 'money', valueUsd: 55.75 },
    time: '17m ago',
  },
  {
    id: 'div-received',
    provenance: 'observed',
    title: 'Dividend received',
    meta: 'AAPL · Test Brokerage One · simulated',
    amount: { kind: 'money', valueUsd: 35.5 },
    time: '29 Aug',
  },
  {
    id: 'band-opened',
    provenance: 'onchain',
    title: 'Band opened',
    meta: '$12,000 · signed in wallet',
    amount: { kind: 'money', valueUsd: -12000 },
    time: '19 Aug',
  },
  {
    id: 'buy-nvda',
    provenance: 'observed',
    title: 'Buy 18 NVDA',
    meta: 'Test Brokerage One · simulated',
    amount: { kind: 'money', valueUsd: -3062 },
    time: '14 Aug',
  },
];

/** Activity scoped to each strategy detail; avoids showing NVDA fills inside AAPL. */
export const strategyActivity: Readonly<Record<string, readonly LedgerRow[]>> = {
  NVDA: activity.filter((row) => row.id !== 'div-received'),
  AAPL: [
    {
      id: 'aapl-fill-buy',
      provenance: 'onchain',
      title: 'Aqua fill · buy',
      meta: 'aapl·B20 / USDC · 0.18 @ 224.80',
      amount: { kind: 'money', valueUsd: -40.46 },
      time: '8m ago',
    },
    {
      id: 'aapl-fill-sell',
      provenance: 'onchain',
      title: 'Aqua fill · sell',
      meta: 'aapl·B20 / USDC · 0.12 @ 227.10',
      amount: { kind: 'money', valueUsd: 27.25 },
      time: '41m ago',
    },
    {
      id: 'div-received',
      provenance: 'observed',
      title: 'Dividend received',
      meta: 'AAPL · Test Brokerage One · simulated',
      amount: { kind: 'money', valueUsd: 35.5 },
      time: '29 Aug',
    },
    {
      id: 'aapl-band-opened',
      provenance: 'onchain',
      title: 'Band opened',
      meta: '$6,000 · signed in wallet',
      amount: { kind: 'money', valueUsd: -6000 },
      time: '30 Aug',
    },
  ],
};

/** Whether the Events segment shows its amber "needs review" dot. */
export const hasUnreviewedEvents = true;
