'use client';

import { useEffect, useState } from 'react';
import type { LedgerRow } from '@tradetoken/domain';

export function useIndexedEvents() {
  const [events, setEvents] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/envio/multiplier-events', { signal: controller.signal })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            typeof payload === 'object' && payload && 'error' in payload && typeof payload.error === 'string'
              ? payload.error
              : 'Could not load indexed events.',
          );
        }
        if (!payload || typeof payload !== 'object' || !('events' in payload) || !Array.isArray(payload.events)) {
          throw new Error('The event service returned an invalid response.');
        }
        setEvents(payload.events as LedgerRow[]);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : 'Could not load indexed events.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return { events, loading, error };
}
