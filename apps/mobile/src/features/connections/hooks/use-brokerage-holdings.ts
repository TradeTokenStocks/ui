import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrivy } from '@privy-io/expo';
import type { BrokeragePosition } from '@tradetoken/domain';

import { fetchSnapTradeHoldings, snapTradeApiUrl, SnapTradeRequestError } from '@/lib/snaptrade';

/**
 * Observed brokerage holdings for the signed-in user.
 *
 * Deliberately plain state rather than a cache layer: this app reads holdings
 * on one screen, and a daily snapshot behind a pull-to-refresh does not need
 * invalidation rules to stay honest.
 */
export type BrokerageHoldings = {
  connected: boolean;
  institution: string | null;
  accountCount: number;
  totalValueUsd: number;
  positions: BrokeragePosition[];
  syncedAt: string | null;
  isLoading: boolean;
  error: string | null;
  /** Access expired: the portal has to be walked again before data returns. */
  needsReconnect: boolean;
  refetch: () => void;
};

const EMPTY = {
  connected: false,
  institution: null,
  accountCount: 0,
  totalValueUsd: 0,
  positions: [] as BrokeragePosition[],
  syncedAt: null,
  isLoading: false,
  error: null,
  needsReconnect: false,
} satisfies Omit<BrokerageHoldings, 'refetch'>;

export function useBrokerageHoldings(): BrokerageHoldings {
  const { user, isReady, getAccessToken } = usePrivy();
  const [state, setState] = useState<Omit<BrokerageHoldings, 'refetch'>>(EMPTY);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const signedIn = isReady && Boolean(user);

  const load = useCallback(async () => {
    if (!signedIn || !snapTradeApiUrl) {
      setState(EMPTY);
      return;
    }
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error('Your session expired. Sign in and try again.');
      const holdings = await fetchSnapTradeHoldings(accessToken);
      if (!mounted.current) return;
      setState({
        connected: holdings.connected,
        institution: holdings.institution,
        accountCount: holdings.accountCount,
        totalValueUsd: holdings.totalValueUsd,
        positions: holdings.positions,
        syncedAt: holdings.syncedAt,
        isLoading: false,
        error: null,
        needsReconnect: false,
      });
    } catch (caught) {
      if (!mounted.current) return;
      const code = caught instanceof SnapTradeRequestError ? caught.code : null;
      setState({
        ...EMPTY,
        // An unconfigured build is the sandbox's normal state, not a fault
        // worth putting in front of someone.
        error:
          code === 'NOT_CONFIGURED'
            ? null
            : caught instanceof Error
              ? caught.message
              : 'Could not read brokerage holdings.',
        needsReconnect: code === 'CREDENTIAL_INVALID',
      });
    }
  }, [getAccessToken, signedIn]);

  // Read once per sign-in change, not per render: `getAccessToken` is not a
  // stable reference in every Privy build, and depending on `load` directly
  // would turn that into a fetch loop.
  const latest = useRef(load);
  useEffect(() => {
    latest.current = load;
  }, [load]);
  useEffect(() => {
    void latest.current();
  }, [signedIn]);

  const refetch = useCallback(() => void load(), [load]);

  return { ...state, refetch };
}
