import { useEmbeddedEthereumWallet } from "@privy-io/expo";
import {
  buildLivePeggedPosition,
  contractUnits,
  deployedStock,
  hackathonDeployment,
  parseDecimalUnits,
  requireLiveDeployment,
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
  maxUint256,
  type Address,
  type Hash,
} from "viem";

import { robinHoodTestnet } from "@/lib/chains";
import {
  saveLiveStrategy,
  type LiveStrategyRecord,
} from "@/lib/live-strategy-store";
import { waitForSuccess } from "@/lib/transactions";
import { switchOrAddDeploymentChain } from "@/lib/wallet-chain";

export type LivePositionStage =
  | "idle"
  | "network"
  | "balances"
  | "approve-a"
  | "approve-b"
  | "ship"
  | "confirming"
  | "complete"
  | "error";

export type OpenLivePositionInput = {
  ticker: string;
  tokenAId: string;
  tokenBId: string;
  amountAUsd: string;
  amountBUsd: string;
  priceUsd: number;
  feeBps: number;
  guardToleranceBps: number;
  curve: "straight" | "curved";
};

function errorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "shortMessage" in error &&
    typeof error.shortMessage === "string"
  ) {
    return error.shortMessage;
  }
  if (error instanceof Error) return error.message;
  return "The wallet could not open this position.";
}

export function useOpenLivePosition() {
  const { wallets } = useEmbeddedEthereumWallet();
  const wallet = wallets[0];
  const [stage, setStage] = useState<LivePositionStage>("idle");
  const [error, setError] = useState<string | null>(null);

  const openPosition = useCallback(
    async (input: OpenLivePositionInput) => {
      setError(null);
      try {
        const deployment = requireLiveDeployment();
        if (!wallet)
          throw new Error("Sign in and create your embedded wallet first.");

        const maker = wallet.address as Address;
        const tokenA = deployedStock(deployment, input.tokenAId);
        const tokenB = deployedStock(deployment, input.tokenBId);
        const provider = await wallet.getProvider();

        setStage("network");
        await switchOrAddDeploymentChain(provider, deployment);

        const publicClient = createPublicClient({
          chain: robinHoodTestnet,
          transport: http(deployment.rpcUrl),
        });
        const walletClient = createWalletClient({
          account: maker,
          chain: robinHoodTestnet,
          transport: custom(provider),
        });

        setStage("balances");
        const [
          multiplierA,
          multiplierB,
          balanceA,
          balanceB,
          allowanceA,
          allowanceB,
        ] = await Promise.all([
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
          publicClient.readContract({
            address: tokenA.address,
            abi: stockTokenAbi,
            functionName: "balanceOf",
            args: [maker],
          }),
          publicClient.readContract({
            address: tokenB.address,
            abi: stockTokenAbi,
            functionName: "balanceOf",
            args: [maker],
          }),
          publicClient.readContract({
            address: tokenA.address,
            abi: stockTokenAbi,
            functionName: "allowance",
            args: [maker, deployment.contracts.aqua],
          }),
          publicClient.readContract({
            address: tokenB.address,
            abi: stockTokenAbi,
            functionName: "allowance",
            args: [maker, deployment.contracts.aqua],
          }),
        ]);
        const priceUsdE6 = parseDecimalUnits(input.priceUsd.toFixed(6), 6);
        const reserveA = usdAllocationToTokenUnits({
          amountUsd: input.amountAUsd,
          priceUsdE6,
          multiplierE18: multiplierA,
          tokenDecimals: tokenA.decimals,
        });
        const reserveB = usdAllocationToTokenUnits({
          amountUsd: input.amountBUsd,
          priceUsdE6,
          multiplierE18: multiplierB,
          tokenDecimals: tokenB.decimals,
        });

        if (balanceA < reserveA || balanceB < reserveB) {
          throw new Error(
            `Insufficient ${balanceA < reserveA ? tokenA.symbol : tokenB.symbol} balance. Add the stock pair first.`,
          );
        }

        const approve = async (
          token: Address,
          nextStage: "approve-a" | "approve-b",
        ) => {
          setStage(nextStage);
          const hash = await walletClient.sendTransaction({
            to: token,
            data: encodeFunctionData({
              abi: stockTokenAbi,
              functionName: "approve",
              args: [deployment.contracts.aqua, maxUint256],
            }),
            value: 0n,
          });
          await waitForSuccess(publicClient, hash);
        };

        if (allowanceA < reserveA) await approve(tokenA.address, "approve-a");
        if (allowanceB < reserveB) await approve(tokenB.address, "approve-b");

        const position = buildLivePeggedPosition({
          deployment,
          maker,
          tokenA,
          tokenB,
          reserveA,
          reserveB,
          multiplierA,
          multiplierB,
          guardToleranceBps: input.guardToleranceBps,
        feeBps: input.feeBps,
        salt: BigInt(Date.now()),
        linearWidth:
          input.curve === "straight"
            ? BigInt(100) * contractUnits.peggedLinearWidth
            : deployment.strategy.linearWidth,
        });

        setStage("ship");
        const shipTransactionHash = await walletClient.sendTransaction({
          to: position.ship.to,
          data: position.ship.data,
          value: position.ship.value,
        });
        setStage("confirming");
        await waitForSuccess(publicClient, shipTransactionHash);

        const record: LiveStrategyRecord = {
          id: `${deployment.chainId}:${position.strategyHash}`,
          ticker: input.ticker,
          maker,
          chainId: deployment.chainId,
          strategyHash: position.strategyHash,
          shipTransactionHash: shipTransactionHash as Hash,
          encodedOrder: position.encodedOrder,
          tokenA: {
            address: tokenA.address,
            symbol: tokenA.symbol,
            decimals: tokenA.decimals,
            reserve: reserveA.toString(),
            multiplier: multiplierA.toString(),
          },
          tokenB: {
            address: tokenB.address,
            symbol: tokenB.symbol,
            decimals: tokenB.decimals,
            reserve: reserveB.toString(),
            multiplier: multiplierB.toString(),
          },
          allocationUsd: Number(input.amountAUsd) + Number(input.amountBUsd),
          feeBps: input.feeBps,
          guardToleranceBps: input.guardToleranceBps,
          createdAt: new Date().toISOString(),
        };
        try {
          await saveLiveStrategy(record);
        } catch (storageError) {
          console.warn(
            "Position opened but local strategy metadata could not be saved:",
            storageError,
          );
        }
        setStage("complete");
        return record;
      } catch (cause) {
        setError(errorMessage(cause));
        setStage("error");
        throw cause;
      }
    },
    [wallet],
  );

  const reset = useCallback(() => {
    setStage("idle");
    setError(null);
  }, []);

  return {
    deploymentReady: hackathonDeployment.status === "live",
    walletAddress: wallet?.address,
    stage,
    error,
    openPosition,
    reset,
  };
}
