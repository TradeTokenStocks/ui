/** The two clients that can request a hosted SnapTrade connection session. */
export type SnapTradeClient = 'web' | 'mobile';

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

export function isSnapTradePortalResponse(value: unknown): value is SnapTradePortalResponse {
  if (!value || typeof value !== 'object' || !('ok' in value)) return false;
  if (value.ok === true) return 'redirectUri' in value && typeof value.redirectUri === 'string';
  const error = 'error' in value ? value.error : null;
  return (
    value.ok === false &&
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  );
}
