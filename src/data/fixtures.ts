/**
 * Demo fixtures, lifted from the design document's own state so the UI renders
 * the numbers it was designed against rather than invented ones.
 *
 * EVERYTHING HERE IS SIMULATED. Nothing in this file talks to a brokerage, a
 * chain, or Aqua. It exists so the screens can be built and reviewed before the
 * service layer lands; when it does, these become the fixture implementation
 * behind the portfolio and strategy interfaces rather than being deleted.
 *
 * The one rule the design holds to, and so does this data: anything `onchain`
 * is allocatable and drawn accent-filled; anything `observed` came from a
 * brokerage connection, lags, and can never settle a fill.
 */

export type Provenance = 'onchain' | 'observed';

export type CompanyExposure = {
  /** Two-letter tile initials. Not a ticker — the design uses these as a mark. */
  initials: string;
  name: string;
  /** Percent of this company's value observed at a brokerage. Outlined bar. */
  observedPct: number;
  /** Percent held onchain and allocatable. Cobalt-filled bar. */
  onchainPct: number;
  value: string;
  change: string;
  /** `null` renders in muted ink rather than green — a flat or negative day. */
  changeIsPositive: boolean | null;
};

export type LedgerRow = {
  id: string;
  provenance: Provenance;
  title: string;
  meta: string;
  amount: string;
  time: string;
};

export const account = {
  name: 'Maya',
  initial: 'M',
  /** Drives the amber "Sandbox" chip. Never hide this while data is simulated. */
  isSandbox: true,
} as const;

export const totals = {
  /** Wallet + brokerage. The design shows cents at 30% opacity. */
  exposure: '184,320',
  exposureCents: '.55',
  changeAbsolute: '+$2,104.90',
  changeRelative: '+1.15% today',
  /** Onchain, and the only figure a strategy can actually draw on. */
  walletAllocatable: '$71,910',
  /** Brokerage, observed only. */
  brokerageObserved: '$112,410',
  holdingsCount: 14,
} as const;

export const companies: CompanyExposure[] = [
  {
    initials: 'NV',
    name: 'Nvidia',
    observedPct: 58,
    onchainPct: 42,
    value: '$42,180',
    change: '+2.4%',
    changeIsPositive: true,
  },
  {
    initials: 'AA',
    name: 'Apple',
    observedPct: 88,
    onchainPct: 12,
    value: '$31,905',
    change: '−0.3%',
    changeIsPositive: null,
  },
  {
    initials: 'TS',
    name: 'Tesla',
    observedPct: 22,
    onchainPct: 78,
    value: '$19,640',
    change: '+4.1%',
    changeIsPositive: true,
  },
];

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
    amount: 'Review',
    time: '11 Sep',
  },
  {
    id: 'aapl-div-onchain',
    provenance: 'onchain',
    title: 'Apple cash dividend',
    meta: '$0.25 per share · paid as multiplier',
    amount: '1.0026',
    time: '29 Aug',
  },
  {
    id: 'aapl-div-brokerage',
    provenance: 'observed',
    title: 'Apple cash dividend',
    meta: 'Test Brokerage One · simulated',
    amount: '+$35.50',
    time: '29 Aug',
  },
];

export const activity: LedgerRow[] = [
  {
    id: 'fill-buy',
    provenance: 'onchain',
    title: 'Aqua fill · buy',
    meta: 'nvda·B20 / USDC · 0.42 @ 176.90',
    amount: '−$74.30',
    time: 'now',
  },
  {
    id: 'fill-sell',
    provenance: 'onchain',
    title: 'Aqua fill · sell',
    meta: 'nvda·B20 / USDC · 0.31 @ 179.85',
    amount: '+$55.75',
    time: '17m ago',
  },
  {
    id: 'div-received',
    provenance: 'observed',
    title: 'Dividend received',
    meta: 'AAPL · Test Brokerage One · simulated',
    amount: '+$35.50',
    time: '29 Aug',
  },
  {
    id: 'band-opened',
    provenance: 'onchain',
    title: 'Band opened',
    meta: '$12,000 · signed in wallet',
    amount: '−$12,000',
    time: '19 Aug',
  },
  {
    id: 'buy-nvda',
    provenance: 'observed',
    title: 'Buy 18 NVDA',
    meta: 'Test Brokerage One · simulated',
    amount: '−$3,062',
    time: '14 Aug',
  },
];

/** Whether the Events segment shows its amber "needs review" dot. */
export const hasUnreviewedEvents = true;
