import { Suspense } from 'react';
import type { Metadata } from 'next';

import { AquaPositionBuilder } from '@/features/strategy/aqua-position-builder';
import { StrategyBuilderScreen } from '@/features/strategy/strategy-builder-screen';

export const metadata: Metadata = { title: 'Configure strategy' };

export default async function ConfigureStrategyPage({
  searchParams,
}: {
  searchParams: Promise<{ mechanism?: string; ticker?: string; tokenA?: string; tokenB?: string }>;
}) {
  const { mechanism, ticker = 'NVDA', tokenA, tokenB } = await searchParams;

  if (mechanism === 'concentrated') {
    return (
      <Suspense fallback={<div className="text-sm text-ink-tertiary">Loading builder…</div>}>
        <StrategyBuilderScreen />
      </Suspense>
    );
  }

  return (
    <AquaPositionBuilder
      ticker={ticker.toUpperCase()}
      {...(tokenA ? { tokenAId: tokenA } : {})}
      {...(tokenB ? { tokenBId: tokenB } : {})}
    />
  );
}
