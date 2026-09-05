import type { Metadata } from 'next';

import { ActiveStrategyScreen } from '@/features/strategy/active-strategy-screen';

export const metadata: Metadata = { title: 'Strategies' };

export default function StrategiesPage() {
  return <ActiveStrategyScreen />;
}
