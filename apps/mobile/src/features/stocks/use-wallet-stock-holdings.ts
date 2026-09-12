import { useEmbeddedEthereumWallet } from "@privy-io/expo";
import {
  hackathonDeployment,
  readWalletStockHoldings,
  transactionErrorMessage,
  type WalletStockHolding,
} from "@tradetoken/domain";
import { tokenizedStocks } from "@tradetoken/domain/fixtures";
import { useEffect, useState } from "react";
import type { Address } from "viem";

const REFRESH_MS = 30_000;

const priceUsdFor = (underlying: string) =>
  tokenizedStocks.find((item) => item.ticker === underlying)?.priceUsd;

/** Deployed stock tokens held by the embedded wallet, polled while live. */
export function useWalletStockHoldings() {
  const { wallets } = useEmbeddedEthereumWallet();
  const address = wallets[0]?.address as Address | undefined;
  const live = hackathonDeployment.status === "live" && Boolean(address);
  const [holdings, setHoldings] = useState<WalletStockHolding[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hackathonDeployment.status !== "live" || !address) return;
    const deployment = hackathonDeployment;
    let cancelled = false;
    const load = () =>
      readWalletStockHoldings({ deployment, account: address, priceUsdFor })
        .then((next) => {
          if (cancelled) return;
          setHoldings(next);
          setError(null);
        })
        .catch((cause) => {
          if (!cancelled)
            setError(transactionErrorMessage(cause, "Balances unavailable."));
        });
    void load();
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [address]);

  const visible = live ? holdings : null;

  return {
    live,
    holdings: visible,
    totalUsd: visible?.reduce((total, item) => total + item.valueUsd, 0) ?? 0,
    error: live ? error : null,
  };
}
