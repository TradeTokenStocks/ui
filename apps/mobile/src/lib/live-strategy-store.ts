import type { LiveStrategyRecord } from "@tradetoken/domain";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "tradetoken.live-aqua-strategies.v1";

export type { LiveStrategyRecord };

let memoryCache: LiveStrategyRecord[] = [];
const listeners = new Set<(records: LiveStrategyRecord[]) => void>();

function publish(records: LiveStrategyRecord[]) {
  memoryCache = records;
  listeners.forEach((listener) => listener(records));
}

export async function loadLiveStrategies(): Promise<LiveStrategyRecord[]> {
  let serialized: string | null;
  try {
    serialized = await SecureStore.getItemAsync(STORAGE_KEY);
  } catch {
    return memoryCache;
  }
  if (!serialized) return memoryCache;

  try {
    const records = JSON.parse(serialized) as LiveStrategyRecord[];
    publish(records);
    return records;
  } catch {
    return memoryCache;
  }
}

export async function saveLiveStrategy(
  record: LiveStrategyRecord,
): Promise<void> {
  const existing = await loadLiveStrategies();
  const records = [
    record,
    ...existing.filter((candidate) => candidate.id !== record.id),
  ];
  publish(records);
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(records));
}

export async function updateLiveStrategy(
  id: string,
  patch: Partial<LiveStrategyRecord>,
): Promise<LiveStrategyRecord> {
  const existing = await loadLiveStrategies();
  const current = existing.find((record) => record.id === id);
  if (!current) throw new Error("Live strategy metadata was not found.");
  const updated = { ...current, ...patch };
  const records = existing.map((record) =>
    record.id === id ? updated : record,
  );
  publish(records);
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(records));
  return updated;
}

export function useLiveStrategies() {
  const [records, setRecords] = useState(memoryCache);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setRecords(await loadLiveStrategies());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    listeners.add(setRecords);
    void refresh();
    return () => {
      listeners.delete(setRecords);
    };
  }, [refresh]);

  return { records, loading, refresh };
}
