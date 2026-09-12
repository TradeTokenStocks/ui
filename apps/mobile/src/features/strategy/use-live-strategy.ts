import { useEmbeddedEthereumWallet } from "@privy-io/expo";
import {
  aquaAbi,
  buildDockCall,
  buildQuoteCall,
  buildSwapCall,
  decodeLiveOrder,
  decodeMultiplierGuardFailure,
  hackathonDeployment,
  multiplierBounds,
  multiplierUpdateCall,
  requireLiveDeployment,
  stockTokenAbi,
  type LiveHackathonDeployment,
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
import {
  updateLiveStrategy,
  type LiveStrategyRecord,
} from "@/lib/live-strategy-store";
import { waitForSuccess } from "@/lib/transactions";
import { switchOrAddDeploymentChain } from "@/lib/wallet-chain";

export type LiveStrategyStage =
  | "idle"
  | "quoting"
  | "approving"
  | "swapping"
  | "confirming"
  | "complete"
  | "rejected"
  | "updating-multiplier"
  | "docking"
  | "docked"
  | "error";

export type LivePositionState = {
  /** Aqua virtual balances reserved for this strategy. */
  strategy: { a: bigint; b: bigint };
  /** Maker ERC-20 wallet balances. */
  wallet: { a: bigint; b: bigint };
  multipliers: { a: bigint; b: bigint };
};

function messageFrom(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "shortMessage" in error &&
    typeof error.shortMessage === "string"
  )
    return error.shortMessage;
  return error instanceof Error ? error.message : "The transaction failed.";
}

/**
 * Resolve a record token against the manifest by address so records saved
 * before token ids were persisted keep working.
 */
function manifestToken(
  deployment: LiveHackathonDeployment,
  token: LiveStrategyRecord["tokenA"],
) {
  return deployment.stocks.find(
    (stock) => stock.address.toLowerCase() === token.address.toLowerCase(),
  );
}

