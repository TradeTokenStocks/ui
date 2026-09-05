'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import {
  formatLedgerAmount,
  formatNumber,
  formatPercent,
  formatUsd,
  isGain,
  splitUsd,
  type CompanyExposure,
  type LedgerRow,
} from '@tradetoken/domain';
import {
  account,
  activity,
  companies,
  events,
  hasUnreviewedEvents,
  totals,
} from '@tradetoken/domain/fixtures';

import { DitherField } from '@/components/dither-field';
import {
  Balance,
  Chip,
  Display,
  ExposureBar,
  Num,
  Panel,
  PulseDot,
} from '@/components/primitives';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export function PortfolioScreen() {
  const exposure = splitUsd(totals.exposureUsd);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="sr-only">Portfolio</h1>
        {/* Ambient field behind the balance only. It stops well above the list
            so no figure ever sits on moving pixels. Positioned relative to
            <main> (see AppShell) so it spans the full content area rather
            than the narrower max-w reading column. */}
        <div className="pointer-events-none absolute inset-x-0 top-[-1.5rem] -z-10 h-[320px] overflow-hidden lg:top-[-0.5rem]">
          <DitherField ramp="portfolio" intensity={0.85} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg/80 to-bg" />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[12.5px] font-medium text-ink-tertiary">Total exposure</span>
          {account.isSandbox ? (
            <Chip tone="amber">
              <PulseDot />
              Sandbox
            </Chip>
          ) : null}
        </div>

        <Balance whole={exposure.whole} cents={exposure.cents} className="mt-2" />

        <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Num className="text-[13px] font-medium text-positive">
            {formatUsd(totals.changeAbsoluteUsd, { digits: 2, sign: true })}
          </Num>
          <Num className="text-[13px] text-ink-quaternary">
            {formatPercent(totals.changePct, 2)} today
          </Num>
        </div>
      </header>

      {/*
        The single most important distinction in the product. Saturation carries
        it: the allocatable card is the only filled surface on the screen, and
        the observed one is deliberately inert.
      */}
      <section className="grid gap-3 sm:grid-cols-2" aria-label="Exposure by custody">
        <div className="specular relative overflow-hidden rounded-xl border border-cobalt/25 bg-gradient-to-br from-cobalt-deep/65 via-cobalt-deep/30 to-surface-sunken p-5 shadow-[0_16px_42px_-20px_rgba(52,72,220,0.65)]">
          <div className="text-[11.5px] font-semibold text-white/80">Wallet · allocatable</div>
          <Num className="mt-2 block text-2xl font-medium text-white">
            {formatUsd(totals.walletAllocatableUsd)}
          </Num>
          <p className="mt-3 text-[11.5px] leading-relaxed text-white/70">
            Ready for strategies
          </p>
        </div>

        <div className="rounded-xl border border-stroke-hairline bg-fill-subtle p-5">
          <div className="text-[11.5px] font-semibold text-ink-tertiary">
            Brokerage · observed
          </div>
          <Num className="mt-2 block text-2xl font-medium">
            {formatUsd(totals.brokerageObservedUsd)}
          </Num>
          <p className="mt-3 text-[11.5px] leading-relaxed text-ink-quaternary">
            Read-only
          </p>
        </div>
      </section>

      <Tabs defaultValue="holdings" className="gap-5">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
          <TabsTrigger value="events" className="gap-1.5">
            Events
            {hasUnreviewedEvents ? (
              <span className="size-1.5 rounded-full bg-amber" aria-label="Needs review" />
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="holdings">
          <Panel className="bg-gradient-to-b from-surface to-surface-sunken">
            <div className="flex items-center justify-between gap-4 border-b border-stroke-hairline bg-fill-subtle px-5 py-4 sm:px-6">
              <Display className="mr-auto text-base">Companies</Display>
              <span className="text-[11.5px] font-medium text-ink-quaternary">
                {formatNumber(totals.holdingsCount)} holdings
              </span>
            </div>
            <ul className="divide-y divide-stroke-hairline px-3 sm:px-4">
              {companies.map((company) => (
                <li key={company.ticker}>
                  <CompanyRow company={company} />
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>

        <TabsContent value="events">
          <Panel>
            <ul className="divide-y divide-stroke-hairline">
              {events.map((row) => (
                <li key={row.id}>
                  <LedgerItem row={row} />
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>

        <TabsContent value="activity">
          <Panel>
            <ul className="divide-y divide-stroke-hairline">
              {activity.map((row) => (
                <li key={row.id}>
                  <LedgerItem row={row} />
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CompanyRow({ company }: { company: CompanyExposure }) {
  const value = formatUsd(company.valueUsd);
  const change = formatPercent(company.changePct);

  return (
    <Link
      href={`/companies/${company.ticker}`}
      className="group flex items-start gap-4 rounded-lg px-2 py-5 transition-colors hover:bg-fill-press focus-visible:bg-fill-press sm:px-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-stroke-raised bg-fill-muted text-[12px] font-semibold text-ink-secondary">
        {company.initials}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-4">
          <span>
            <span className="flex items-center gap-1.5 text-[14.5px] font-semibold">
              {company.name}
              <ArrowUpRight className="size-3.5 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100" />
            </span>
            <Num className="mt-0.5 block text-[10.5px] text-ink-faint">{company.ticker}</Num>
          </span>
          <span className="shrink-0 text-right">
            <Num className="block text-[14px] font-medium">{value}</Num>
            <Num
              className={cn(
                'mt-0.5 block text-[11.5px]',
                isGain(company.changePct) ? 'text-positive' : 'text-ink-quaternary',
              )}>
              {change}
            </Num>
          </span>
        </span>
        <ExposureBar
          className="mt-3 w-full"
          onchainPct={company.onchainPct}
          observedPct={company.observedPct}
        />
      </span>
    </Link>
  );
}

function LedgerItem({ row }: { row: LedgerRow }) {
  const onchain = row.provenance === 'onchain';
  const needsReview = row.amount.kind === 'action';
  const amount = formatLedgerAmount(row.amount);

  const body = (
    <>
      <span
        aria-hidden
        className={cn(
          'h-8 w-1 shrink-0 rounded-pill',
          onchain
            ? needsReview
              ? 'bg-amber'
              : 'bg-cobalt'
            : 'border border-white/20',
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold">{row.title}</span>
        <Num className="mt-0.5 block truncate text-[11.5px] text-ink-quaternary">{row.meta}</Num>
      </span>
      <span className="shrink-0 text-right">
        <Num className={cn('block text-[13px] font-medium', needsReview && 'text-amber')}>
          {amount}
        </Num>
        <Num className="mt-0.5 block text-[11px] text-ink-faint">{row.time}</Num>
      </span>
      <span className="sr-only">{onchain ? 'Onchain' : 'Observed at a brokerage'}.</span>
    </>
  );

  // Only the corporate action leads anywhere; the rest are records, not doors.
  return row.id === 'nvda-split' ? (
    <Link
      href="/events/nvda-split"
      className="flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-fill-press">
      {body}
    </Link>
  ) : (
    <div className="flex items-center gap-3.5 px-5 py-3.5">{body}</div>
  );
}
