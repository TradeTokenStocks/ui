import type { Metadata } from 'next';

import { CorporateActionScreen } from '@/features/events/corporate-action-screen';

export const metadata: Metadata = { title: 'Nvidia split' };

export default function NvidiaSplitPage() {
  return <CorporateActionScreen />;
}
