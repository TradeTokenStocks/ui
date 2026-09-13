import { useEmbeddedEthereumWallet } from "@privy-io/expo";
import {
  hackathonDeployment,
  parseDecimalUnits,
  stockTokenAbi,
  tokenUnitsToUsdE6,
} from "@tradetoken/domain";
import { tokenizedStocks } from "@tradetoken/domain/fixtures";
import { useCallback, useEffect, useState } from "react";
import { createPublicClient, http, type Address } from "viem";

import { robinHoodTestnet } from "@/lib/chains";

const REFRESH_MS = 30_000;

export type WalletStockHolding = {
  id: string;
  symbol: string;
  underlying: string;
  units: bigint;
  valueUsd: number;
};

/**
 * Every deployed stock token the embedded wallet holds, valued at the fixture
 * price times the token's live multiplier. Aqua strategies never escrow, so
 * wallet balances already include liquidity committed to open strategies.
 */
export function useWalletStockHoldings() {
  const { wallets } = useEmbeddedEthereumWallet();
  const address = wallets[0]?.address as Address | undefined;
  const live = hackathonDeployment.status === "live" && Boolean(address);
  const [holdings, setHoldings] = useState<WalletStockHolding[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const read = useCallback(async () => {
    if (hackathonDeployment.status !== "live" || !address) return null;
    const deployment = hackathonDeployment;
    const client = createPublicClient({
      chain: robinHoodTestnet,
      transport: http(deployment.rpcUrl),
    });
    return Promise.all(
      deployment.stocks.map(async (stock) => {
        const [units, multiplier] = await Promise.all([
          client.readContract({
            address: stock.address,
            abi: stockTokenAbi,
            functionName: "balanceOf",
            args: [address],
          }),
          client.readContract({
            address: stock.address,
            abi: stockTokenAbi,
            functionName: stock.multiplierRead,
          }),
        ]);
        const price = tokenizedStocks.find(
          (item) => item.ticker === stock.underlying,
        )?.priceUsd;
        const valueUsdE6 =
          price && units > BigInt(0) && multiplier > BigInt(0)
            ? tokenUnitsToUsdE6({
                tokenUnits: units,
                priceUsdE6: parseDecimalUnits(price.toFixed(6), 6),
                multiplierE18: multiplier,
                tokenDecimals: stock.decimals,
              })
            : BigInt(0);
        return {
          id: stock.id,
          symbol: stock.symbol,
          underlying: stock.underlying,
          units,
          valueUsd: Number(valueUsdE6) / 1e6,
        } satisfies WalletStockHolding;
      }),
    );
  }, [address]);

  const refresh = useCallback(async () => {
    try {
      const next = await read();
      setHoldings(next);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [read]);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    const load = () =>
      read()
        .then((next) => {
          if (cancelled) return;
          setHoldings(next);
          setError(null);
        })
        .catch((cause) => {
          if (!cancelled)
            setError(cause instanceof Error ? cause.message : String(cause));
        });
    void load();
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [live, read]);

  const visible = live ? holdings : null;

  return {
    live,
    holdings: visible,
    totalUsd: visible?.reduce((total, item) => total + item.valueUsd, 0) ?? 0,
    error: live ? error : null,
    refresh,
  };
}
