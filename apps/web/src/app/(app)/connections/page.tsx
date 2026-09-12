import type { Metadata } from 'next';

import { ConnectionsScreen } from '@/features/connections/connections-screen';

export const metadata: Metadata = { title: 'Connections' };

/** SnapTrade's hosted portal returns here with `?connected=1` after a link. */
type Props = { searchParams: Promise<{ connected?: string | string[] }> };

export default async function ConnectionsPage({ searchParams }: Props) {
  const { connected } = await searchParams;
  const flag = Array.isArray(connected) ? connected[0] : connected;
  return <ConnectionsScreen justConnected={flag === '1'} />;
}
