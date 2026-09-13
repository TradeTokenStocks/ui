import { useEffect, useState } from 'react';
import type { LedgerRow } from '@tradetoken/domain';
import { snapTradeApiUrl as apiUrl } from '@/lib/snaptrade';

export function useIndexedEvents() {
  const [events, setEvents] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(Boolean(apiUrl));
  const [error, setError] = useState<string | null>(
    apiUrl ? null : 'Indexer API is not configured.',
  );

  useEffect(() => {
    if (!apiUrl) return;
    const controller = new AbortController();
    void fetch(`${apiUrl}/api/envio/multiplier-events`, { signal: controller.signal })
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
