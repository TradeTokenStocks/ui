import type { Metadata } from 'next';

import { PortfolioScreen } from '@/features/portfolio/portfolio-screen';

export const metadata: Metadata = {
  title: 'Portfolio',
  description:
    'One position per company, split into the part you can put to work onchain and the part your brokerage only lets you watch.',
};

export default function PortfolioPage() {
  return <PortfolioScreen />;
}
