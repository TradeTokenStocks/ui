'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  allocationCeilingUsd,
  bandMarket,
  executableTotalUsd,
  formatUsd,
  projectBand,
} from '@tradetoken/domain';
import { companyDetails } from '@tradetoken/domain/fixtures';

import { DitherField } from '@/components/dither-field';
import { Display, Num, Panel, SandboxNote, Stat } from '@/components/primitives';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

const ALLOCATION_STEP = 500;

export function StrategyBuilderScreen() {
  const params = useSearchParams();
  const ticker = (params.get('ticker') ?? 'NVDA').toUpperCase();
  const company = companyDetails[ticker] ?? companyDetails.NVDA!;

  const executable = executableTotalUsd(company);
  const maximum = allocationCeilingUsd(executable, ALLOCATION_STEP);

  const [allocation, setAllocation] = useState(Math.min(12000, maximum));
  const [band, setBand] = useState(10);

  const projection = useMemo(
    () => projectBand({ priceUsd: company.priceUsd, allocationUsd: allocation, bandPct: band }),
    [company.priceUsd, allocation, band],
  );

  // Chart geometry only — how far the highlighted band is inset, and how fast
  // the field drifts behind it. Presentation, so it stays in the client.
  const inset = Math.max(10, 46 - band * 0.9);

  return (
    <div className="space-y-8">
      <header>
        <Link
          href={`/companies/${company.ticker}`}
          className="text-[12.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-primary">
          ← {company.name}
        </Link>
        <Display as="h1" className="mt-4 text-3xl">
          Concentrated band
        </Display>
        <Num className="mt-1.5 block text-[12.5px] text-ink-quaternary">
          {bandMarket(company.ticker)} · 1inch Aqua
        </Num>
      </header>

      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Label htmlFor="allocation" className="text-[12.5px] font-medium text-ink-tertiary">
            Allocate from wallet
          </Label>
          <Num className="text-[12px] text-ink-quaternary">of {formatUsd(executable)}</Num>
        </div>
        <Display className="text-4xl">{formatUsd(allocation)}</Display>
        <Slider
          id="allocation"
          value={[allocation]}
          min={1000}
          max={maximum}
          step={ALLOCATION_STEP}
          onValueChange={([next]) => setAllocation(next ?? allocation)}
          aria-label="Strategy allocation in dollars"
        />
      </section>

      <Panel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Display className="text-[13px]">Price band</Display>
          <Num className="text-[12.5px] font-medium text-cobalt-text">
            {formatUsd(projection.lowerUsd, { digits: 2 })} —{' '}
            {formatUsd(projection.upperUsd, { digits: 2 })}
          </Num>
        </div>

        {/* The band as a picture: outside the marked range the position is
            entirely one asset, which is the thing a range order actually does. */}
        <div className="relative mt-4 h-[132px] overflow-hidden rounded-lg bg-surface-sunken">
          <DitherField ramp="strategy" cell={2} speed={0.02 + (40 - band) * 0.004} intensity={0.62} />
          <div
            className="absolute inset-y-0 border-x-2 border-cobalt bg-cobalt/10"
            style={{ left: `${inset}%`, right: `${inset}%` }}
          />
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/85" />
          <Num className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md bg-white px-2 py-1 text-[11px] font-medium text-bg">
            {formatUsd(company.priceUsd, { digits: 2 })}
          </Num>
          <span className="absolute top-3 left-3 text-[11px] font-medium text-ink-quaternary">
            all stock
          </span>
          <span className="absolute top-3 right-3 text-[11px] font-medium text-ink-quaternary">
            all USDC
          </span>
        </div>

        <div className="mt-5 space-y-2">
          <Label htmlFor="band" className="sr-only">
            Price band width in percent
          </Label>
          <Slider
            id="band"
            value={[band]}
            min={3}
            max={40}
            step={1}
            onValueChange={([next]) => setBand(next ?? band)}
            aria-label="Price band width in percent"
            aria-valuetext={`${band} percent`}
          />
          <div className="flex justify-between text-[11px] font-medium text-ink-faint">
            <span>Tight · more fills</span>
            <span>Wide · less drift</span>
          </div>
        </div>
      </Panel>

      <section className="space-y-4">
        <Display className="text-[13px]">What you&apos;d be holding</Display>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-cobalt/25 bg-cobalt/[0.07] p-4">
            <Num className="text-[11.5px] text-ink-tertiary">
              at {formatUsd(projection.lowerUsd, { digits: 2 })}
            </Num>
            <Num className="mt-1.5 block text-lg font-medium text-cobalt-text">100% stock</Num>
            <p className="mt-1 text-[11.5px] text-ink-quaternary">bought all the way down</p>
          </div>
          <div className="rounded-lg border border-stroke-hairline bg-fill-subtle p-4">
            <Num className="text-[11.5px] text-ink-tertiary">
              at {formatUsd(projection.upperUsd, { digits: 2 })}
            </Num>
            <Num className="mt-1.5 block text-lg font-medium">100% USDC</Num>
            <p className="mt-1 text-[11.5px] text-ink-quaternary">sold all the way up</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 border-t border-stroke-hairline pt-5">
          <Stat label="Fills / day" value={projection.fillsPerDay} />
          <Stat
            label="Fees / day"
            value={formatUsd(projection.feesPerDayUsd, { digits: 2 })}
          />
          <Stat
            label="Drift risk"
            value={projection.driftRisk}
            tone={projection.driftRisk === 'High' ? 'amber' : 'default'}
          />
        </div>
        <SandboxNote>Estimated from sandbox fill history. Not a yield forecast.</SandboxNote>
      </section>

      <Button asChild size="lg" className="w-full sm:w-auto">
        <Link
          href={{
            pathname: '/strategies/review',
            query: { ticker: company.ticker, allocation, band },
          }}>
          Review strategy
        </Link>
      </Button>
    </div>
  );
}
