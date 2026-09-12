import Link from 'next/link';
import {
  bandMarket,
  executableTotalUsd,
  formatUsd,
  hasPeggedEligibility,
  resolveCompany,
} from '@tradetoken/domain';
import { companyDetails } from '@tradetoken/domain/fixtures';

import { Chip, Display, Num, Panel } from '@/components/primitives';

export function StrategyTypePickerScreen({ ticker }: { ticker: string }) {
  const company = resolveCompany(companyDetails, ticker, 'NVDA');
  const peggedEligible = hasPeggedEligibility(company);

  return (
    <div className="mx-auto max-w-[620px] space-y-7">
      <header>
        <Link href="/strategies/new" className="text-[12.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-primary">
          ← Choose company
        </Link>
        <Display as="h1" className="mt-4 text-3xl">Choose strategy</Display>
        <Num className="mt-2 block text-[12px] text-ink-quaternary">
          {bandMarket(company.ticker)} · {formatUsd(executableTotalUsd(company))} allocatable
        </Num>
      </header>

      <div className="space-y-3">
        <TypeLink
          href={{ pathname: '/strategies/new/configure', query: { mechanism: 'concentrated', ticker: company.ticker } }}
          title="Concentrated liquidity"
          description="Set a stock/USDC price band and earn fees while price stays inside it."
        />

        {peggedEligible ? (
          <TypeLink
            href={{ pathname: '/strategies/new/configure', query: { mechanism: 'pegged', ticker: company.ticker } }}
            title="Same-stock pegged"
            description="Provide liquidity between two tokenized representations of the same company, near their calculated parity."
            note={`${company.ticker} has Dinari and xStock representations ready`}
          />
        ) : (
          <Panel aria-disabled className="p-5 opacity-55">
            <div className="flex items-center justify-between gap-3">
              <Display as="h2" className="text-[15px]">Same-stock pegged</Display>
              <Chip>Unavailable</Chip>
            </div>
            <p className="mt-2 text-[12px] text-ink-quaternary">
              Needs a second tokenized {company.ticker} representation.
            </p>
          </Panel>
        )}
      </div>
    </div>
  );
}

function TypeLink({
  href,
  title,
  description,
  note,
}: {
  href: React.ComponentProps<typeof Link>['href'];
  title: string;
  description: string;
  note?: string;
}) {
  return (
    <Link href={href} className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/70">
      <Panel className="p-5 transition-colors group-hover:border-cobalt/30 group-hover:bg-cobalt/[0.045]">
        <div className="flex items-center justify-between gap-3">
          <Display as="h2" className="text-[15px]">{title}</Display>
          <span aria-hidden className="text-ink-tertiary">›</span>
        </div>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-tertiary">{description}</p>
        {note ? <Num className="mt-2 block text-[11px] text-ink-quaternary">{note}</Num> : null}
      </Panel>
    </Link>
  );
}
