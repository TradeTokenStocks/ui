'use client';

import {
  hackathonDeployment,
  openPeggedPosition,
  requireLiveDeployment,
  transactionErrorMessage,
  type OpenPeggedPositionInput,
  type OpenPeggedPositionStage,
} from '@tradetoken/domain';
import { useCallback, useState } from 'react';
import { useConnection } from 'wagmi';

import { connectLiveSigner } from '@/lib/live-signer';

import { saveLiveStrategy } from '../live-strategy-store';

type LivePositionStage = 'idle' | 'network' | OpenPeggedPositionStage | 'complete' | 'error';

const stageLabels: Record<LivePositionStage, string> = {
  idle: 'Sign and deploy',
  network: 'Switching network…',
  balances: 'Checking balances…',
  'approve-a': 'Approving first leg…',
  'approve-b': 'Approving second leg…',
  ship: 'Shipping to Aqua…',
  confirming: 'Confirming onchain…',
  complete: 'Position opened',
  error: 'Try again',
};

export function useOpenLivePosition() {
  const { address } = useConnection();
  const [stage, setStage] = useState<LivePositionStage>('idle');
  const [error, setError] = useState<string | null>(null);

  const openPosition = useCallback(async (input: OpenPeggedPositionInput) => {
    setError(null);
    try {
      const deployment = requireLiveDeployment();
      setStage('network');
      const signer = await connectLiveSigner(deployment);
      const record = await openPeggedPosition({ deployment, signer, input, onStage: setStage });
      try {
        saveLiveStrategy(record);
      } catch (storageError) {
        console.warn('Position opened but local strategy metadata could not be saved:', storageError);
      }
      setStage('complete');
      return record;
    } catch (cause) {
      setError(transactionErrorMessage(cause, 'The wallet could not open this position.'));
      setStage('error');
      throw cause;
    }
  }, []);

  return {
    deploymentReady: hackathonDeployment.status === 'live',
    walletAddress: address,
    busy: !['idle', 'complete', 'error'].includes(stage),
    label: stageLabels[stage],
    error,
    openPosition,
  };
}
