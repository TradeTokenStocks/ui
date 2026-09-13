import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
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
    description: `${company.name} held across brokerage, Coinbase B20 and partner mints — with only the onchain legs allocatable.`,
  };
}

export default async function CompanyPage({ params }: Props) {
  const { ticker } = await params;
  // Resolved here rather than in the screen: the lookup and its 404 are the
  // server's to decide, and the screen reconciles against a live connection it
  // can only read in the browser.
  const company = companyDetails[ticker.toUpperCase()];
  if (!company) notFound();
  return <CompanyScreen company={company} />;
}
