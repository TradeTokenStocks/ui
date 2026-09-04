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

/**
 * A single tokenised or brokerage representation of one company.
 *
 * `executable` is the load-bearing field: it is what separates a balance that
 * can settle an Aqua fill from one that is merely observed. The UI must never
 * total these together without saying which part of the total is inert.
 */
export type Representation = {
  id: string;
  label: string;
  /** Token counts, multipliers, cost basis — always monospaced. */
  detail: string;
  value: string;
  /** Cobalt for B20, violet for a partner mint, outline for brokerage. */
  tint: 'cobalt' | 'violet' | 'outline';
  executable: boolean;
  /** Share of the company's total value, for the stacked bar. */
  sharePct: number;
};

export type CompanyDetail = {
  ticker: string;
  name: string;
  price: string;
  change: string;
  changeIsPositive: boolean;
  total: string;
  totalCents: string;
  shareEquivalents: string;
  /** Sum of the executable legs — the only figure the Allocate button may use. */
  executableTotal: string;
  representations: Representation[];
};

/**
 * NVDA is the demo path and its figures come straight from the design document.
 * Apple and Tesla are extrapolated from their `observedPct` / `onchainPct`
 * splits above so that tapping any row leads somewhere real rather than a dead
 * end — same rules, same arithmetic, still simulated. Apple's 1.0026 multiplier
 * is the cash dividend in `events`.
 */
export const companyDetails: Record<string, CompanyDetail> = {
  NVDA: {
    ticker: 'NVDA',
    name: 'Nvidia',
    price: '$178.40',
    change: '+2.4%',
    changeIsPositive: true,
    total: '$42,180',
    totalCents: '.10',
    shareEquivalents: '236.4 share-equivalents',
    executableTotal: '$21,129',
    representations: [
      {
        id: 'nvda-brokerage',
        label: 'Brokerage · Test Brokerage One',
        detail: '118 shares · basis $142.10 · simulated',
        value: '$21,051',
        tint: 'outline',
        executable: false,
        sharePct: 58,
      },
      {
        id: 'nvda-b20',
        label: 'Coinbase B20 · nvda',
        detail: '64.2 tokens · multiplier 1.0000',
        value: '$11,453',
        tint: 'cobalt',
        executable: true,
        sharePct: 27,
      },
      {
        id: 'nvda-partner',
        label: 'xNVDA · partner mint',
        detail: '54.5 tokens · peg 0.998',
        value: '$9,676',
        tint: 'violet',
        executable: true,
        sharePct: 15,
      },
    ],
  },
  AAPL: {
    ticker: 'AAPL',
    name: 'Apple',
    price: '$232.15',
    change: '−0.3%',
    changeIsPositive: false,
    total: '$31,905',
    totalCents: '.00',
    shareEquivalents: '137.4 share-equivalents',
    executableTotal: '$3,829',
    representations: [
      {
        id: 'aapl-brokerage',
        label: 'Brokerage · Test Brokerage One',
        detail: '121 shares · basis $198.40 · simulated',
        value: '$28,076',
        tint: 'outline',
        executable: false,
        sharePct: 88,
      },
      {
        id: 'aapl-b20',
        label: 'Coinbase B20 · aapl',
        detail: '16.5 tokens · multiplier 1.0026',
        value: '$3,829',
        tint: 'cobalt',
        executable: true,
        sharePct: 12,
      },
    ],
  },
  TSLA: {
    ticker: 'TSLA',
    name: 'Tesla',
    price: '$412.80',
    change: '+4.1%',
    changeIsPositive: true,
    total: '$19,640',
    totalCents: '.00',
    shareEquivalents: '47.6 share-equivalents',
    executableTotal: '$15,319',
    representations: [
      {
        id: 'tsla-brokerage',
        label: 'Brokerage · Test Brokerage One',
        detail: '10 shares · basis $301.55 · simulated',
        value: '$4,321',
        tint: 'outline',
        executable: false,
        sharePct: 22,
      },
      {
        id: 'tsla-b20',
        label: 'Coinbase B20 · tsla',
        detail: '37.1 tokens · multiplier 1.0000',
        value: '$15,319',
        tint: 'cobalt',
        executable: true,
        sharePct: 78,
      },
    ],
  },
};

/** Ties a home-screen row to its detail screen. */
export const tickerByCompany: Record<string, string> = {
  Nvidia: 'NVDA',
  Apple: 'AAPL',
  Tesla: 'TSLA',
};
