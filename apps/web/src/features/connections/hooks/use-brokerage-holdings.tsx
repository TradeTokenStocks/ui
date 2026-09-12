'use client';

import { createContext, useCallback, useContext, useMemo } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useQuery } from '@tanstack/react-query';
import {
  isSnapTradeHoldingsResponse,
  type BrokeragePosition,
  type SnapTradeErrorCode,
  type SnapTradeHoldingsSuccess,
} from '@tradetoken/domain';

import { isPrivyConfigured } from '@/lib/privy';

/**
 * Observed brokerage holdings, read once and shared.
 *
 * Connections and Portfolio both need this figure and must never disagree
 * about it, so it is fetched in one place and handed down rather than queried
 * twice. It is also why this is a provider and not a bare hook: `usePrivy`
 * throws outside a `PrivyProvider`, and the sandbox deployment runs without
 * one — the unconfigured case has to resolve to an honest empty state instead
 * of taking the page down.
 */
export type BrokerageHoldings = {
  connected: boolean;
  institution: string | null;
  accountCount: number;
  /** Brokerage-reported total, including cash. Zero while disconnected. */
  totalValueUsd: number;
  positions: BrokeragePosition[];
  syncedAt: string | null;
  isLoading: boolean;
  /** True during a manual refresh, when stale figures are still on screen. */
  isRefreshing: boolean;
  error: string | null;
  /** Access expired: the portal has to be walked again before data returns. */
  needsReconnect: boolean;
  refetch: () => void;
};

const EMPTY: BrokerageHoldings = {
  connected: false,
  institution: null,
  accountCount: 0,
  totalValueUsd: 0,
  positions: [],
  syncedAt: null,
  isLoading: false,
  isRefreshing: false,
  error: null,
  needsReconnect: false,
  refetch: () => {},
};

const BrokerageHoldingsContext = createContext<BrokerageHoldings>(EMPTY);

export function useBrokerageHoldings(): BrokerageHoldings {
  return useContext(BrokerageHoldingsContext);
}

export function BrokerageHoldingsProvider({ children }: { children: React.ReactNode }) {
  if (!isPrivyConfigured) {
    return (
      <BrokerageHoldingsContext.Provider value={EMPTY}>{children}</BrokerageHoldingsContext.Provider>
    );
  }
  return <LiveBrokerageHoldings>{children}</LiveBrokerageHoldings>;
}

class BrokerageError extends Error {
  constructor(
    readonly code: SnapTradeErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'BrokerageError';
  }
}

function LiveBrokerageHoldings({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const enabled = ready && authenticated;

  const query = useQuery({
    queryKey: ['snaptrade', 'holdings'],
    enabled,
    // Holdings are a daily snapshot upstream; re-reading them on every mount
    // would spend rate limit to redraw the same number.
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<SnapTradeHoldingsSuccess> => {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error('Your session expired. Sign in and try again.');
      const response = await fetch('/api/snaptrade/holdings', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload: unknown = await response.json();
      if (!isSnapTradeHoldingsResponse(payload)) {
        throw new Error('The server returned an invalid response.');
      }
      if (!payload.ok) throw new BrokerageError(payload.error.code, payload.error.message);
      return payload;
    },
  });

  const refetch = useCallback(() => void query.refetch(), [query]);

  const value = useMemo<BrokerageHoldings>(() => {
    const data = query.data;
    const code = query.error instanceof BrokerageError ? query.error.code : null;
    return {
      connected: data?.connected ?? false,
      institution: data?.institution ?? null,
      accountCount: data?.accountCount ?? 0,
      totalValueUsd: data?.totalValueUsd ?? 0,
      positions: data?.positions ?? [],
      syncedAt: data?.syncedAt ?? null,
      isLoading: enabled && query.isPending,
      isRefreshing: query.isFetching && query.data !== undefined,
      // An unconfigured deployment is the sandbox's normal state, not a fault
      // worth putting in front of someone.
      error: code === 'NOT_CONFIGURED' ? null : (query.error?.message ?? null),
      needsReconnect: code === 'CREDENTIAL_INVALID',
      refetch,
    };
  }, [enabled, query.data, query.error, query.isPending, query.isFetching, refetch]);

  return (
    <BrokerageHoldingsContext.Provider value={value}>{children}</BrokerageHoldingsContext.Provider>
  );
}
