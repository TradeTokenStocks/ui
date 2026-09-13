import { useEmbeddedEthereumWallet } from "@privy-io/expo";
import {
  hackathonDeployment,
  openPeggedPosition,
  requireLiveDeployment,
  transactionErrorMessage,
  type OpenPeggedPositionInput,
  type OpenPeggedPositionStage,
} from "@tradetoken/domain";
import { useCallback, useState } from "react";

import { saveLiveStrategy } from "@/lib/live-strategy-store";
import { connectLiveSigner } from "@/lib/wallet-chain";

export type LivePositionStage =
  | "idle"
  | "network"
  | OpenPeggedPositionStage
  | "complete"
  | "error";

export type OpenLivePositionInput = OpenPeggedPositionInput;

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
        setStage("network");
        const signer = await connectLiveSigner(wallet, deployment);
        const record = await openPeggedPosition({
          deployment,
          signer,
          input,
          onStage: setStage,
        });
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
        setError(
          transactionErrorMessage(
            cause,
            "The wallet could not open this position.",
          ),
        );
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
