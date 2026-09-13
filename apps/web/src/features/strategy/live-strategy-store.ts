'use client';

import type { LiveStrategyRecord } from '@tradetoken/domain';
import { useSyncExternalStore } from 'react';

/**
 * Onchain strategies opened from this browser. The strategy itself lives in
 * Aqua; this only remembers the signed order and receipts needed to show and
 * trade it, keyed the same way as the mobile store.
 */
const STORAGE_KEY = 'tradetoken.live-aqua-strategies.v1';
const CHANGE_EVENT = 'tradetoken:live-aqua-strategies';
const EMPTY: readonly LiveStrategyRecord[] = [];
let cachedRaw: string | null | undefined;
let cachedRecords: readonly LiveStrategyRecord[] = EMPTY;

function readRecords(): readonly LiveStrategyRecord[] {
  if (typeof window === 'undefined') return EMPTY;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedRecords;

  cachedRaw = raw;
  if (!raw) return (cachedRecords = EMPTY);

  try {
    const parsed = JSON.parse(raw) as unknown;
    cachedRecords = Array.isArray(parsed) ? (parsed as LiveStrategyRecord[]) : EMPTY;
  } catch {
    cachedRecords = EMPTY;
  }
  return cachedRecords;
}

function writeRecords(records: readonly LiveStrategyRecord[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(listener: () => void) {
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}

export function useLiveStrategies() {
  return useSyncExternalStore(subscribe, readRecords, () => EMPTY);
}

export function saveLiveStrategy(record: LiveStrategyRecord) {
  writeRecords([record, ...readRecords().filter((candidate) => candidate.id !== record.id)]);
}

export function updateLiveStrategy(id: string, patch: Partial<LiveStrategyRecord>) {
  const records = readRecords();
  if (!records.some((record) => record.id === id)) {
    throw new Error('Live strategy metadata was not found.');
  }
  writeRecords(records.map((record) => (record.id === id ? { ...record, ...patch } : record)));
}
