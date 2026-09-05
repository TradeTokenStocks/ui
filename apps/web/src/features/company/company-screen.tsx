import Link from 'next/link';
import { notFound } from 'next/navigation';
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
import { companyDetails } from '@tradetoken/domain/fixtures';

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

export function CompanyScreen({ ticker }: { ticker: string }) {
  const company = companyDetails[ticker.toUpperCase()];
  if (!company) notFound();

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
          Exposure across {company.representations.length} representations
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
              href={{ pathname: '/strategies/new', query: { ticker: company.ticker } }}
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

export function companyExists(ticker: string): CompanyDetail | undefined {
  return companyDetails[ticker.toUpperCase()];
}
