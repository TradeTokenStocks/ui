import type { Metadata } from 'next';

import { StrategyTypePickerScreen } from '@/features/strategy/strategy-type-picker-screen';

export const metadata: Metadata = { title: 'Choose strategy' };

export default async function StrategyTypePage({
  searchParams,
}: {
  searchParams: Promise<{ ticker?: string }>;
}) {
  const { ticker = 'NVDA' } = await searchParams;
  return <StrategyTypePickerScreen ticker={ticker} />;
}
