import type { Metadata } from 'next';

import { AquaPositionBuilder } from '@/features/strategy/aqua-position-builder';

export const metadata: Metadata = { title: 'Configure strategy' };

export default function ConfigureStrategyPage() {
  return <AquaPositionBuilder />;
}
