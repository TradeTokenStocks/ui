import type { Metadata } from 'next';

import { FundingScreen } from '@/features/funding/funding-screen';

export const metadata: Metadata = { title: 'Add funds' };

export default function FundingPage() {
  return <FundingScreen />;
}
