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
        <Link href={{ pathname: '/strategies/new/configure', query: { ticker: company.ticker } }} className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/70">
          <Panel className="p-5 transition-colors group-hover:border-cobalt/30 group-hover:bg-cobalt/[0.045]">
            <div className="flex items-center justify-between gap-3">
              <Display as="h2" className="text-[15px]">Concentrated liquidity</Display>
              <span aria-hidden className="text-ink-tertiary">›</span>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-tertiary">
              Set a stock/USDC price band and earn fees while price stays inside it.
            </p>
          </Panel>
        </Link>

        <DisabledType title="Same-stock pegged" note={peggedEligible ? 'Eligible · builder coming soon' : `Needs another tokenized ${company.ticker} representation`} />
        <DisabledType title="Full range" note="Not planned for stock/USDC pairs" />
      </div>
    </div>
  );
}

function DisabledType({ title, note }: { title: string; note: string }) {
  return (
    <Panel aria-disabled className="p-5 opacity-55">
      <div className="flex items-center justify-between gap-3">
        <Display as="h2" className="text-[15px]">{title}</Display>
        <Chip>Coming soon</Chip>
      </div>
      <p className="mt-2 text-[12px] text-ink-quaternary">{note}</p>
    </Panel>
  );
}
