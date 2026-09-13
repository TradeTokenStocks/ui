import { Suspense } from 'react';
import type { Metadata } from 'next';

import { LiveStrategyRoute } from '@/features/strategy/live-strategy-screen';

export const metadata: Metadata = { title: 'Live strategy' };

export default function LiveStrategyPage() {
  return (
    <Suspense fallback={<div className="text-sm text-ink-tertiary">Loading strategy…</div>}>
      <LiveStrategyRoute />
    </Suspense>
  );
}
