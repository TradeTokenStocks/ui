'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Plus } from 'lucide-react';
import {
  executableTotalUsd,
  formatLedgerAmount,
  formatNumber,
  formatPercent,
  formatUsd,
  isGain,
  splitUsd,
  type BrokeragePosition,
  type CompanyExposure,
  type DividendPreference,
  type LedgerRow,
  type TokenizedStock,
} from '@tradetoken/domain';
import {
  account,
  activity,
  companies,
  companyDetails,
  tokenizedStocks,
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
  SectionLabel,
} from '@/components/primitives';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useBrokerageHoldings } from '@/features/connections/hooks/use-brokerage-holdings';
import { AddStockDialog } from '@/features/stocks/add-stock-dialog';
import { useWalletStockHoldings } from '@/features/stocks/use-wallet-stock-holdings';
import { useIndexedEvents } from '@/features/events/use-indexed-events';

/**
 * What a company holds onchain, taken from the legs its own detail page calls
 * executable. A row and the page it opens have to show the same number, so
 * both read the same source rather than a stored percentage.
 */
function onchainValueUsd(company: CompanyExposure): number {
  const detail = companyDetails[company.ticker];
  if (detail) return executableTotalUsd(detail);
  return company.valueUsd * (company.onchainPct / 100);
}

export function PortfolioScreen() {
  const [addStockOpen, setAddStockOpen] = useState(false);
  const [added, setAdded] = useState<Record<string, { amountUsd: number; preference: DividendPreference }>>({});
  const brokerage = useBrokerageHoldings();
  const walletStocks = useWalletStockHoldings();
  const indexedEvents = useIndexedEvents();
  const addedTotalUsd = Object.values(added).reduce((total, holding) => total + holding.amountUsd, 0);
  /**
   * Total exposure is wallet plus brokerage, and nothing else. An unlinked or
   * expired brokerage contributes zero rather than a remembered figure — the
   * headline number never claims to know something the connection cannot tell
   * it right now.
   */
  const walletAllocatableUsd = walletStocks.live
    ? walletStocks.totalUsd
    : totals.walletAllocatableUsd + addedTotalUsd;
  const brokerageObservedUsd = brokerage.connected ? brokerage.totalValueUsd : 0;
  const exposure = splitUsd(walletAllocatableUsd + brokerageObservedUsd);
  const liveHoldingsByTicker = (walletStocks.holdings ?? []).reduce<Record<string, number>>((acc, item) => {
    if (item.valueUsd > 0) {
      acc[item.underlying] = (acc[item.underlying] ?? 0) + item.valueUsd;
    }
    return acc;
  }, {});

  const liveTickers = Array.from(
    new Set([...Object.keys(liveHoldingsByTicker), ...Object.keys(added)])
  );

  const visibleCompanies: CompanyExposure[] = walletStocks.live
    ? liveTickers
        .map((ticker) => {
          const stock = tokenizedStocks.find((item) => item.ticker === ticker);
          const holding = added[ticker];
          const walletValue = (liveHoldingsByTicker[ticker] ?? 0) + (holding?.amountUsd ?? 0);
          const brokeragePos = brokerage.connected
            ? brokerage.positions.find((p) => p.ticker.toUpperCase() === ticker.toUpperCase())
            : undefined;
          const brokerageValue = brokeragePos?.valueUsd ?? 0;
          const totalValue = walletValue + brokerageValue;
          const onchainPct = totalValue > 0 ? Math.round((walletValue / totalValue) * 100) : 100;
          const observedPct = 100 - onchainPct;

          return {
            ticker,
            name: stock?.name ?? ticker,
            initials: ticker.slice(0, 2),
            valueUsd: totalValue,
            changePct: stock?.changePct ?? 0,
            observedPct,
            onchainPct,
            ...(holding ? { dividendPreference: holding.preference } : {}),
          };
        })
        .filter((company) => company.valueUsd > 0)
    : [
        ...companies.map((company) => {
          const holding = added[company.ticker];
          return {
            ...company,
            valueUsd: onchainValueUsd(company) + (holding?.amountUsd ?? 0),
            ...(holding ? { dividendPreference: holding.preference } : {}),
          };
        }),
        ...Object.entries(added)
          .filter(([ticker]) => !companies.some((company) => company.ticker === ticker))
          .map(([ticker, holding]) => {
            const stock = tokenizedStocks.find((item) => item.ticker === ticker)!;
            return {
              ticker,
              name: stock.name,
              initials: ticker.slice(0, 2),
              observedPct: 0,
              onchainPct: 100,
              valueUsd: holding.amountUsd,
              changePct: stock.changePct,
              dividendPreference: holding.preference,
            };
          }),
      ];

  const unmergedBrokeragePositions = brokerage.connected
    ? brokerage.positions.filter(
        (p) => !visibleCompanies.some((c) => c.ticker.toUpperCase() === p.ticker.toUpperCase()),
      )
    : [];

  const addStock = (stock: TokenizedStock, amountUsd: number, preference: DividendPreference) => setAdded((current) => ({ ...current, [stock.ticker]: { amountUsd: (current[stock.ticker]?.amountUsd ?? 0) + amountUsd, preference } }));

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
            {formatUsd(walletAllocatableUsd)}
          </Num>
          <p className="mt-3 text-[11.5px] leading-relaxed text-white/70">
            Ready for strategies
          </p>
        </div>

        <div className="rounded-xl border border-stroke-hairline bg-fill-subtle p-5">
          <div className="text-[11.5px] font-semibold text-ink-tertiary">
            Brokerage · observed
          </div>
          <Num className="mt-2 block text-2xl font-medium">{formatUsd(brokerageObservedUsd)}</Num>
          {brokerage.connected ? (
            <p className="mt-3 text-[11.5px] leading-relaxed text-ink-quaternary">
              Read-only · {brokerage.institution ?? 'SnapTrade'}
            </p>
          ) : (
            <Link
              href="/connections"
              className="mt-3 inline-block text-[11.5px] leading-relaxed text-ink-quaternary underline decoration-stroke-raised underline-offset-4 hover:text-ink-secondary">
              {brokerage.needsReconnect
                ? 'Access expired · reconnect'
                : brokerage.isLoading
                  ? 'Checking connection…'
                  : 'Connect a brokerage'}
            </Link>
          )}
        </div>
      </section>

      <Tabs defaultValue="holdings" className="gap-5">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
          <TabsTrigger value="events" className="gap-1.5">
            Events
            {indexedEvents.events.length > 0 ? (
              <span className="size-1.5 rounded-full bg-amber" aria-label="Needs review" />
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="holdings">
          <Panel className="bg-gradient-to-b from-surface to-surface-sunken">
            <div className="flex items-center justify-between gap-4 border-b border-stroke-hairline bg-fill-subtle px-5 py-4 sm:px-6">
              <div className="min-w-0 flex-1">
                <Display className="text-base">Companies</Display>
                <span className="mt-0.5 block text-[11.5px] font-medium text-ink-quaternary">
                  {formatNumber(visibleCompanies.length + unmergedBrokeragePositions.length)} holdings
                </span>
              </div>
              <button type="button" onClick={() => setAddStockOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-cobalt px-3 py-2 text-[11.5px] font-semibold text-white shadow-[0_8px_20px_rgba(61,82,222,.25)] hover:bg-cobalt/90"><Plus className="size-3.5" /> Add stock</button>
            </div>
            {brokerage.connected ? (
              <div className="border-b border-stroke-hairline px-5 py-3 sm:px-6">
                <SectionLabel>Consolidated · onchain & observed</SectionLabel>
              </div>
            ) : null}
            {visibleCompanies.length > 0 ? (
              <ul className="divide-y divide-stroke-hairline px-3 sm:px-4">
                {visibleCompanies.map((company) => (
                  <li key={company.ticker}>
                    <CompanyRow company={company} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-5 py-8 text-center sm:px-6">
                <p className="text-[13px] font-medium text-ink-tertiary">No onchain stock tokens yet</p>
                <p className="mt-1 text-[11.5px] text-ink-quaternary">
                  Mint tokenized stock pairs to commit into Aqua strategies.
                </p>
                <button
                  type="button"
                  onClick={() => setAddStockOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-stroke-hairline bg-fill-muted px-3 py-1.5 text-[11.5px] font-medium text-ink-secondary hover:border-cobalt/40 hover:text-cobalt-text">
                  <Plus className="size-3.5" /> Mint test stocks
                </button>
              </div>
            )}

            {brokerage.connected && unmergedBrokeragePositions.length > 0 ? (
              <>
                <div className="border-t border-stroke-hairline bg-fill-subtle px-5 py-3 sm:px-6">
                  <SectionLabel>
                    Observed at {brokerage.institution ?? 'brokerage'} · read-only
                  </SectionLabel>
                </div>
                <ul className="divide-y divide-stroke-hairline px-3 sm:px-4">
                  {unmergedBrokeragePositions.map((position) => (
                    <li key={position.ticker}>
                      <ObservedRow position={position} />
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </Panel>
        </TabsContent>

        <TabsContent value="events">
          <Panel>
            {indexedEvents.loading ? <p className="px-5 py-8 text-center text-[12px] text-ink-faint">Loading indexed events…</p> : null}
            {indexedEvents.error ? <p className="px-5 py-8 text-center text-[12px] text-amber-bright">{indexedEvents.error}</p> : null}
            {!indexedEvents.loading && !indexedEvents.error && indexedEvents.events.length === 0 ? <p className="px-5 py-8 text-center text-[12px] text-ink-faint">No multiplier updates indexed yet.</p> : null}
            <ul className="divide-y divide-stroke-hairline">
              {indexedEvents.events.map((row) => (
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
      <AddStockDialog open={addStockOpen} onOpenChange={setAddStockOpen} onComplete={addStock} />
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
              {company.dividendPreference ? <Chip tone={company.dividendPreference === 'drip' ? 'cobalt' : 'positive'} className="px-2 py-0.5 text-[9px]">{company.dividendPreference === 'drip' ? 'DRIP' : 'USDC yield'}</Chip> : null}
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

/**
 * A brokerage position. Inert by design — no link, no chevron, nothing to open:
 * there is no onchain representation behind it to act on.
 */
function ObservedRow({ position }: { position: BrokeragePosition }) {
  return (
    <div className="flex items-start gap-4 px-2 py-5 sm:px-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-stroke-hairline bg-fill-subtle text-[12px] font-semibold text-ink-tertiary">
        {position.ticker.slice(0, 2)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[14.5px] font-semibold">{position.name}</span>
              <Chip className="px-2 py-0.5 text-[9px]">Observed</Chip>
            </div>
            <Num className="mt-0.5 block text-[10.5px] text-ink-faint">
              {position.ticker} · {formatNumber(position.shares, 2)} shares
            </Num>
          </div>
          <div className="shrink-0 text-right">
            <Num className="block text-[14px] font-medium">{formatUsd(position.valueUsd)}</Num>
            <Num className="mt-0.5 block text-[11.5px] text-ink-quaternary">
              {formatUsd(position.priceUsd, { digits: 2 })}
            </Num>
          </div>
        </div>
      </div>
    </div>
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
