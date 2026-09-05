import { Suspense } from 'react';
import type { Metadata } from 'next';

import { StrategyReviewScreen } from '@/features/strategy/strategy-review-screen';

export const metadata: Metadata = { title: 'Review strategy' };

export default function ReviewStrategyPage() {
  return (
    <Suspense fallback={<div className="text-sm text-ink-tertiary">Loading review…</div>}>
      <StrategyReviewScreen />
    </Suspense>
  );
}
