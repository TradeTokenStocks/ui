import type { Metadata } from 'next';

import { SnapTradePortalScreen } from '@/features/connections/snaptrade-portal-screen';

export const metadata: Metadata = { title: 'SnapTrade portal' };

type Props = { searchParams: Promise<{ mode?: string | string[] }> };

export default async function SnapTradePage({ searchParams }: Props) {
  const { mode } = await searchParams;
  const selectedMode = Array.isArray(mode) ? mode[0] : mode;
  return <SnapTradePortalScreen {...(selectedMode ? { mode: selectedMode } : {})} />;
}
