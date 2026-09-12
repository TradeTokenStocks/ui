/**
 * The wire contract between the clients and the SnapTrade routes.
 *
 * The `credential` that travels over these types is opaque by design: the
 * server seals a SnapTrade user's secret to one Privy subject, and a client
 * only ever stores and replays it. Web holds it in an HttpOnly cookie and never
 * sees it at all; mobile has no cookie jar, so it keeps the same value in
 * SecureStore and presents it in a header.
 */

/** The two clients that can request a hosted SnapTrade connection session. */
export type SnapTradeClient = 'web' | 'mobile';

/**
 * How a client without a cookie jar presents its sealed credential.
 *
 * It lives in the domain so the route and the app cannot drift on the spelling.
 */
export const SNAPTRADE_CREDENTIAL_HEADER = 'x-snaptrade-credential';

export type SnapTradePortalRequest = {
  client: SnapTradeClient;
  /** Opaque server-encrypted credential previously returned to the mobile app. */
  credential?: string;
  /** SnapTrade brokerage authorization UUID when repairing a live connection. */
  reconnect?: string;
};

export type SnapTradePortalSuccess = {
  ok: true;
  redirectUri: string;
  /** Mobile persists this in SecureStore. Web receives the same value as an HttpOnly cookie. */
  credential?: string;
};

export type SnapTradeErrorCode =
  | 'BAD_REQUEST'
  | 'NOT_AUTHENTICATED'
  | 'NOT_CONFIGURED'
  | 'CREDENTIAL_INVALID'
  | 'UPSTREAM_ERROR';

export type SnapTradePortalFailure = {
  ok: false;
  /** Present only when registration succeeded before a later upstream failure. */
  credential?: string;
  error: {
    code: SnapTradeErrorCode;
    message: string;
  };
};

export type SnapTradePortalResponse = SnapTradePortalSuccess | SnapTradePortalFailure;

/**
 * A single equity position observed at a brokerage.
 *
 * Everything here is read-only by construction: there is no position id a
 * client could trade against, because the SnapTrade boundary in this product
 * only ever reads. Options, futures and CFDs are deliberately absent — a
 * contract's `units × price` is not its market value, and a consolidated
 * exposure figure that quietly mixes the two would be wrong rather than
 * incomplete.
 */
export type BrokeragePosition = {
  ticker: string;
  name: string;
  shares: number;
  priceUsd: number;
  valueUsd: number;
};

export type SnapTradeHoldingsSuccess = {
  ok: true;
  /** False when no USD brokerage account is linked — an empty state, not an error. */
  connected: boolean;
  /** The institution name, or `N institutions` when several are linked. */
  institution: string | null;
  accountCount: number;
  /**
   * Brokerage-reported total across accounts, which includes cash. Prefer it
   * over summing `positions`: the brokerage knows about holdings SnapTrade
   * cannot itemise, and this is the figure consolidated exposure is built on.
   */
  totalValueUsd: number;
  positions: BrokeragePosition[];
  /** ISO-8601 timestamp of the data SnapTrade returned, not of this request. */
  syncedAt: string | null;
};

export type SnapTradeHoldingsFailure = SnapTradePortalFailure;

export type SnapTradeHoldingsResponse = SnapTradeHoldingsSuccess | SnapTradeHoldingsFailure;

export function isSnapTradePortalResponse(value: unknown): value is SnapTradePortalResponse {
  if (!value || typeof value !== 'object' || !('ok' in value)) return false;
  if (value.ok === true) return 'redirectUri' in value && typeof value.redirectUri === 'string';
  return isSnapTradeFailure(value);
}

export function isSnapTradeHoldingsResponse(value: unknown): value is SnapTradeHoldingsResponse {
  if (!value || typeof value !== 'object' || !('ok' in value)) return false;
  if (value.ok !== true) return isSnapTradeFailure(value);
  return (
    'connected' in value &&
    typeof value.connected === 'boolean' &&
    'totalValueUsd' in value &&
    typeof value.totalValueUsd === 'number' &&
    'positions' in value &&
    Array.isArray(value.positions)
  );
}

function isSnapTradeFailure(value: object): boolean {
  const error = 'error' in value ? value.error : null;
  return (
    'ok' in value &&
    value.ok === false &&
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  );
}
