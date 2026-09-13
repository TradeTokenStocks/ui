'use client';

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
  type LiveStrategyRecord,
  type LiveTradeStage,
} from '@tradetoken/domain';
import { useCallback, useEffect, useState } from 'react';
import type { Hash } from 'viem';

import { connectLiveSigner } from '@/lib/live-signer';

import { updateLiveStrategy } from '../live-strategy-store';

export type LiveStrategyStage =
  | 'idle'
  | LiveTradeStage
  | 'complete'
  | 'rejected'
  | 'updating-multiplier'
  | 'docking'
  | 'docked'
  | 'error';

const messageFrom = (error: unknown) => transactionErrorMessage(error, 'The transaction failed.');

export function useLiveStrategy(record: LiveStrategyRecord) {
  const [position, setPosition] = useState<LivePositionState | null>(null);
  const [stage, setStage] = useState<LiveStrategyStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastHash, setLastHash] = useState<Hash | null>(null);
  const [aToB, setAToB] = useState(true);

  const refresh = useCallback(async () => {
    if (hackathonDeployment.status !== 'live') return;
    setPosition(await readLivePosition(hackathonDeployment, record));
  }, [record]);

  useEffect(() => {
    if (hackathonDeployment.status !== 'live') return;
    let cancelled = false;
    void readLivePosition(hackathonDeployment, record)
      .then((next) => {
        if (!cancelled) setPosition(next);
      })
      .catch((cause) => {
        if (!cancelled) setError(`Could not read Aqua balances. ${messageFrom(cause)}`);
      });
    return () => {
      cancelled = true;
    };
  }, [record]);

  const context = useCallback(async () => {
    const deployment = requireLiveDeployment();
    return { deployment, signer: await connectLiveSigner(deployment) };
  }, []);

  const trade = useCallback(async () => {
    setError(null);
    setLastHash(null);
    try {
      const result = await tradeLiveStrategy({ ...(await context()), record, aToB, onStage: setStage });
      if (result.status === 'protected') {
        setStage('rejected');
        setError(`Protected: ${result.symbol} multiplier is outside the signed range.`);
        return;
      }
      if (result.status === 'unquoted') {
        setStage('error');
        setError(`Quote unavailable. ${result.message}`);
        return;
      }
      setLastHash(result.hash);
      setAToB((value) => !value);
      await refresh();
      setStage('complete');
    } catch (cause) {
      setError(messageFrom(cause));
      setStage('error');
    }
  }, [aToB, context, record, refresh]);

  const updateDemoMultiplier = useCallback(
    async (mode: 'break' | 'restore') => {
      setError(null);
      setLastHash(null);
      try {
        const ready = await context();
        setStage('updating-multiplier');
        setLastHash(await setDemoMultiplier({ ...ready, record, mode }));
        await refresh();
        setStage('idle');
      } catch (cause) {
        setError(messageFrom(cause));
        setStage('error');
      }
    },
    [context, record, refresh],
  );

  const dock = useCallback(async () => {
    setError(null);
    setLastHash(null);
    try {
      const ready = await context();
      setStage('docking');
      const hash = await dockLiveStrategy({ ...ready, record });
      try {
        updateLiveStrategy(record.id, {
          status: 'closed',
          dockTransactionHash: hash,
          closedAt: new Date().toISOString(),
        });
      } catch (storageError) {
        console.warn('Strategy docked but local metadata could not be updated:', storageError);
      }
      setLastHash(hash);
      await refresh();
      setStage('docked');
    } catch (cause) {
      setError(messageFrom(cause));
      setStage('error');
    }
  }, [context, record, refresh]);

  return {
    position,
    stage,
    error,
    lastHash,
    busy: ['quoting', 'approving', 'swapping', 'confirming', 'updating-multiplier', 'docking'].includes(stage),
    canUpdateMultiplier:
      hackathonDeployment.status === 'live' && canSetDemoMultiplier(hackathonDeployment, record),
    direction: aToB
      ? `${record.tokenA.symbol} → ${record.tokenB.symbol}`
      : `${record.tokenB.symbol} → ${record.tokenA.symbol}`,
    trade,
    updateDemoMultiplier,
    dock,
  };
}
