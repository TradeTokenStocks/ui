'use client';

import { useSyncExternalStore } from 'react';

/**
 * Whether the sandbox NVDA band has been rescaled after the split. Shared so
 * the strategy list, the strategy detail, and the events badge agree.
 */
let rescaled = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => rescaled;

export function useSplitRescaled() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function markSplitRescaled() {
  rescaled = true;
  listeners.forEach((listener) => listener());
}
