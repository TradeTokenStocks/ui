import { Suspense } from 'react';
import type { Metadata } from 'next';

import { StrategyBuilderScreen } from '@/features/strategy/strategy-builder-screen';

export const metadata: Metadata = { title: 'New strategy' };

export default function NewStrategyPage() {
  return (
    <Suspense fallback={<div className="text-sm text-ink-tertiary">Loading strategy…</div>}>
      <StrategyBuilderScreen />
    </Suspense>
  );
}
