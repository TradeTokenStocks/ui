import * as SecureStore from 'expo-secure-store';
import {
  isSnapTradePortalResponse,
  type SnapTradePortalSuccess,
} from '@tradetoken/domain';

const CREDENTIAL_KEY = 'snaptrade-credential-v1';

export const snapTradeApiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

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
  if (payload.credential) await SecureStore.setItemAsync(CREDENTIAL_KEY, payload.credential);
  if (!payload.ok) throw new Error(payload.error.message);
  return payload;
}
