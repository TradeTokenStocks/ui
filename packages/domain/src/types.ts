/**
 * The business model both clients agree on.
 *
 * One rule runs through all of it: anything `onchain` is allocatable and can
 * settle a fill; anything `observed` came from a brokerage connection, lags,
 * and can never settle anything. Every type here keeps that distinction
 * explicit rather than leaving it to a colour in a screen.
 *
 * Values are numbers, not display strings. Formatting is a client concern —
 * see `format.ts` for the shared rendering rules the numbers go through.
 */

/** Where a balance or ledger entry came from, and therefore what it can do. */
export type Provenance = 'onchain' | 'observed';

/** A company's total exposure as it appears in the portfolio list. */
export type CompanyExposure = {
  ticker: string;
  /** Two-letter tile initials. Not a ticker — the design uses these as a mark. */
  initials: string;
  name: string;
  /** Percent of this company's value observed at a brokerage. Outlined bar. */
  observedPct: number;
  /** Percent held onchain and allocatable. Cobalt-filled bar. */
  onchainPct: number;
  valueUsd: number;
  /** Day change. Only a strictly positive move is rendered as a gain. */
  changePct: number;
};

/**
 * What a ledger row's trailing figure actually means. These are not
 * interchangeable: a multiplier is not money, and "Review" is a call to
 * action. Modelling them apart stops clients from string-matching the
 * rendered text to decide how to style a row.
 */
export type LedgerAmount =
  | { kind: 'money'; valueUsd: number }
  | { kind: 'multiplier'; value: number }
  | { kind: 'action'; label: string };

export type LedgerRow = {
  id: string;
  provenance: Provenance;
  title: string;
  meta: string;
  amount: LedgerAmount;
  /**
   * Human label as the design writes it ('now', '17m ago', '29 Aug').
   * Deliberately not a timestamp: these are sandbox fixtures, and a real clock
   * would make 'now' drift away from the narrated demo without telling anyone
   * anything true.
   */
  time: string;
};

/**
 * A single tokenised or brokerage representation of one company.
 *
 * `executable` is the load-bearing field: it separates a balance that can
 * settle an Aqua fill from one that is merely observed. Never total these
 * together without saying which part of the total is inert.
 */
export type Representation = {
  id: string;
  label: string;
  /** Token counts, multipliers, cost basis — always rendered monospaced. */
  detail: string;
  valueUsd: number;
  /** Cobalt for B20, violet for a partner mint, outline for brokerage. */
  tint: 'cobalt' | 'violet' | 'outline';
  executable: boolean;
  /** Share of the company's total value, for the stacked bar. */
  sharePct: number;
};

export type CompanyDetail = {
  ticker: string;
  name: string;
  priceUsd: number;
  changePct: number;
  totalUsd: number;
  /**
   * Share-equivalents, not token counts. One B20 token is not one share once a
   * multiplier has moved, so the headline unit is the one that survives a
   * corporate action.
   */
  shareEquivalents: number;
  representations: Representation[];
};

/** How wide a band is allowed to drift before it stops earning. */
export type DriftRisk = 'High' | 'Moderate' | 'Low';

/**
 * The Aqua primitive a strategy is built on. Only `concentrated` has a
 * working builder today — `pegged` (same-stock, two representations) is the
 * hackathon's stretch goal, and `xyk` (full-range) isn't planned for this
 * product: a stock/USDC pair doesn't hold near a fixed ratio, which is why
 * `pegged` is used for same-stock pairs instead of stock/USDC ones.
 */
export type StrategyMechanism = 'concentrated' | 'pegged' | 'xyk';

/**
 * A single open concentrated-band strategy, as shown in the Strategies list
 * and its detail screen. A user can have zero, one, or several of these open
 * at once — the list is keyed by `ticker`, so routing to a detail screen is
 * always `/strategy/[ticker]`.
 */
export type StrategySummary = {
  ticker: string;
  mechanism: StrategyMechanism;
  openDays: number;
  depositedUsd: number;
  bandPct: number;
  /** Both derived from spot at `bandPct`: spot × (1 − pct) and × (1 + pct). */
  lowerUsd: number;
  upperUsd: number;
  spotUsd: number;
  fills: number;
  feesEarnedUsd: number;
  /** Share of the position currently held as stock rather than USDC. */
  stockPct: number;
  timeInBandPct: number;
  gainVsDepositPct: number;
  feeTierPct: number;
  networkFeeUsd: number;
};
