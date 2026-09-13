import * as SecureStore from 'expo-secure-store';
import {
  isSnapTradeHoldingsResponse,
  isSnapTradePortalResponse,
  SNAPTRADE_CREDENTIAL_HEADER,
  type SnapTradeErrorCode,
  type SnapTradeHoldingsSuccess,
  type SnapTradePortalSuccess,
} from '@tradetoken/domain';

/**
 * The mobile side of the SnapTrade boundary.
 *
 * The credential kept here is opaque and server-sealed: it names a SnapTrade
 * user bound to one Privy subject, and this app can only store it and hand it
 * back. It lives in SecureStore rather than plain storage because possessing it
 * is what lets a request read that user's brokerage.
 */

const CREDENTIAL_KEY = 'snaptrade-credential-v1';

export const snapTradeApiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

/**
 * A refusal the server explained. The code matters as much as the message:
 * expired access asks for a trip through the portal, an unconfigured build is
 * not worth showing anyone, and a screen cannot tell those apart from prose.
 */
export class SnapTradeRequestError extends Error {
  constructor(
    readonly code: SnapTradeErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'SnapTradeRequestError';
  }
}

export async function clearSnapTradeCredential(): Promise<void> {
  await SecureStore.deleteItemAsync(CREDENTIAL_KEY);
}

export async function createSnapTradePortal(accessToken: string): Promise<SnapTradePortalSuccess> {
  if (!snapTradeApiUrl) throw new Error('Live brokerage connections are not configured.');
  const credential = await SecureStore.getItemAsync(CREDENTIAL_KEY);
  const response = await fetch(`${snapTradeApiUrl}/api/snaptrade/portal`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ client: 'mobile', ...(credential ? { credential } : {}) }),
  });
  const payload: unknown = await response.json();
  if (!isSnapTradePortalResponse(payload)) throw new Error('The server returned an invalid response.');
  if (payload.ok && payload.credential) {
    await SecureStore.setItemAsync(CREDENTIAL_KEY, payload.credential);
  }
  if (!payload.ok) {
    if (payload.error.code === 'CREDENTIAL_INVALID') {
      await SecureStore.deleteItemAsync(CREDENTIAL_KEY);
    }
    throw new SnapTradeRequestError(payload.error.code, payload.error.message);
  }
  return payload;
}

/**
 * Read-only holdings for the linked brokerage.
 *
 * Without a stored credential the server answers with the disconnected state
 * rather than an error, so the caller renders an empty state without
 * special-casing it.
 */
export async function fetchSnapTradeHoldings(
  accessToken: string,
): Promise<SnapTradeHoldingsSuccess> {
  if (!snapTradeApiUrl) throw new Error('Live brokerage connections are not configured.');
  const credential = await SecureStore.getItemAsync(CREDENTIAL_KEY);
  const response = await fetch(`${snapTradeApiUrl}/api/snaptrade/holdings`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(credential ? { [SNAPTRADE_CREDENTIAL_HEADER]: credential } : {}),
    },
  });
  const payload: unknown = await response.json();
  if (!isSnapTradeHoldingsResponse(payload)) {
    throw new Error('The server returned an invalid response.');
  }
  if (!payload.ok) {
    if (payload.error.code === 'CREDENTIAL_INVALID') {
      await SecureStore.deleteItemAsync(CREDENTIAL_KEY);
    }
    throw new SnapTradeRequestError(payload.error.code, payload.error.message);
  }
  return payload;
}
