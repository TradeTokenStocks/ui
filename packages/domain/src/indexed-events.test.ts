import { describe, expect, test } from 'bun:test';

import { multiplierEventsToLedgerRows, parseMultiplierEventsResponse } from './indexed-events';

const payload = {
  data: {
    TokenizedStock_MultiplierUpdated: [
      {
        id: '11155111_11696141_226',
        newMultiplier: '1000000000000000000',
        contractAddress: '0x3a4fCeF090332aFcf648b4A3aE448DF942eA122F',
        blockNumber: '11696141',
      },
      {
        id: '11155111_11696134_303',
        newMultiplier: '2000000000000000000',
        contractAddress: '0x3a4fCeF090332aFcf648b4A3aE448DF942eA122F',
        blockNumber: '11696134',
      },
    ],
  },
};

describe('indexed multiplier events', () => {
  test('validates and maps the Envio response into live ledger rows', () => {
    const rows = multiplierEventsToLedgerRows(parseMultiplierEventsResponse(payload));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: 'envio-11155111_11696141_226',
      provenance: 'onchain',
      title: 'NVDAx multiplier updated',
      meta: 'xStock · 2.0000× → 1.0000×',
      amount: { kind: 'multiplier', value: 1 },
      time: '#11696141',
    });
  });

  test('rejects malformed indexer payloads', () => {
    expect(() => parseMultiplierEventsResponse({ data: {} })).toThrow();
    expect(() =>
      parseMultiplierEventsResponse({
        data: { TokenizedStock_MultiplierUpdated: [{ id: 'bad' }] },
      }),
    ).toThrow();
  });
});