export function useLiveStrategy(record: LiveStrategyRecord) {
  const { wallets } = useEmbeddedEthereumWallet();
  const wallet = wallets[0];
  const [position, setPosition] = useState<LivePositionState | null>(null);
  const [stage, setStage] = useState<LiveStrategyStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastHash, setLastHash] = useState<Hash | null>(null);
  const [aToB, setAToB] = useState(true);

  const readPosition = useCallback(async () => {
    if (hackathonDeployment.status !== "live") return null;
    const deployment = hackathonDeployment;
    const client = createPublicClient({
      chain: robinHoodTestnet,
      transport: http(deployment.rpcUrl),
    });
    const readRaw = (token: Address) =>
      client.readContract({
        address: deployment.contracts.aqua,
        abi: aquaAbi,
        functionName: "rawBalances",
        args: [
          record.maker,
          deployment.contracts.aquaSwapVmRouter,
          record.strategyHash,
          token,
        ],
      });
    const readWallet = (token: Address) =>
      client.readContract({
        address: token,
        abi: stockTokenAbi,
        functionName: "balanceOf",
        args: [record.maker],
      });
    const readMultiplier = (token: LiveStrategyRecord["tokenA"]) =>
      client.readContract({
        address: token.address,
        abi: stockTokenAbi,
        functionName:
          manifestToken(deployment, token)?.multiplierRead ?? "multiplier",
      });

    const [rawA, rawB, walletA, walletB, multiplierA, multiplierB] =
      await Promise.all([
        readRaw(record.tokenA.address),
        readRaw(record.tokenB.address),
        readWallet(record.tokenA.address),
        readWallet(record.tokenB.address),
        readMultiplier(record.tokenA),
        readMultiplier(record.tokenB),
      ]);

    return {
      strategy: { a: rawA[0], b: rawB[0] },
      wallet: { a: walletA, b: walletB },
      multipliers: { a: multiplierA, b: multiplierB },
    } satisfies LivePositionState;
  }, [record]);

  const refresh = useCallback(async () => {
    const next = await readPosition();
    if (next) setPosition(next);
  }, [readPosition]);

  useEffect(() => {
    let cancelled = false;
    void readPosition()
      .then((next) => {
        if (!cancelled && next) setPosition(next);
      })
      .catch((cause) => {
        if (!cancelled)
          setError(`Could not read Aqua balances. ${messageFrom(cause)}`);
      });
    return () => {
      cancelled = true;
    };
  }, [readPosition]);

  const clients = useCallback(async () => {
    const deployment = requireLiveDeployment();
    if (!wallet)
      throw new Error("Sign in with the strategy wallet to continue.");
    const account = wallet.address as Address;
    if (account.toLowerCase() !== record.maker.toLowerCase())
      throw new Error("Connect the wallet that opened this strategy.");
    const provider = await wallet.getProvider();
    await switchOrAddDeploymentChain(provider, deployment);
    return {
      deployment,
      account,
      publicClient: createPublicClient({
        chain: robinHoodTestnet,
        transport: http(deployment.rpcUrl),
      }),
      walletClient: createWalletClient({
        account,
        chain: robinHoodTestnet,
        transport: custom(provider),
      }),
    };
  }, [record.maker, wallet]);

  const trade = useCallback(async () => {
    setError(null);
    setLastHash(null);
    try {
      if (record.status === "closed")
        throw new Error("This strategy is closed.");
      const { deployment, account, publicClient, walletClient } =
        await clients();
      const tokenIn = aToB ? record.tokenA : record.tokenB;
      const tokenOut = aToB ? record.tokenB : record.tokenA;
      const amount = BigInt(tokenIn.reserve) / BigInt(20) || BigInt(1);
      const position = { order: decodeLiveOrder(record.encodedOrder) };
      const swapInput = {
        deployment,
        position,
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        amount,
      };

      setStage("quoting");
      const quote = buildQuoteCall(swapInput);
      try {
        await publicClient.call({ account, to: quote.to, data: quote.data });
      } catch (quoteError) {
        const guard = decodeMultiplierGuardFailure(quoteError);
        if (guard) {
          const symbol =
            guard.token.toLowerCase() === tokenIn.address.toLowerCase()
              ? tokenIn.symbol
              : tokenOut.symbol;
          setStage("rejected");
          setError(
            `Protected: ${symbol} multiplier is outside the signed range.`,
          );
        } else {
          setStage("error");
          setError(`Quote unavailable. ${messageFrom(quoteError)}`);
        }
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
          value: BigInt(0),
        });
        await waitForSuccess(publicClient, approvalHash);
      }

      setStage("swapping");
      const swap = buildSwapCall(swapInput);
      const hash = await walletClient.sendTransaction({
        to: swap.to,
        data: swap.data,
        value: swap.value,
      });
      setStage("confirming");
      await waitForSuccess(publicClient, hash);
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
  }, [aToB, clients, record, refresh]);

  /**
   * Demo a corporate action on token B: push its mock multiplier just outside
   * the signed guard range, or restore the multiplier captured at creation.
   */
  const updateDemoMultiplier = useCallback(
    async (mode: "break" | "restore") => {
      setError(null);
      setLastHash(null);
      try {
        const { deployment, publicClient, walletClient } = await clients();
        const token = manifestToken(deployment, record.tokenB);
        if (!token)
          throw new Error(`${record.tokenB.symbol} is not in the deployment.`);
        const signed = BigInt(record.tokenB.multiplier);
        const next =
          mode === "restore"
            ? signed
            : multiplierBounds(signed, record.guardToleranceBps + 100).max;
        const call = multiplierUpdateCall(token, next);
        if (!call)
          throw new Error(
            `${token.symbol} does not expose a demo multiplier setter.`,
          );

        setStage("updating-multiplier");
        const hash = await walletClient.sendTransaction({
          to: call.address,
          data: encodeFunctionData({
            abi: stockTokenAbi,
            functionName: call.functionName,
            args: call.args as never,
          }),
          value: BigInt(0),
        });
        await waitForSuccess(publicClient, hash);
        setLastHash(hash);
        await refresh();
        setStage("idle");
        return hash;
      } catch (cause) {
        setError(messageFrom(cause));
        setStage("error");
        return null;
      }
    },
    [clients, record, refresh],
  );

  const dock = useCallback(async () => {
    setError(null);
    setLastHash(null);
    try {
      const { deployment, publicClient, walletClient } = await clients();
      const call = buildDockCall({
        deployment,
        strategyHash: record.strategyHash,
        tokens: [record.tokenA.address, record.tokenB.address],
      });
      setStage("docking");
      const hash = await walletClient.sendTransaction({
        to: call.to,
        data: call.data,
        value: call.value,
      });
      await waitForSuccess(publicClient, hash);
      try {
        await updateLiveStrategy(record.id, {
          status: "closed",
          dockTransactionHash: hash,
          closedAt: new Date().toISOString(),
        });
      } catch (storageError) {
        console.warn(
          "Strategy docked but local metadata could not be updated:",
          storageError,
        );
      }
      setLastHash(hash);
      await refresh();
      setStage("docked");
      return hash;
    } catch (cause) {
      setError(messageFrom(cause));
      setStage("error");
      return null;
    }
  }, [clients, record, refresh]);

  const canUpdateMultiplier =
    hackathonDeployment.status === "live" &&
    (manifestToken(hackathonDeployment, record.tokenB)?.multiplierWrite ??
      "none") !== "none";

  return {
    position,
    stage,
    error,
    lastHash,
    canUpdateMultiplier,
    direction: aToB
      ? `${record.tokenA.symbol} → ${record.tokenB.symbol}`
      : `${record.tokenB.symbol} → ${record.tokenA.symbol}`,
    trade,
    updateDemoMultiplier,
    dock,
    refresh,
  };
}
