import type { CompanyDetail, DriftRisk, Representation, StrategyMechanism, StrategySummary } from './types';

/**
 * Strategy and exposure arithmetic.
 *
 * Everything a screen would otherwise re-derive inline lives here, so the web
 * dashboard and the native app cannot quietly disagree about what a band is
 * worth. All of it is deterministic: same inputs, same output, no clock and no
 * network.
 */

/** Only the legs that can actually settle a fill. */
export function executableRepresentations(company: CompanyDetail): Representation[] {
  return company.representations.filter((rep) => rep.executable);
}

/**
 * The only figure an Allocate control may use. Deliberately derived from the
 * legs rather than stored: if a representation is added, the ceiling moves
 * with it instead of silently disagreeing with the list above it.
 */
export function executableTotalUsd(company: CompanyDetail): number {
  return executableRepresentations(company).reduce((sum, rep) => sum + rep.valueUsd, 0);
}

export type BandInputs = {
  priceUsd: number;
  allocationUsd: number;
  /** Half-width of the band as a percentage of spot. */
  bandPct: number;
};

export type BandProjection = {
  /** Below this the band is entirely stock — it bought all the way down. */
  lowerUsd: number;
  /** Above this the band is entirely USDC — it sold all the way up. */
  upperUsd: number;
  fillsPerDay: number;
  feesPerDayUsd: number;
  driftRisk: DriftRisk;
  /** A band opens half in stock and half in USDC. */
  stockSideUsd: number;
  usdcSideUsd: number;
  /** Tokens the stock side buys at spot. */
  tokens: number;
};

/**
 * Estimated from sandbox fill history, not a yield forecast. A tighter band
 * quotes more often and earns more fees, and is likelier to be walked out of.
 */
export function projectBand({ priceUsd, allocationUsd, bandPct }: BandInputs): BandProjection {
  const fillsPerDay = bandPct > 0 ? Math.max(4, Math.round(220 / bandPct)) : 4;
  const stockSideUsd = allocationUsd / 2;

  return {
    lowerUsd: priceUsd * (1 - bandPct / 100),
    upperUsd: priceUsd * (1 + bandPct / 100),
    fillsPerDay,
    feesPerDayUsd: allocationUsd * 0.0000042 * fillsPerDay,
    driftRisk: driftRiskFor(bandPct),
    stockSideUsd,
    usdcSideUsd: allocationUsd / 2,
    tokens: stockSideUsd / priceUsd,
  };
}

export function driftRiskFor(bandPct: number): DriftRisk {
  if (bandPct <= 7) return 'High';
  if (bandPct <= 16) return 'Moderate';
  return 'Low';
}

/** The allocation slider ceiling, snapped down so the steps land on round money. */
export function allocationCeilingUsd(executableUsd: number, step = 500) {
  if (executableUsd <= 0) return 0;
  return Math.max(1000, Math.floor(executableUsd / step) * step);
}

/**
 * A corporate action rescales the band without touching what it is worth.
 *
 * This is the centrepiece of the demo: on a 10-for-1 split the token balance
 * does not move and the deposited value does not move — the multiplier does,
 * so the price bounds have to divide by it or the band falls out of range.
 */
export function rescaleBand(
  band: { lowerUsd: number; upperUsd: number },
  multiplier: number,
): { lowerUsd: number; upperUsd: number } {
  return {
    lowerUsd: band.lowerUsd / multiplier,
    upperUsd: band.upperUsd / multiplier,
  };
}

/** Share-equivalents after a multiplier moves. Token count is unchanged. */
export function rescaleShareEquivalents(shareEquivalents: number, multiplier: number) {
  return shareEquivalents * multiplier;
}

/** The B20 token symbol for a company, as the product writes it. */
export function b20Symbol(ticker: string) {
  return `${ticker.toLowerCase()}·B20`;
}

/** The market a band trades on, e.g. `nvda·B20 / USDC`. */
export function bandMarket(ticker: string) {
  return `${b20Symbol(ticker)} / USDC`;
}

/** Display name for an Aqua strategy mechanism. */
export function strategyMechanismLabel(mechanism: StrategyMechanism): string {
  switch (mechanism) {
    case 'concentrated':
      return 'Concentrated liquidity';
    case 'pegged':
      return 'Same-stock pegged';
    case 'xyk':
      return 'Full range';
  }
}

/**
 * Whether a company has enough distinct executable representations to
 * support a Same-stock Pegged strategy — that strategy pairs two tokenized
 * representations of the same underlying stock (e.g. Coinbase B20 and an
 * Ondo representation of NVDA), so it needs at least two.
 */
export function hasPeggedEligibility(company: CompanyDetail): boolean {
  return executableRepresentations(company).length >= 2;
}

/**
 * Looks up a company by ticker, falling back to `fallbackTicker` when the
 * given one isn't recognized (an unrecognized or missing route param).
 * Centralizes what used to be an ad hoc `companyDetails[ticker] ??
 * companyDetails.NVDA` repeated at each call site, with no single place that
 * documented the fallback existed at all.
 *
 * Throws if `fallbackTicker` itself isn't present — that would mean the
 * fixture data is missing its own guaranteed demo company, not that the
 * user did anything wrong.
 */
export function resolveCompany(
  companyDetails: Record<string, CompanyDetail>,
  ticker: string | undefined,
  fallbackTicker: string,
): CompanyDetail {
  const found = ticker ? companyDetails[ticker.toUpperCase()] : undefined;
  if (found) return found;
  const fallback = companyDetails[fallbackTicker];
  if (!fallback) {
    throw new Error(`resolveCompany: fallback ticker "${fallbackTicker}" is missing from companyDetails`);
  }
  return fallback;
}

/**
 * Looks up an open strategy by ticker, falling back to the first one.
 *
 * Throws on an empty list rather than returning `undefined`: a strategy
 * detail screen is only ever reached by tapping a row in the Strategies list
 * or completing the review flow, both of which require at least one open
 * strategy to exist. An empty list renders the list's own empty state
 * instead, which has no link into this screen — so this function being
 * called with no strategies to show would mean that invariant broke
 * elsewhere, which is worth failing loudly for rather than silently
 * rendering an undefined strategy's fields.
 */
export function resolveStrategy(
  strategies: readonly StrategySummary[],
  ticker: string | undefined,
): StrategySummary {
  const found = strategies.find((s) => s.ticker === ticker?.toUpperCase());
  if (found) return found;
  const first = strategies[0];
  if (!first) throw new Error('resolveStrategy: called with an empty strategies list');
  return first;
}
