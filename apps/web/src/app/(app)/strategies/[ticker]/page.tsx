import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { strategies } from '@tradetoken/domain/fixtures';

import { ActiveStrategyScreen } from '@/features/strategy/active-strategy-screen';

type Props = { params: Promise<{ ticker: string }> };

export function generateStaticParams() {
  return strategies.map((strategy) => ({ ticker: strategy.ticker.toLowerCase() }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ticker } = await params;
  return { title: `${ticker.toUpperCase()} strategy` };
}

export default async function StrategyDetailPage({ params }: Props) {
  const { ticker } = await params;
  if (!strategies.some((strategy) => strategy.ticker === ticker.toUpperCase())) notFound();
  return <ActiveStrategyScreen ticker={ticker} />;
}
