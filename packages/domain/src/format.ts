import type { LedgerAmount } from './types';

/**
 * Shared rendering rules for numbers.
 *
 * These live in the domain rather than in each client on purpose. The product
 * puts a phone and a browser side by side in a demo, and a balance that reads
 * `$42,180.10` in one and `$42,180.1` in the other undermines the thing the
 * app is trying to claim. Rounding and sign conventions are part of the truth;
 * layout is not, and stays in the clients.
 */

/**
 * The design writes negatives with a real minus (U+2212), not a hyphen. It is
 * wider, aligns with the digits in Geist Mono, and is what the source HTML
 * uses.
 */
const MINUS = '−';

const groups = (value: number, digits: number) =>
  Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/** `$42,180` — the default for balances, which the design shows without cents. */
export function formatUsd(value: number, { digits = 0, sign = false } = {}) {
  const body = `$${groups(value, digits)}`;
  if (value < 0) return `${MINUS}${body}`;
  return sign ? `+${body}` : body;
}

/**
 * Splits a balance so the design can render cents at 30% opacity against a
 * full-size integer part. Returns the pieces rather than markup.
 */
export function splitUsd(value: number): { whole: string; cents: string } {
  const [whole = '0', cents = '00'] = groups(value, 2).split('.');
  return { whole: `$${whole}`, cents: `.${cents}` };
}

/** `+2.4%` / `−0.3%`. Always signed: a day change without a sign is unreadable. */
export function formatPercent(value: number, digits = 1) {
  const body = `${groups(value, digits)}%`;
  return value < 0 ? `${MINUS}${body}` : `+${body}`;
}

/** Bare grouped number — token counts, fill counts, share-equivalents. */
export function formatNumber(value: number, digits = 0) {
  const body = groups(value, digits);
  return value < 0 ? `${MINUS}${body}` : body;
}

/**
 * A day change is only rendered as a gain when it is strictly positive. Flat
 * and negative days both go to muted ink — the design has no red, because a
 * red day on a sandbox balance would be theatre.
 */
export function isGain(changePct: number) {
  return changePct > 0;
}

/**
 * A ledger row's trailing figure. Money is signed and shown to the cent,
 * multipliers get four places because the fourth is where a cash dividend
 * actually shows up, and an action renders its own label.
 */
export function formatLedgerAmount(amount: LedgerAmount): string {
  switch (amount.kind) {
    case 'money':
      return formatUsd(amount.valueUsd, { digits: 2, sign: true });
    case 'multiplier':
      return formatNumber(amount.value, 4);
    case 'action':
      return amount.label;
  }
}
