'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { formatNumber, formatSyncedAt, formatUsd } from '@tradetoken/domain';
import { connectionCadence } from '@tradetoken/domain/fixtures';

import { Chip, Display, Num, Panel, PulseDot, SandboxNote, SectionLabel } from '@/components/primitives';
import { ScreenField } from '@/components/screen-field';
import { Button } from '@/components/ui/button';
import { useBrokerageHoldings } from '@/features/connections/hooks/use-brokerage-holdings';
import { cn } from '@/lib/utils';

const TONE_DOT = {
  positive: 'bg-positive',
  cobalt: 'bg-cobalt',
  amber: 'bg-amber',
} as const;

/**
 * What this screen exists to say: observed data lags, and the product tells you
 * by how much rather than implying live prices. The SnapTrade boundary is
 * read-only — holdings and transactions, never trading.
 */
export function ConnectionsScreen({ justConnected = false }: { justConnected?: boolean }) {
  const holdings = useBrokerageHoldings();

  // Returning from the hosted portal is the one moment the cached answer is
  // certainly wrong: a brokerage was linked while this tab sat still.
  const { refetch } = holdings;
  useEffect(() => {
    if (justConnected) refetch();
  }, [justConnected, refetch]);

  return (
    <div className="space-y-8">
      <ScreenField ramp="connections" intensity={0.7} />

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Display as="h1" className="text-3xl">
            Connections
          </Display>
          <p className="mt-1.5 text-[12.5px] text-ink-tertiary">
            Read-only brokerage data · SnapTrade sandbox
          </p>
        </div>
        <Chip tone={holdings.needsReconnect ? 'amber' : 'positive'}>
          {holdings.needsReconnect
            ? '1 needs repair'
            : holdings.connected
              ? 'Connected'
              : 'Nothing connected'}
        </Chip>
      </header>

      <SnapTradeCard {...holdings} />

      <section>
        <SectionLabel>Update cadence</SectionLabel>
        <ul className="mt-3 space-y-3 rounded-lg border border-stroke-hairline bg-fill-subtle p-4">
          {connectionCadence.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <span className={cn('size-1.5 shrink-0 rounded-full', TONE_DOT[item.tone])} />
              <span className="text-[11.5px] font-semibold">{item.title}</span>
              <span className="text-[10.5px] text-ink-tertiary">{item.meta}</span>
            </li>
          ))}
        </ul>
      </section>

      <SandboxNote>
        A linked connection reads a real SnapTrade sandbox brokerage — simulated holdings, but a
        live API. No institution credentials are collected by this app at any point; the hosted
        portal owns that exchange, and access is read-only in both directions.
      </SandboxNote>
    </div>
  );
}

/**
 * One card, four states: unlinked, checking, linked, and expired. They share a
 * frame on purpose — the connection is one thing whose health changes, not four
 * different objects.
 */
function SnapTradeCard(holdings: ReturnType<typeof useBrokerageHoldings>) {
  const { connected, needsReconnect, isLoading, isRefreshing, error } = holdings;

  if (needsReconnect) {
    return (
      <Panel className="border-amber/20 p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-amber/10">
            <AlertTriangle className="size-4 text-amber-bright" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <Display className="text-[14.5px]">SnapTrade</Display>
            <p className="mt-0.5 text-[11.5px] text-ink-tertiary">Access expired</p>
          </div>
        </div>
        <p className="mt-4 border-t border-stroke-hairline pt-4 text-[12.5px] text-ink-secondary">
          Brokerage access has to be granted again before holdings can be read. Until then those
          positions stay out of your consolidated exposure rather than showing at a stale value.
        </p>
        <div className="mt-4">
          <Button asChild>
            <Link href={{ pathname: '/connections/snaptrade', query: { mode: 'reconnect' } }}>
              Reconnect
            </Link>
          </Button>
        </div>
      </Panel>
    );
  }

  if (!connected) {
    return (
      <Panel className="p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-fill-muted text-[12px] font-bold text-ink-tertiary">
            S
          </span>
          <div className="min-w-0 flex-1">
            <Display className="text-[14.5px]">SnapTrade</Display>
            <p className="mt-0.5 text-[11.5px] text-ink-tertiary">
              {isLoading ? 'Checking for a linked brokerage…' : 'No brokerage linked'}
            </p>
          </div>
        </div>
        <p className="mt-4 border-t border-stroke-hairline pt-4 text-[12.5px] leading-relaxed text-ink-secondary">
          Link a sandbox brokerage to see traditional holdings beside your onchain ones. Access is
          read-only: positions and balances, never trading.
        </p>
        {error ? (
          <p role="alert" className="mt-3 text-[11.5px] text-amber-bright">
            {error}
          </p>
        ) : null}
        <div className="mt-4">
          <Button asChild>
            <Link href="/connections/snaptrade">Connect sandbox brokerage</Link>
          </Button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel className="p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-lg bg-positive/10 text-positive">
          <PulseDot />
        </span>
        <div className="min-w-0 flex-1">
          <Display className="text-[14.5px]">{holdings.institution ?? 'SnapTrade'}</Display>
          <p className="mt-0.5 text-[11.5px] text-ink-tertiary">
            Read-only · {formatNumber(holdings.accountCount)}{' '}
            {holdings.accountCount === 1 ? 'account' : 'accounts'} ·{' '}
            {formatNumber(holdings.positions.length)} positions
          </p>
        </div>
        <Chip tone="positive">Live</Chip>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Freshness
          label="Holdings"
          value={formatSyncedAt(holdings.syncedAt)}
          meta="last sync from the brokerage"
        />
        <Freshness
          label="Observed value"
          value={formatUsd(holdings.totalValueUsd)}
          meta="cash and positions"
        />
      </div>

      <p className="mt-4 text-[11.5px] leading-relaxed text-ink-tertiary">
        Holdings refresh daily. Transactions can arrive one business day behind. Nothing here can
        settle a fill.
      </p>

      {error ? (
        <p role="alert" className="mt-3 text-[11.5px] text-amber-bright">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2.5">
        <Button variant="outline" onClick={holdings.refetch} disabled={isRefreshing}>
          {isRefreshing ? 'Syncing…' : 'Refresh holdings'}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/connections/snaptrade">Manage in portal</Link>
        </Button>
      </div>
    </Panel>
  );
}

function Freshness({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <div className="rounded-lg border border-stroke-hairline bg-fill-subtle p-3.5">
      <div className="text-[10.5px] text-ink-tertiary">{label}</div>
      <Num className="mt-1.5 block text-[13px]">{value}</Num>
      <div className="mt-1 text-[10px] text-ink-faint">{meta}</div>
    </div>
  );
}
