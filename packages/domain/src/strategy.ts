import type { CompanyDetail, DriftRisk, Representation } from './types';

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
  const fillsPerDay = Math.max(4, Math.round(220 / bandPct));
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
