import type { Metadata } from 'next';
import { companyDetails } from '@tradetoken/domain/fixtures';

import { CompanyScreen } from '@/features/company/company-screen';

/** Params are a Promise in this version of Next and must be awaited. */
type Props = { params: Promise<{ ticker: string }> };

export function generateStaticParams() {
  return Object.keys(companyDetails).map((ticker) => ({ ticker }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ticker } = await params;
  const company = companyDetails[ticker.toUpperCase()];
  if (!company) return { title: 'Company not found' };

  return {
    title: `${company.name} exposure`,
    description: `${company.name} held across ${company.representations.length} representations — brokerage, Coinbase B20 and partner mints — with only the onchain legs allocatable.`,
  };
}

export default async function CompanyPage({ params }: Props) {
  const { ticker } = await params;
  return <CompanyScreen ticker={ticker} />;
}
