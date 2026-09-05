/**
 * Brokerage connection health. The point this screen makes is about freshness:
 * observed data lags, and the product says so rather than implying live prices.
 */
export const connectionCadence = [
  { id: 'realtime', tone: 'positive', title: 'Real time', meta: 'Connection health' },
  { id: 'daily', tone: 'cobalt', title: 'Daily', meta: 'Holdings snapshots' },
  { id: 'daily-plus-one', tone: 'amber', title: 'Daily +1', meta: 'Transaction history' },
] as const;

/** SnapTrade sandbox account shapes a judge can switch between. */
export const snaptradeScenarios = [
  {
    id: 'self-directed',
    title: 'Self-directed',
    meta: '2 funded accounts · positions and history',
  },
  { id: 'cash-only', title: 'Cash only', meta: '1 cash account · no holdings' },
  { id: 'no-transactions', title: 'No transactions', meta: 'Positions · no activity history' },
  { id: 'invalid', title: 'Invalid credentials', meta: 'Connection fails · repair flow' },
] as const;

export type SnapTradeScenarioId = (typeof snaptradeScenarios)[number]['id'];

export const snaptradeInstitutions = [
  { id: 'alpaca', title: 'Alpaca Paper' },
  { id: 'test-brokerage', title: 'Test Brokerage One' },
] as const;

export const connections = {
  snaptrade: {
    id: 'snaptrade',
    title: 'SnapTrade Sandbox',
    accounts: 2,
    holdingsSyncedAt: '18:42 UTC',
    transactionsSyncedThrough: '3 Sep',
    healthy: true,
  },
  alpaca: {
    id: 'alpaca',
    title: 'Alpaca Paper',
    meta: 'Disabled · access expired',
    staleSince: '21 Aug',
    healthy: false,
  },
} as const;
