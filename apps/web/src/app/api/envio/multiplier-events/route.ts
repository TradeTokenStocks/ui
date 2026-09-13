import {
  ENVIO_GRAPHQL_URL,
  MULTIPLIER_EVENTS_QUERY,
  multiplierEventsToLedgerRows,
  parseMultiplierEventsResponse,
} from '@tradetoken/domain';

export const dynamic = 'force-dynamic';

export async function GET() {
  const endpoint = process.env.ENVIO_GRAPHQL_URL ?? ENVIO_GRAPHQL_URL;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: MULTIPLIER_EVENTS_QUERY, variables: { limit: 50 } }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Envio request failed with ${response.status}.`);
    const events = parseMultiplierEventsResponse(await response.json());
    return Response.json({ events: multiplierEventsToLedgerRows(events) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Envio request failed.';
    return Response.json({ error: message }, { status: 502 });
  }
}
