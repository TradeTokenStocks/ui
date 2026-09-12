import { useEmbeddedEthereumWallet } from "@privy-io/expo";
import {
  buildQuoteCall,
  buildSwapCall,
  decodeLiveOrder,
  hackathonDeployment,
  requireLiveDeployment,
  stockTokenAbi,
} from "@tradetoken/domain";
import { useCallback, useEffect, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  http,
  maxUint256,
  type Address,
  type Hash,
} from "viem";

import { robinHoodTestnet } from "@/lib/chains";
import type { LiveStrategyRecord } from "@/lib/live-strategy-store";
import { switchOrAddDeploymentChain } from "@/lib/wallet-chain";

type TradeStage =
  | "idle"
  | "quoting"
  | "approving"
  | "swapping"
  | "confirming"
  | "complete"
  | "rejected"
  | "error";

function messageFrom(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "shortMessage" in error &&
    typeof error.shortMessage === "string"
  )
    return error.shortMessage;
  return error instanceof Error ? error.message : "The demo trade failed.";
}

export function useLiveStrategy(record: LiveStrategyRecord) {
  const { wallets } = useEmbeddedEthereumWallet();
  const wallet = wallets[0];
  const [balances, setBalances] = useState<{ a: bigint; b: bigint } | null>(
    null,
  );
  const [stage, setStage] = useState<TradeStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastHash, setLastHash] = useState<Hash | null>(null);
  const [aToB, setAToB] = useState(true);

  const readBalances = useCallback(async () => {
    if (hackathonDeployment.status !== "live") return null;
    const client = createPublicClient({
      chain: robinHoodTestnet,
      transport: http(hackathonDeployment.rpcUrl),
    });
    const [a, b] = await Promise.all([
      client.readContract({
        address: record.tokenA.address,
        abi: stockTokenAbi,
        functionName: "balanceOf",
        args: [record.maker],
      }),
      client.readContract({
        address: record.tokenB.address,
        abi: stockTokenAbi,
        functionName: "balanceOf",
        args: [record.maker],
      }),
    ]);
    return { a, b };
  }, [record]);

  const refresh = useCallback(async () => {
    const next = await readBalances();
    if (next) setBalances(next);
  }, [readBalances]);

  useEffect(() => {
    let cancelled = false;
    void readBalances().then((next) => {
      if (!cancelled && next) setBalances(next);
    });
    return () => {
      cancelled = true;
    };
  }, [readBalances]);

  const trade = useCallback(async () => {
    setError(null);
    setLastHash(null);
    try {
      const deployment = requireLiveDeployment();
      if (!wallet)
        throw new Error("Sign in with the strategy wallet to run a trade.");
      const account = wallet.address as Address;
      if (account.toLowerCase() !== record.maker.toLowerCase())
        throw new Error("Connect the wallet that opened this strategy.");
      const provider = await wallet.getProvider();
      await switchOrAddDeploymentChain(provider, deployment);
      const publicClient = createPublicClient({
        chain: robinHoodTestnet,
        transport: http(deployment.rpcUrl),
      });
      const walletClient = createWalletClient({
        account,
        chain: robinHoodTestnet,
        transport: custom(provider),
      });
      const tokenIn = aToB ? record.tokenA : record.tokenB;
      const tokenOut = aToB ? record.tokenB : record.tokenA;
      const amount = BigInt(tokenIn.reserve) / 20n || 1n;
      const position = { order: decodeLiveOrder(record.encodedOrder) };

      setStage("quoting");
      const quote = buildQuoteCall({
        deployment,
        position,
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        amount,
      });
      try {
        await publicClient.call({ account, to: quote.to, data: quote.data });
      } catch (quoteError) {
        setStage("rejected");
        setError(
          `Trade rejected before submission. ${messageFrom(quoteError)}`,
        );
        return null;
      }

      const allowance = await publicClient.readContract({
        address: tokenIn.address,
        abi: stockTokenAbi,
        functionName: "allowance",
        args: [account, deployment.contracts.aquaSwapVmRouter],
      });
      if (allowance < amount) {
        setStage("approving");
        const approvalHash = await walletClient.sendTransaction({
          to: tokenIn.address,
          data: encodeFunctionData({
            abi: stockTokenAbi,
            functionName: "approve",
            args: [deployment.contracts.aquaSwapVmRouter, maxUint256],
          }),
          value: 0n,
        });
        await publicClient.waitForTransactionReceipt({ hash: approvalHash });
      }

      setStage("swapping");
      const swap = buildSwapCall({
        deployment,
        position,
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        amount,
      });
      const hash = await walletClient.sendTransaction({
        to: swap.to,
        data: swap.data,
        value: swap.value,
      });
      setStage("confirming");
      await publicClient.waitForTransactionReceipt({ hash });
      setLastHash(hash);
      setAToB((value) => !value);
      await refresh();
      setStage("complete");
      return hash;
    } catch (cause) {
      setError(messageFrom(cause));
      setStage("error");
      return null;
    }
  }, [aToB, record, refresh, wallet]);

  return {
    balances,
    stage,
    error,
    lastHash,
    direction: aToB
      ? `${record.tokenA.symbol} → ${record.tokenB.symbol}`
      : `${record.tokenB.symbol} → ${record.tokenA.symbol}`,
    trade,
    refresh,
  };
}
