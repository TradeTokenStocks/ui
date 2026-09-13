'use client';

import Link from 'next/link';
import {
  executableTotalUsd,
  formatNumber,
  formatPercent,
  formatUsd,
  isGain,
  splitUsd,
  type CompanyDetail,
  type Representation,
} from '@tradetoken/domain';

import { DitherField } from '@/components/dither-field';
import {
  Balance,
  Chip,
  Display,
  Num,
  Panel,
  SandboxNote,
  SectionLabel,
} from '@/components/primitives';
import { Button } from '@/components/ui/button';
import { useBrokerageHoldings, type BrokerageHoldings } from '@/features/connections/hooks/use-brokerage-holdings';
import { cn } from '@/lib/utils';

/**
 * Cobalt for B20, violet for a partner mint, outline for brokerage. The tint is
 * the fastest way to see which part of a position can actually be put to work.
 */
const TINTS: Record<Representation['tint'], string> = {
  cobalt: 'bg-cobalt shadow-[0_0_12px_rgba(94,124,255,0.5)]',
  violet: 'bg-violet shadow-[0_0_12px_rgba(142,99,255,0.45)]',
  outline: 'border border-white/20',
};

/**
 * The company's exposure, reconciled against the live brokerage.
 *
 * Observed legs come only from a linked brokerage, never from the fixture, so
 * an unlinked account shows its onchain legs alone. Everything downstream — the headline total,
 * the share-equivalents, the stacked bar, the allocatable figure — is derived
 * from the resulting legs, so the page cannot disagree with itself or with the
 * portfolio list that led here.
 */
function reconcile(company: CompanyDetail, brokerage: BrokerageHoldings): CompanyDetail {
  const representations = observedLegs(company, brokerage);

  const totalUsd = representations.reduce((sum, rep) => sum + rep.valueUsd, 0);
  return {
    ...company,
    totalUsd,
    // Share-equivalents are value over price, which is how the fixture's own
    // figures were derived — recomputing keeps the unit honest when the legs
    // change underneath it.
    shareEquivalents: company.priceUsd > 0 ? totalUsd / company.priceUsd : 0,
    representations: representations.map((rep) => ({
      ...rep,
      sharePct: totalUsd > 0 ? (rep.valueUsd / totalUsd) * 100 : 0,
    })),
  };
}

function observedLegs(company: CompanyDetail, brokerage: BrokerageHoldings): Representation[] {
  const onchain = company.representations.filter((rep) => rep.executable);
  const position = brokerage.positions.find(
    (item) => item.ticker.toUpperCase() === company.ticker.toUpperCase(),
  );
  if (!position) return onchain;

  return [
    ...onchain,
    {
      id: `${company.ticker}-observed`,
      label: `Brokerage · ${brokerage.institution ?? 'SnapTrade'}`,
      detail: `${formatNumber(position.shares, 2)} shares · ${formatUsd(position.priceUsd, { digits: 2 })} each`,
      valueUsd: position.valueUsd,
      tint: 'outline',
      executable: false,
      sharePct: 0,
    },
  ];
}

export function CompanyScreen({ company: fixture }: { company: CompanyDetail }) {
  const brokerage = useBrokerageHoldings();
  const company = reconcile(fixture, brokerage);

  const total = splitUsd(company.totalUsd);
  const executable = executableTotalUsd(company);

  return (
    <div className="space-y-9">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[300px] overflow-hidden">
        {/* Violet ramp: both executable legs on this screen are violet-adjacent,
            so the field picks up the second executable tint rather than cobalt. */}
        <DitherField ramp="company" intensity={0.7} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg/85 to-bg" />
      </div>

      <header>
        <Link
          href="/"
          className="text-[12.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-primary">
          ← Portfolio
        </Link>

        <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Display as="h1" className="text-3xl">
            {company.name}
          </Display>
          <Num className="text-[12.5px] text-ink-quaternary">
            {company.ticker} · {formatUsd(company.priceUsd, { digits: 2 })}
          </Num>
          <Num
            className={cn(
              'text-[12.5px] font-medium',
              isGain(company.changePct) ? 'text-positive' : 'text-ink-quaternary',
            )}>
            {formatPercent(company.changePct)}
          </Num>
        </div>

        <p className="mt-6 text-[12.5px] font-medium text-ink-tertiary">
          Exposure across {company.representations.length}{' '}
          {company.representations.length === 1 ? 'representation' : 'representations'}
        </p>
        <Balance whole={total.whole} cents={total.cents} className="mt-1.5" />
        <Num className="mt-2 block text-[12.5px] font-medium text-ink-quaternary">
          {formatNumber(company.shareEquivalents, 1)} share-equivalents
        </Num>

        <div className="mt-6 flex h-1.5 gap-1" aria-hidden>
          {company.representations.map((rep) => (
            <div
              key={rep.id}
              className={cn('rounded-pill', TINTS[rep.tint])}
              style={{ flexGrow: rep.sharePct }}
            />
          ))}
        </div>
      </header>

      <Panel>
        <ul className="divide-y divide-stroke-hairline">
          {company.representations.map((rep) => (
            <li key={rep.id} className="flex items-center gap-4 px-5 py-4">
              <span aria-hidden className={cn('h-8 w-1 shrink-0 rounded-pill', TINTS[rep.tint])} />
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold">{rep.label}</span>
                <Num className="mt-0.5 block text-[11.5px] text-ink-quaternary">{rep.detail}</Num>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <Chip tone={rep.executable ? 'cobalt' : 'neutral'}>
                  {rep.executable ? 'Executable' : 'Observed'}
                </Chip>
                <Num className="w-24 text-right text-[13.5px] font-medium">
                  {formatUsd(rep.valueUsd)}
                </Num>
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <section className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="rounded-lg border border-stroke-hairline bg-fill-subtle p-4">
          <SectionLabel>Why the counts differ</SectionLabel>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-secondary">
            B20 tokens carry a multiplier that moves on splits and cash dividends, so one token is
            not always one share. Totals are always shown in share-equivalents.
          </p>
        </div>

        <div className="space-y-2 sm:w-[280px]">
          <Button asChild size="lg" className="w-full">
            <Link
              href={{ pathname: '/strategies/new/type', query: { ticker: company.ticker } }}
              aria-describedby="allocate-note">
              Allocate {formatUsd(executable)} executable
            </Link>
          </Button>
          {/* Stated rather than implied: the button's figure is smaller than the
              headline total and the user is owed the reason. */}
          <SandboxNote id="allocate-note" className="text-center">
            Brokerage holdings can&apos;t be allocated.
          </SandboxNote>
        </div>
      </section>
    </div>
  );
}
