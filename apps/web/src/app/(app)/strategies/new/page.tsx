import type { Metadata } from 'next';

import { StrategyCompanyPickerScreen } from '@/features/strategy/strategy-company-picker-screen';

export const metadata: Metadata = { title: 'New strategy' };

export default function NewStrategyPage() {
  return <StrategyCompanyPickerScreen />;
}
