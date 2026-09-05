import type { Metadata } from 'next';

import { StrategyListScreen } from '@/features/strategy/strategy-list-screen';

export const metadata: Metadata = { title: 'Strategies' };

export default function StrategiesPage() {
  return <StrategyListScreen />;
}
