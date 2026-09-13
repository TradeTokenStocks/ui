import { useEmbeddedEthereumWallet } from "@privy-io/expo";
import {
  hackathonDeployment,
  mintStockPair,
  requireLiveDeployment,
  transactionErrorMessage,
  type MintStockPairStage,
} from "@tradetoken/domain";
import { useCallback, useState } from "react";

import { connectLiveSigner } from "@/lib/wallet-chain";

type AddStockStage =
  | "idle"
  | "network"
  | MintStockPairStage
  | "complete"
  | "error";

const stageLabels: Record<AddStockStage, string> = {
  idle: "Confirm & tokenize stock",
  network: "Switching network…",
  reading: "Reading multipliers…",
  "mint-a": "Minting xStock leg…",
  "mint-b": "Minting Ondo leg…",
  confirming: "Checking balances…",
  complete: "Stock pair ready",
  error: "Try again",
};

export function useAddLiveStockPair() {
  const { wallets } = useEmbeddedEthereumWallet();
  const wallet = wallets[0];
  const [stage, setStage] = useState<AddStockStage>("idle");
  const [error, setError] = useState<string | null>(null);

  const addPair = useCallback(
    async (input: {
      tokenAId: string;
      tokenBId: string;
      amountUsd: string;
      priceUsd: number;
    }) => {
      setError(null);
      try {
        const deployment = requireLiveDeployment();
        setStage("network");
        const signer = await connectLiveSigner(wallet, deployment);
        const balances = await mintStockPair({
          deployment,
          signer,
          ...input,
          onStage: setStage,
        });
        setStage("complete");
        return balances;
      } catch (cause) {
        setError(
          transactionErrorMessage(cause, "The stock pair could not be prepared."),
        );
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
