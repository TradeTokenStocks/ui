'use client';

import { useSyncExternalStore } from 'react';

export type CreatedSandboxStrategy = {
  id: string;
  ticker: string;
  mechanism: 'concentrated' | 'pegged';
  pairLabel: string;
  depositedUsd: number;
  feeTierPct: number;
  guardPct: number;
  lowerValue: number;
  upperValue: number;
  createdAt: number;
};

const STORAGE_KEY = 'tradetoken.created-strategies.v1';
const CHANGE_EVENT = 'tradetoken:created-strategies';
const EMPTY: readonly CreatedSandboxStrategy[] = [];
let cachedRaw: string | null | undefined;
let cachedStrategies: readonly CreatedSandboxStrategy[] = EMPTY;

function readStrategies(): readonly CreatedSandboxStrategy[] {
  if (typeof window === 'undefined') return EMPTY;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedStrategies;

  cachedRaw = raw;
  if (!raw) return (cachedStrategies = EMPTY);

  try {
    const parsed = JSON.parse(raw) as unknown;
    cachedStrategies = Array.isArray(parsed) ? (parsed as CreatedSandboxStrategy[]) : EMPTY;
  } catch {
    cachedStrategies = EMPTY;
  }
  return cachedStrategies;
}

function subscribe(listener: () => void) {
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}

export function useCreatedStrategies() {
  return useSyncExternalStore(subscribe, readStrategies, () => EMPTY);
}

export function addCreatedStrategy(strategy: Omit<CreatedSandboxStrategy, 'id' | 'createdAt'>) {
  const next: CreatedSandboxStrategy = {
    ...strategy,
    id: `${strategy.mechanism}-${strategy.ticker.toLowerCase()}-${Date.now()}`,
    createdAt: Date.now(),
  };
  const strategies = [next, ...readStrategies()];
  const raw = JSON.stringify(strategies);
  window.localStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedStrategies = strategies;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
