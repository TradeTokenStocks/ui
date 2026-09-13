import { useEmbeddedEthereumWallet } from "@privy-io/expo";
import {
  deployedStock,
  hackathonDeployment,
  stockTokenAbi,
} from "@tradetoken/domain";
import { useEffect, useState } from "react";
import { createPublicClient, formatUnits, http, type Address } from "viem";

import { robinHoodTestnet } from "@/lib/chains";

function compactBalance(value: bigint, decimals: number) {
  return Number(formatUnits(value, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

export function useLivePairBalances(tokenAId: string, tokenBId: string) {
  const { wallets } = useEmbeddedEthereumWallet();
  const address = wallets[0]?.address as Address | undefined;
  const [balances, setBalances] = useState<{ a: string; b: string } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    const deployment =
      hackathonDeployment.status === "live" ? hackathonDeployment : null;
    if (!address || !deployment) {
      return;
    }

    const read = async () => {
      const tokenA = deployedStock(deployment, tokenAId);
      const tokenB = deployedStock(deployment, tokenBId);
      const client = createPublicClient({
        chain: robinHoodTestnet,
        transport: http(deployment.rpcUrl),
      });
      const [a, b] = await Promise.all([
        client.readContract({
          address: tokenA.address,
          abi: stockTokenAbi,
          functionName: "balanceOf",
          args: [address],
        }),
        client.readContract({
          address: tokenB.address,
          abi: stockTokenAbi,
          functionName: "balanceOf",
          args: [address],
        }),
      ]);
      if (!cancelled)
        setBalances({
          a: compactBalance(a, tokenA.decimals),
          b: compactBalance(b, tokenB.decimals),
        });
    };

    void read().catch((error) => {
      console.warn("Could not read live stock balances:", error);
      if (!cancelled) setBalances(null);
    });
    return () => {
      cancelled = true;
    };
  }, [address, tokenAId, tokenBId]);

  return balances;
}
