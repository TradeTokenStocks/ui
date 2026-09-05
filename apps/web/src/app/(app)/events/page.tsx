import type { Metadata } from 'next';

import { CorporateActionScreen } from '@/features/events/corporate-action-screen';

export const metadata: Metadata = { title: 'Events' };

export default function EventsPage() {
  return <CorporateActionScreen />;
}
