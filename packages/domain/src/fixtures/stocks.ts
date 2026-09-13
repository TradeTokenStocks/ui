import type { TokenizedStock } from '../types';
import { hackathonDeployment } from '../deployment';

type StockSeed = Omit<TokenizedStock, 'id' | 'issuer' | 'symbol' | 'walletBalance'>;

const seeds: StockSeed[] = [
  { ticker: 'NVDA', name: 'Nvidia', priceUsd: 178.4, changePct: 2.4, dividendYieldPct: 0.08, decimals: 18, multiplier: 1, categories: ['Tokenized stocks', 'Tech', 'Semis', 'RWA'] },
  { ticker: 'AAPL', name: 'Apple', priceUsd: 232.15, changePct: -0.3, dividendYieldPct: 0.52, decimals: 18, multiplier: 1.0026, categories: ['Tokenized stocks', 'Tech', 'RWA'] },
  { ticker: 'TSLA', name: 'Tesla', priceUsd: 412.8, changePct: 4.1, dividendYieldPct: 0, decimals: 18, multiplier: 1, categories: ['Tokenized stocks', 'Tech', 'RWA'] },
  { ticker: 'MSFT', name: 'Microsoft', priceUsd: 448.3, changePct: 0.8, dividendYieldPct: 0.71, decimals: 18, multiplier: 1, categories: ['Tokenized stocks', 'Tech', 'RWA'] },
  { ticker: 'AMZN', name: 'Amazon', priceUsd: 186.4, changePct: 1.1, dividendYieldPct: 0, decimals: 18, multiplier: 1, categories: ['Tokenized stocks', 'Tech', 'RWA'] },
  { ticker: 'COIN', name: 'Coinbase', priceUsd: 220.15, changePct: -1.2, dividendYieldPct: 0, decimals: 18, multiplier: 1, categories: ['Tokenized stocks', 'Tech', 'RWA'] },
];

const issuerDetails = {
  xstock: { suffix: 'x', label: 'xStock' },
  ondo: { suffix: 'on', label: 'Ondo' },
} as const;

const deployedAddressById = new Map(
  hackathonDeployment.status === 'live'
    ? hackathonDeployment.stocks.map((stock) => [stock.id, stock.address] as const)
    : [],
);

export const tokenizedStocks: readonly TokenizedStock[] = seeds.flatMap((stock, stockIndex) =>
  (Object.entries(issuerDetails) as Array<[keyof typeof issuerDetails, (typeof issuerDetails)[keyof typeof issuerDetails]]>).map(
    ([issuer, details], issuerIndex) => {
      const id = `${issuer}-${stock.ticker.toLowerCase()}`;
      return ({
      ...stock,
      id,
      issuer,
      symbol: `${stock.ticker}${details.suffix}`,
      ...(deployedAddressById.get(id) ? { address: deployedAddressById.get(id)! } : {}),
      walletBalance: stock.ticker === 'NVDA' ? (issuer === 'xstock' ? 50 : 40) : stockIndex + issuerIndex === 1 ? 12.5 : 0,
      });
    },
  ),
);

export function stockRepresentation(stockId: string): TokenizedStock | undefined {
  return tokenizedStocks.find((stock) => stock.id === stockId);
}

export function pairedRepresentations(ticker: string): readonly TokenizedStock[] {
  return tokenizedStocks.filter((stock) => stock.ticker === ticker.toUpperCase());
}
