'use client';

import { useMemo, useState } from 'react';
import type { TokenizedStock } from '@tradetoken/domain';
import { tokenizedStocks } from '@tradetoken/domain/fixtures';

export type PositionCurve = 'straight' | 'curved';

const DEFAULT_A = tokenizedStocks.find((stock) => stock.id === 'dinari-nvda')!;
const DEFAULT_B = tokenizedStocks.find((stock) => stock.id === 'xstock-nvda')!;

export function useAquaPositionState() {
  const [tokenA, setTokenA] = useState<TokenizedStock>(DEFAULT_A);
  const [tokenB, setTokenB] = useState<TokenizedStock>(DEFAULT_B);
  const [amountA, setAmountA] = useState('20');
  const [amountB, setAmountB] = useState('20');
  const [feeBps, setFeeBps] = useState(30);
  const [curve, setCurve] = useState<PositionCurve>('curved');
  const [guardTolerancePct, setGuardTolerancePct] = useState(5);

  const pairIsSameStock = tokenA.ticker === tokenB.ticker;
  const fairRatio = tokenA.multiplier / tokenB.multiplier;

  const guardBounds = useMemo(
    () => ({
      tokenA: {
        min: tokenA.multiplier * (1 - guardTolerancePct / 100),
        max: tokenA.multiplier * (1 + guardTolerancePct / 100),
      },
      tokenB: {
        min: tokenB.multiplier * (1 - guardTolerancePct / 100),
        max: tokenB.multiplier * (1 + guardTolerancePct / 100),
      },
    }),
    [guardTolerancePct, tokenA.multiplier, tokenB.multiplier],
  );

  const selectToken = (leg: 'a' | 'b', token: TokenizedStock) => {
    if (leg === 'a') setTokenA(token);
    else setTokenB(token);
  };

  const reset = () => {
    setTokenA(DEFAULT_A);
    setTokenB(DEFAULT_B);
    setAmountA('20');
    setAmountB('20');
    setFeeBps(30);
    setCurve('curved');
    setGuardTolerancePct(5);
  };

  return {
    tokenA,
    tokenB,
    amountA,
    amountB,
    feeBps,
    curve,
    guardTolerancePct,
    guardBounds,
    fairRatio,
    pairIsSameStock,
    setAmountA,
    setAmountB,
    setFeeBps,
    setCurve,
    setGuardTolerancePct,
    selectToken,
    reset,
  };
}
