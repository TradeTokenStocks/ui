import { useSyncExternalStore } from 'react';
import type { DividendPreference } from '@tradetoken/domain';

export type AddedStockHolding = {
  amountUsd: number;
  preference: DividendPreference;
};

let holdings: Readonly<Record<string, AddedStockHolding>> = {};
const listeners = new Set<() => void>();

export function addStockHolding(ticker: string, amountUsd: number, preference: DividendPreference) {
  const current = holdings[ticker];
  holdings = {
    ...holdings,
    [ticker]: {
      amountUsd: (current?.amountUsd ?? 0) + amountUsd,
      preference,
    },
  };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return holdings;
}

export function useAddedStockHoldings() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
