'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  bandMarket,
  formatLedgerAmount,
  formatNumber,
  formatPercent,
  formatUsd,
  resolveStrategy,
  type LedgerRow,
} from '@tradetoken/domain';
import { strategies, strategyActivity } from '@tradetoken/domain/fixtures';

import {
  Chip,
  Display,
  Num,
  Panel,
  PulseDot,
  SandboxNote,
  Stat,
} from '@/components/primitives';
import { ScreenField } from '@/components/screen-field';
import { DitherField } from '@/components/dither-field';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'onchain', label: 'Onchain' },
  { value: 'observed', label: 'Observed' },
] as const;

export function ActiveStrategyScreen({ ticker }: { ticker: string }) {
  const [filter, setFilter] = useState<string>('all');
  const strategy = resolveStrategy(strategies, ticker);

  const rows = useMemo(
    () =>
      (strategyActivity[strategy.ticker] ?? []).filter(
        (row) => filter === 'all' || row.provenance === filter,
      ),
    [filter, strategy.ticker],
  );

  const positionValue = strategy.depositedUsd * (1 + strategy.gainVsDepositPct / 100);
  const usdcPct = 100 - strategy.stockPct;
  // Where spot sits inside the band, as a percentage across the chart.
  const spotPct =
    ((strategy.spotUsd - strategy.lowerUsd) /
      (strategy.upperUsd - strategy.lowerUsd)) *
    100;

  return (
    <div className="space-y-8">
      <ScreenField ramp="strategy" intensity={0.6} />

      <header>
        <Link href="/strategies" className="mb-5 inline-block text-[12.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-primary">
          ← Strategies
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <Display as="h1" className="text-2xl">
            {bandMarket(strategy.ticker)}
          </Display>
          <Chip tone="positive">
            <PulseDot />
            In band
          </Chip>
        </div>
        <Num className="mt-1.5 block text-[12px] text-ink-quaternary">
          Open {strategy.openDays} days · opened from executable exposure only
        </Num>

        <p className="mt-7 text-[12.5px] font-medium text-ink-tertiary">Position value</p>
        <Display className="mt-1 text-5xl">{formatUsd(positionValue, { digits: 2 })}</Display>
        <div className="mt-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Num className="text-[13px] font-medium text-positive">
            {formatUsd(strategy.feesEarnedUsd, { digits: 2, sign: true })} fees
          </Num>
          <Num className="text-[13px] text-ink-quaternary">
            {formatPercent(strategy.gainVsDepositPct, 2)} vs deposit
          </Num>
        </div>
      </header>

      <Panel className="p-5">
        {/* Where the band sits against spot. The shaded region is the range the
            strategy quotes in; outside it the position stops rebalancing. */}
        <div className="relative h-[120px] overflow-hidden rounded-lg border border-stroke-hairline bg-cobalt/[0.06]">
          <DitherField
            ramp="strategy"
            cell={2}
            speed={0.02}
            intensity={0.46}
            className="absolute inset-0 opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-bg/5 via-transparent to-bg/60" />
          <div className="absolute inset-y-0 left-[8%] right-[8%] border-x-2 border-cobalt/70 bg-cobalt/10" />
          <div
            className="absolute inset-y-0 w-px bg-white/85"
            style={{ left: `${8 + spotPct * 0.84}%` }}
          />
          <Num className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md bg-white px-2 py-1 text-[11px] font-medium text-bg"
            style={{ left: `${8 + spotPct * 0.84}%` }}>
            {formatUsd(strategy.spotUsd, { digits: 2 })}
          </Num>
          <Num className="absolute bottom-3 left-3 text-[11px] text-ink-quaternary">
            {formatUsd(strategy.lowerUsd, { digits: 2 })}
          </Num>
          <Num className="absolute right-3 bottom-3 text-[11px] text-ink-quaternary">
            {formatUsd(strategy.upperUsd, { digits: 2 })}
          </Num>
        </div>

        <div className="mt-5">
          <div className="flex h-2 gap-1" aria-hidden>
            <div
              className="rounded-pill bg-cobalt"
              style={{ flexGrow: strategy.stockPct }}
            />
            <div
              className="rounded-pill border border-stroke-raised"
              style={{ flexGrow: usdcPct }}
            />
          </div>
          <div className="mt-2 flex justify-between">
            <Num className="text-[11.5px] font-medium text-cobalt-text">
              {strategy.stockPct}% stock ·{' '}
              {formatNumber(strategy.stockPct * 0.687, 1)} tokens
            </Num>
            <Num className="text-[11.5px] font-medium text-ink-quaternary">{usdcPct}% USDC</Num>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-stroke-hairline pt-5">
          <Stat label="Fills" value={formatNumber(strategy.fills)} />
          <Stat
            label="Fees earned"
            value={formatUsd(strategy.feesEarnedUsd, { digits: 2 })}
          />
          <Stat label="Time in band" value={`${strategy.timeInBandPct}%`} />
        </div>
      </Panel>

      <Tabs value={filter} onValueChange={setFilter} className="gap-5">
        <TabsList>
          {FILTERS.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {FILTERS.map((item) => (
          <TabsContent key={item.value} value={item.value}>
            <Panel>
              <ul className="divide-y divide-stroke-hairline">
                {rows.map((row) => (
                  <li key={row.id}>
                    <ActivityRow row={row} />
                  </li>
                ))}
              </ul>
              {rows.length === 0 ? (
                <p className="px-5 py-8 text-center text-[12.5px] text-ink-quaternary">
                  Nothing {item.label.toLowerCase()} yet.
                </p>
              ) : null}
            </Panel>
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="outline">
          <Link href={{ pathname: '/strategies/new/type', query: { ticker: strategy.ticker } }}>
            Open another band
          </Link>
        </Button>
        {strategy.ticker === 'NVDA' ? (
          <Button asChild variant="ghost">
            <Link href="/events/nvda-split">Review the Nvidia split</Link>
          </Button>
        ) : null}
      </div>

      <SandboxNote>
        Fills, fees and composition are deterministic sandbox fixtures. No order was routed to
        1inch Aqua and no position exists onchain.
      </SandboxNote>
    </div>
  );
}

function ActivityRow({ row }: { row: LedgerRow }) {
  const onchain = row.provenance === 'onchain';
  return (
    <div className="flex items-center gap-3.5 px-5 py-3.5">
      <span
        aria-hidden
        className={cn(
          'h-8 w-1 shrink-0 rounded-pill',
          onchain ? 'bg-cobalt' : 'border border-white/20',
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold">{row.title}</span>
        <Num className="mt-0.5 block truncate text-[11.5px] text-ink-quaternary">{row.meta}</Num>
      </span>
      <span className="shrink-0 text-right">
        <Num className="block text-[12.5px] font-medium">{formatLedgerAmount(row.amount)}</Num>
        <Num className="mt-0.5 block text-[11px] text-ink-faint">{row.time}</Num>
      </span>
      <span className="sr-only">{onchain ? 'Onchain' : 'Observed at a brokerage'}.</span>
    </div>
  );
}
