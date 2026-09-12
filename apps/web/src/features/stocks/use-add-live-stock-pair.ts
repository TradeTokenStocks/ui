'use client';

import {
  hackathonDeployment,
  mintStockPair,
  requireLiveDeployment,
  transactionErrorMessage,
  type MintStockPairStage,
} from '@tradetoken/domain';
import { useCallback, useState } from 'react';

import { connectLiveSigner } from '@/lib/live-signer';

type AddStockStage = 'idle' | 'network' | MintStockPairStage | 'complete' | 'error';

const stageLabels: Record<AddStockStage, string> = {
  idle: 'Confirm & tokenize stock',
  network: 'Switching network…',
  reading: 'Reading multipliers…',
  'mint-a': 'Minting Dinari leg…',
  'mint-b': 'Minting xStock leg…',
  confirming: 'Checking balances…',
  complete: 'Stock pair ready',
  error: 'Try again',
};

export function useAddLiveStockPair() {
  const [stage, setStage] = useState<AddStockStage>('idle');
  const [error, setError] = useState<string | null>(null);

  const addPair = useCallback(
    async (input: { tokenAId: string; tokenBId: string; amountUsd: string; priceUsd: number }) => {
      setError(null);
      try {
        const deployment = requireLiveDeployment();
        setStage('network');
        const signer = await connectLiveSigner(deployment);
        const balances = await mintStockPair({ deployment, signer, ...input, onStage: setStage });
        setStage('complete');
        return balances;
      } catch (cause) {
        setError(transactionErrorMessage(cause, 'The stock pair could not be prepared.'));
        setStage('error');
        throw cause;
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setStage('idle');
    setError(null);
  }, []);

  return {
    deploymentReady: hackathonDeployment.status === 'live',
    busy: !['idle', 'complete', 'error'].includes(stage),
    label: stageLabels[stage],
    error,
    addPair,
    reset,
  };
}
