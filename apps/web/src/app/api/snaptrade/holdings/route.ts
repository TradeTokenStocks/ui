import { NextRequest, NextResponse } from 'next/server';
import { SnaptradeError, type Account, type AccountPosition } from 'snaptrade-typescript-sdk';
import type {
  BrokeragePosition,
  SnapTradeHoldingsFailure,
  SnapTradeHoldingsSuccess,
} from '@tradetoken/domain';

import { snapTradeServerConfig, type SnapTradeServerConfig } from '@/server/snaptrade/config';
import { snapTradeReader } from '@/server/snaptrade/client';
import { logUpstreamFailure, privySubject, readScope } from '@/server/snaptrade/session';

export const runtime = 'nodejs';

/**
 * Read-only brokerage holdings, normalised for the consolidated portfolio.
 *
 * SnapTrade's own `getUserHoldings` is deprecated and answers 410 for keys
 * registered after May 2026, so this composes the finer-grained endpoints it
 * points at: accounts, then positions per account.
 */

/**
 * Instrument kinds whose `units × price` is honestly their market value.
 * Options are quoted per share but sold in contracts, and futures and CFDs are
 * notional — including any of them would produce a confident wrong number in
 * the exposure figure, which is worse than leaving them out.
 */
const ITEMISED_KINDS = new Set(['stock', 'adr', 'etf', 'mutualfund', 'cef', 'crypto']);

/** Categories SnapTrade normalises as non-investment; they are not exposure. */
const EXCLUDED_CATEGORIES = new Set(['DEPOSIT', 'LOC']);

const DISCONNECTED: SnapTradeHoldingsSuccess = {
  ok: true,
  connected: false,
  institution: null,
  accountCount: 0,
  totalValueUsd: 0,
  positions: [],
  syncedAt: null,
};

function failure(
  status: number,
  code: SnapTradeHoldingsFailure['error']['code'],
  message: string,
) {
  return NextResponse.json<SnapTradeHoldingsFailure>({ ok: false, error: { code, message } }, { status });
}

/** A number SnapTrade sent as a string, or null when it is missing or unusable. */
function numeric(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isUsd(currency: unknown): boolean {
  return typeof currency !== 'string' || currency.toUpperCase() === 'USD';
}

/**
 * Every figure this route reports is in USD, so an account denominated in
 * anything else is left out whole — count, positions and total.
 *
 * Converting it would mean inventing a rate, and reporting its positions beside
 * a total that excludes them would imply the total was wrong. Dropping the
 * account is the only reading that stays true to what the brokerage said.
 */
function isUsdAccount(account: Account): boolean {
  const total = account.balance?.total;
  // A brokerage that reports no total tells us nothing to contradict; its
  // positions still have to pass the same currency check one by one.
  if (!total) return true;
  return isUsd(total.currency);
}

function laterOf(a: string | null, b: unknown): string | null {
  if (typeof b !== 'string' || !b) return a;
  if (!a) return b;
  return Date.parse(b) > Date.parse(a) ? b : a;
}

function institutionLabel(names: string[]): string | null {
  const distinct = [...new Set(names.filter(Boolean))];
  if (distinct.length === 0) return null;
  if (distinct.length === 1) return distinct[0] ?? null;
  return `${distinct.length} institutions`;
}

export async function GET(request: NextRequest) {
  let config: SnapTradeServerConfig;
  try {
    config = snapTradeServerConfig();
  } catch {
    return failure(503, 'NOT_CONFIGURED', 'Live brokerage connections are not configured yet.');
  }

  const subject = await privySubject(request, config);
  if (!subject) return failure(401, 'NOT_AUTHENTICATED', 'Sign in to read brokerage holdings.');

  const scope = readScope(request, config, subject);
  if (!scope.ok) {
    // Nothing linked yet is an empty state the portfolio renders, not a failure
    // it has to apologise for. A credential that will not open is different:
    // only the portal can repair it.
    if (scope.reason === 'NOT_LINKED') return NextResponse.json(DISCONNECTED);
    return failure(401, 'CREDENTIAL_INVALID', 'Brokerage access must be connected again.');
  }

  const snaptrade = snapTradeReader(config, scope.scope);

  try {
    const accounts = await snaptrade.listAccounts();
    const readable = accounts.filter(
      (account) =>
        !EXCLUDED_CATEGORIES.has(account.account_category ?? '') &&
        account.status !== 'closed' &&
        account.status !== 'archived' &&
        isUsdAccount(account),
    );

    // A registered user with no usable account is what an abandoned portal
    // session leaves behind, and reads the same as never having linked one.
    if (readable.length === 0) return NextResponse.json(DISCONNECTED);

    const positionPages = await Promise.all(
      readable.map((account) => snaptrade.listPositions(account.id)),
    );

    const merged = new Map<string, BrokeragePosition>();
    let totalValueUsd = 0;
    let syncedAt: string | null = null;

    for (const [index, account] of readable.entries()) {
      const page = positionPages[index];
      syncedAt = laterOf(syncedAt, page?.data_freshness?.as_of);
      syncedAt = laterOf(syncedAt, account.sync_status?.holdings?.last_successful_sync);

      let itemisedValueUsd = 0;
      for (const position of page?.results ?? []) {
        const holding = toPosition(position);
        if (!holding) continue;
        itemisedValueUsd += holding.valueUsd;
        const existing = merged.get(holding.ticker);
        merged.set(
          holding.ticker,
          existing
            ? {
                ...existing,
                shares: existing.shares + holding.shares,
                valueUsd: existing.valueUsd + holding.valueUsd,
              }
            : holding,
        );
      }

      // The brokerage's own total is the better figure: it includes cash and
      // anything SnapTrade could not itemise. Summed positions are the fallback
      // for brokerages that do not report one.
      totalValueUsd += numeric(account.balance?.total?.amount) ?? itemisedValueUsd;
    }

    return NextResponse.json<SnapTradeHoldingsSuccess>({
      ok: true,
      connected: true,
      institution: institutionLabel(readable.map((account) => account.institution_name)),
      accountCount: readable.length,
      totalValueUsd,
      positions: [...merged.values()].sort((a, b) => b.valueUsd - a.valueUsd),
      syncedAt,
    });
  } catch (error) {
    logUpstreamFailure('listUserAccounts / getAllAccountPositions', error);
    if (error instanceof SnaptradeError && (error.status === 401 || error.status === 403)) {
      return failure(401, 'CREDENTIAL_INVALID', 'Brokerage access must be connected again.');
    }
    return failure(502, 'UPSTREAM_ERROR', 'SnapTrade could not return holdings. Try again.');
  }
}

function toPosition(position: AccountPosition): BrokeragePosition | null {
  const instrument = position.instrument;
  if (!ITEMISED_KINDS.has(instrument.kind)) return null;
  // Money-market funds are already counted in the account's cash balance.
  if (position.cash_equivalent === true) return null;
  if (!isUsd(position.currency ?? instrument.currency)) return null;

  const shares = numeric(position.units);
  const priceUsd = numeric(position.price);
  if (shares === null || priceUsd === null || shares === 0) return null;

  const symbol: unknown = instrument.raw_symbol ?? instrument.symbol;
  if (typeof symbol !== 'string' || !symbol) return null;
  const description: unknown = instrument.description;

  return {
    ticker: symbol,
    name: typeof description === 'string' && description ? description : symbol,
    shares,
    priceUsd,
    valueUsd: shares * priceUsd,
  };
}
