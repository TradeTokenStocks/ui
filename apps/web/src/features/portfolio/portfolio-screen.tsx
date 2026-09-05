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
  SandboxNote,
} from '@/components/primitives';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export function PortfolioScreen() {
  const exposure = splitUsd(totals.exposureUsd);

  return (
    <div className="space-y-10">
      <header className="relative">
        {/* Ambient field behind the balance only. It stops well above the list
            so no figure ever sits on moving pixels. */}
        <div className="pointer-events-none absolute inset-x-[-2rem] top-[-3.5rem] -z-10 h-[320px] overflow-hidden sm:inset-x-[-2.5rem]">
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
        <div className="specular relative overflow-hidden rounded-xl bg-gradient-to-br from-cobalt to-cobalt-deep p-5 shadow-[0_12px_40px_-12px_rgba(52,72,220,0.6)]">
          <div className="text-[11.5px] font-semibold text-white/80">Wallet · allocatable</div>
          <Num className="mt-2 block text-2xl font-medium text-white">
            {formatUsd(totals.walletAllocatableUsd)}
          </Num>
          <p className="mt-3 text-[11.5px] leading-relaxed text-white/70">
            Onchain. This is the only balance a strategy can draw on.
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
            Read-only and lagging. It can never settle a fill.
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
          <Panel>
            <div className="flex items-center justify-between border-b border-stroke-hairline px-5 py-4">
              <Display className="text-[14.5px]">By company</Display>
              <span className="text-[12px] font-medium text-ink-quaternary">
                {formatNumber(totals.holdingsCount)} holdings
              </span>
            </div>
            <ul>
              {companies.map((company) => (
                <li key={company.ticker}>
                  <CompanyRow company={company} />
                </li>
              ))}
            </ul>
            <SandboxNote className="border-t border-stroke-hairline px-5 py-4">
              Three of {formatNumber(totals.holdingsCount)} positions are itemised. All figures
              are deterministic fixtures — no brokerage or chain is queried.
            </SandboxNote>
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
      className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-fill-press focus-visible:bg-fill-press">
      <span className="grid size-9 shrink-0 place-items-center rounded-md border border-stroke-hairline bg-fill-muted text-[11.5px] font-semibold text-ink-secondary">
        {company.initials}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[14px] font-semibold">
          {company.name}
          <ArrowUpRight className="size-3.5 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100" />
        </span>
        <ExposureBar
          className="mt-2 max-w-[240px]"
          onchainPct={company.onchainPct}
          observedPct={company.observedPct}
        />
        <span className="sr-only">
          {company.onchainPct}% onchain and allocatable, {company.observedPct}% observed at a
          brokerage.
        </span>
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
