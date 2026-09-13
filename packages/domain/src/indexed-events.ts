import { hackathonDeployment } from './deployment';
import type { LedgerRow } from './types';

export const ENVIO_GRAPHQL_URL = 'https://indexer.dev.hyperindex.xyz/b5fe9eb/v1/graphql';

export const MULTIPLIER_EVENTS_QUERY = `
  query MultiplierUpdates($limit: Int!) {
    TokenizedStock_MultiplierUpdated(
      order_by: { blockNumber: desc }
      limit: $limit
    ) {
      id
      newMultiplier
      contractAddress
      blockNumber
    }
  }
`;

export type IndexedMultiplierEvent = {
  id: string;
  newMultiplier: string;
  contractAddress: `0x${string}`;
  blockNumber: string;
};

export type MultiplierEventsResponse = {
  data: {
    TokenizedStock_MultiplierUpdated: IndexedMultiplierEvent[];
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseMultiplierEventsResponse(value: unknown): IndexedMultiplierEvent[] {
  if (!isRecord(value) || !isRecord(value.data)) {
    throw new Error('Envio returned an invalid GraphQL response.');
  }
  const rows = value.data.TokenizedStock_MultiplierUpdated;
  if (!Array.isArray(rows)) throw new Error('Envio multiplier events are missing.');

  return rows.map((row) => {
    if (
      !isRecord(row) ||
      typeof row.id !== 'string' ||
      typeof row.newMultiplier !== 'string' ||
      typeof row.contractAddress !== 'string' ||
      !/^0x[0-9a-fA-F]{40}$/.test(row.contractAddress) ||
      typeof row.blockNumber !== 'string' ||
      !/^\d+$/.test(row.blockNumber) ||
      !/^\d+$/.test(row.newMultiplier)
    ) {
      throw new Error('Envio returned a malformed multiplier event.');
    }
    return row as IndexedMultiplierEvent;
  });
}

function formatMultiplier(raw: string): string {
  const value = BigInt(raw);
  const whole = value / BigInt(10) ** BigInt(18);
  const fraction = ((value % BigInt(10) ** BigInt(18)) / BigInt(10) ** BigInt(14))
    .toString()
    .padStart(4, '0');
  return `${whole}.${fraction}`;
}

/** Convert raw Envio updates into the ledger model shared by web and mobile. */
export function multiplierEventsToLedgerRows(events: readonly IndexedMultiplierEvent[]): LedgerRow[] {
  const sorted = [...events].sort((a, b) => {
    const blockDelta = BigInt(b.blockNumber) - BigInt(a.blockNumber);
    return blockDelta === BigInt(0) ? b.id.localeCompare(a.id) : blockDelta > BigInt(0) ? 1 : -1;
  });

  return sorted.map((event, index) => {
    const address = event.contractAddress.toLowerCase();
    const token =
      hackathonDeployment.status === 'live'
        ? hackathonDeployment.stocks.find((stock) => stock.address.toLowerCase() === address)
        : undefined;
    const previous = sorted
      .slice(index + 1)
      .find((candidate) => candidate.contractAddress.toLowerCase() === address);
    const issuer = token?.issuer ?? 'Stock token';
    const symbol = token?.symbol ?? `${event.contractAddress.slice(0, 6)}…${event.contractAddress.slice(-4)}`;
    const next = formatMultiplier(event.newMultiplier);

    return {
      id: `envio-${event.id}`,
      provenance: 'onchain',
      title: `${symbol} multiplier updated`,
      meta: previous
        ? `${issuer} · ${formatMultiplier(previous.newMultiplier)}× → ${next}×`
        : `${issuer} · initialized at ${next}×`,
      amount: { kind: 'multiplier', value: Number(BigInt(event.newMultiplier)) / 1e18 },
      time: `#${event.blockNumber}`,
    };
  });
}
