import { useEmbeddedEthereumWallet } from "@privy-io/expo";
import {
  deployedStock,
  hackathonDeployment,
  parseDecimalUnits,
  requireLiveDeployment,
  stockMintCall,
  stockTokenAbi,
  usdAllocationToTokenUnits,
} from "@tradetoken/domain";
import { useCallback, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  http,
  type Address,
} from "viem";

import { robinHoodTestnet } from "@/lib/chains";
import { switchOrAddDeploymentChain } from "@/lib/wallet-chain";

type AddStockStage =
  | "idle"
  | "network"
  | "reading"
  | "mint-a"
  | "mint-b"
  | "confirming"
  | "complete"
  | "error";

const stageLabels: Record<AddStockStage, string> = {
  idle: "Confirm & tokenize stock",
  network: "Switching network…",
  reading: "Reading multipliers…",
  "mint-a": "Minting Dinari leg…",
  "mint-b": "Minting xStock leg…",
  confirming: "Checking balances…",
  complete: "Stock pair ready",
  error: "Try again",
};

function messageFrom(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "shortMessage" in error &&
    typeof error.shortMessage === "string"
  ) {
    return error.shortMessage;
  }
  return error instanceof Error
    ? error.message
    : "The stock pair could not be prepared.";
}

export function useAddLiveStockPair() {
  const { wallets } = useEmbeddedEthereumWallet();
  const wallet = wallets[0];
  const [stage, setStage] = useState<AddStockStage>("idle");
  const [error, setError] = useState<string | null>(null);

  const addPair = useCallback(
    async ({
      tokenAId,
      tokenBId,
      amountUsd,
      priceUsd,
    }: {
      tokenAId: string;
      tokenBId: string;
      amountUsd: string;
      priceUsd: number;
    }) => {
      setError(null);
      try {
        const deployment = requireLiveDeployment();
        if (!wallet)
          throw new Error("Sign in and create your embedded wallet first.");
        const account = wallet.address as Address;
        const tokenA = deployedStock(deployment, tokenAId);
        const tokenB = deployedStock(deployment, tokenBId);
        const provider = await wallet.getProvider();

        setStage("network");
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

        setStage("reading");
        const [multiplierA, multiplierB] = await Promise.all([
          publicClient.readContract({
            address: tokenA.address,
            abi: stockTokenAbi,
            functionName: tokenA.multiplierRead,
          }),
          publicClient.readContract({
            address: tokenB.address,
            abi: stockTokenAbi,
            functionName: tokenB.multiplierRead,
          }),
        ]);
        const halfUsd = (Number(amountUsd) / 2).toFixed(6);
        const priceUsdE6 = parseDecimalUnits(priceUsd.toFixed(6), 6);
        const amountA = usdAllocationToTokenUnits({
          amountUsd: halfUsd,
          priceUsdE6,
          multiplierE18: multiplierA,
          tokenDecimals: tokenA.decimals,
        });
        const amountB = usdAllocationToTokenUnits({
          amountUsd: halfUsd,
          priceUsdE6,
          multiplierE18: multiplierB,
          tokenDecimals: tokenB.decimals,
        });

        const submitMint = async (
          call: NonNullable<ReturnType<typeof stockMintCall>>,
          nextStage: "mint-a" | "mint-b",
        ) => {
          setStage(nextStage);
          const hash = await walletClient.sendTransaction({
            to: call.address,
            data: encodeFunctionData({
              abi: stockTokenAbi,
              functionName: call.functionName,
              args: call.args as never,
            }),
            value: 0n,
          });
          await publicClient.waitForTransactionReceipt({ hash });
        };

        const mintA = stockMintCall(tokenA, account, amountA);
        const mintB = stockMintCall(tokenB, account, amountB);
        if (mintA) await submitMint(mintA, "mint-a");
        if (mintB) await submitMint(mintB, "mint-b");

        setStage("confirming");
        const [balanceA, balanceB] = await Promise.all([
          publicClient.readContract({
            address: tokenA.address,
            abi: stockTokenAbi,
            functionName: "balanceOf",
            args: [account],
          }),
          publicClient.readContract({
            address: tokenB.address,
            abi: stockTokenAbi,
            functionName: "balanceOf",
            args: [account],
          }),
        ]);
        if (balanceA < amountA || balanceB < amountB) {
          throw new Error(
            `The wallet still needs ${balanceA < amountA ? tokenA.symbol : tokenB.symbol}. Use its official faucet, then retry.`,
          );
        }

        setStage("complete");
        return { balanceA, balanceB };
      } catch (cause) {
        setError(messageFrom(cause));
        setStage("error");
        throw cause;
      }
    },
    [wallet],
  );

  return {
    deploymentReady: hackathonDeployment.status === "live",
    busy: !["idle", "complete", "error"].includes(stage),
    label: stageLabels[stage],
    error,
    addPair,
  };
}
