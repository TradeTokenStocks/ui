import { useEmbeddedEthereumWallet } from "@privy-io/expo";
import {
  canSetDemoMultiplier,
  dockLiveStrategy,
  hackathonDeployment,
  readLivePosition,
  requireLiveDeployment,
  setDemoMultiplier,
  tradeLiveStrategy,
  transactionErrorMessage,
  type LivePositionState,
  type LiveTradeStage,
} from "@tradetoken/domain";
import { useCallback, useEffect, useState } from "react";
import type { Hash } from "viem";

import {
  updateLiveStrategy,
  type LiveStrategyRecord,
} from "@/lib/live-strategy-store";
import { connectLiveSigner } from "@/lib/wallet-chain";

export type LiveStrategyStage =
  | "idle"
  | LiveTradeStage
  | "complete"
  | "rejected"
  | "updating-multiplier"
  | "docking"
  | "docked"
  | "error";

const messageFrom = (error: unknown) =>
  transactionErrorMessage(error, "The transaction failed.");

export function useLiveStrategy(record: LiveStrategyRecord) {
  const { wallets } = useEmbeddedEthereumWallet();
  const wallet = wallets[0];
  const [position, setPosition] = useState<LivePositionState | null>(null);
  const [stage, setStage] = useState<LiveStrategyStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastHash, setLastHash] = useState<Hash | null>(null);
  const [aToB, setAToB] = useState(true);

  const refresh = useCallback(async () => {
    if (hackathonDeployment.status !== "live") return;
    setPosition(await readLivePosition(hackathonDeployment, record));
  }, [record]);

  useEffect(() => {
    if (hackathonDeployment.status !== "live") return;
    let cancelled = false;
    void readLivePosition(hackathonDeployment, record)
      .then((next) => {
        if (!cancelled) setPosition(next);
      })
      .catch((cause) => {
        if (!cancelled)
          setError(`Could not read Aqua balances. ${messageFrom(cause)}`);
      });
    return () => {
      cancelled = true;
    };
  }, [record]);

  const signer = useCallback(async () => {
    const deployment = requireLiveDeployment();
    return { deployment, signer: await connectLiveSigner(wallet, deployment) };
  }, [wallet]);

  const trade = useCallback(async () => {
    setError(null);
    setLastHash(null);
    try {
      const result = await tradeLiveStrategy({
        ...(await signer()),
        record,
        aToB,
        onStage: setStage,
      });
      if (result.status === "protected") {
        setStage("rejected");
        setError(
          `Protected: ${result.symbol} multiplier is outside the signed range.`,
        );
        return null;
      }
      if (result.status === "unquoted") {
        setStage("error");
        setError(`Quote unavailable. ${result.message}`);
        return null;
      }
      setLastHash(result.hash);
      setAToB((value) => !value);
      await refresh();
      setStage("complete");
      return result.hash;
    } catch (cause) {
      setError(messageFrom(cause));
      setStage("error");
      return null;
    }
  }, [aToB, record, refresh, signer]);

  const updateDemoMultiplier = useCallback(
    async (mode: "break" | "restore") => {
      setError(null);
      setLastHash(null);
      try {
        const context = await signer();
        setStage("updating-multiplier");
        const hash = await setDemoMultiplier({ ...context, record, mode });
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
    [record, refresh, signer],
  );

  const dock = useCallback(async () => {
    setError(null);
    setLastHash(null);
    try {
      const context = await signer();
      setStage("docking");
      const hash = await dockLiveStrategy({ ...context, record });
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
  }, [record, refresh, signer]);

  return {
    position,
    stage,
    error,
    lastHash,
    canUpdateMultiplier:
      hackathonDeployment.status === "live" &&
      canSetDemoMultiplier(hackathonDeployment, record),
    direction: aToB
      ? `${record.tokenA.symbol} → ${record.tokenB.symbol}`
      : `${record.tokenB.symbol} → ${record.tokenA.symbol}`,
    trade,
    updateDemoMultiplier,
    dock,
    refresh,
  };
}
