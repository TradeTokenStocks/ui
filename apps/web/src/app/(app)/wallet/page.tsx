import type { Metadata } from 'next';

import { WalletScreen } from '@/features/wallet/wallet-screen';

export const metadata: Metadata = { title: 'Wallet & security' };

export default function WalletPage() {
  return <WalletScreen />;
}
