'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { connectionCadence, connections } from '@tradetoken/domain/fixtures';

import { Chip, Display, Num, Panel, PulseDot, SandboxNote, SectionLabel } from '@/components/primitives';
import { ScreenField } from '@/components/screen-field';
import { Button } from '@/components/ui/button';
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
export function ConnectionsScreen() {
  const [holdingsSyncedAt, setHoldingsSyncedAt] = useState<string>(
    connections.snaptrade.holdingsSyncedAt,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [expired, setExpired] = useState(true);

  const refresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    window.setTimeout(() => {
      setRefreshing(false);
      setHoldingsSyncedAt('Just now');
    }, 900);
  };

  return (
    <div className="space-y-8">
      <ScreenField ramp="connections" intensity={0.7} />

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Display as="h1" className="text-3xl">
            Connections
          </Display>
          <p className="mt-1.5 text-[12.5px] text-ink-tertiary">
            Read-only brokerage data · sandbox fixtures
          </p>
        </div>
        <Chip tone={expired ? 'amber' : 'positive'}>
          {expired ? '1 needs repair' : 'All healthy'}
        </Chip>
      </header>

      <Panel className="p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-positive/10 text-positive">
            <PulseDot />
          </span>
          <div className="min-w-0 flex-1">
            <Display className="text-[14.5px]">{connections.snaptrade.title}</Display>
            <p className="mt-0.5 text-[11.5px] text-ink-tertiary">
              Sandbox · self-directed · {connections.snaptrade.accounts} accounts
            </p>
          </div>
          <Chip tone="positive">Live</Chip>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Freshness
            label="Holdings"
            value={holdingsSyncedAt}
            meta="last daily sync"
          />
          <Freshness
            label="Transactions"
            value={connections.snaptrade.transactionsSyncedThrough}
            meta="fully synced through"
          />
        </div>

        <p className="mt-4 text-[11.5px] leading-relaxed text-ink-tertiary">
          Holdings refresh daily. Transactions can arrive one business day behind. Nothing here
          can settle a fill.
        </p>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <Button variant="outline" onClick={refresh} disabled={refreshing}>
            {refreshing ? 'Syncing…' : 'Refresh holdings'}
          </Button>
          <Button asChild variant="ghost">
            <Link href="/connections/snaptrade">Manage in portal</Link>
          </Button>
        </div>
      </Panel>

      {expired ? (
        <Panel className="border-amber/20 p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-amber/10">
              <AlertTriangle className="size-4 text-amber-bright" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <Display className="text-[14.5px]">{connections.alpaca.title}</Display>
              <p className="mt-0.5 text-[11.5px] text-ink-tertiary">{connections.alpaca.meta}</p>
            </div>
          </div>
          <p className="mt-4 border-t border-stroke-hairline pt-4 text-[12.5px] text-ink-secondary">
            <span className="font-semibold text-amber-bright">Reconnect required.</span> Holdings
            stale from {connections.alpaca.staleSince}. Until it is repaired those positions are
            excluded from your consolidated exposure rather than shown at a stale value.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Button asChild>
              <Link href={{ pathname: '/connections/snaptrade', query: { mode: 'reconnect' } }}>
                Reconnect
              </Link>
            </Button>
            <Button variant="ghost" onClick={() => setExpired(false)}>
              Remove connection
            </Button>
          </div>
        </Panel>
      ) : null}

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
        These are SnapTrade sandbox fixtures, not a live brokerage link. No institution
        credentials are collected by this app at any point — the hosted portal owns that exchange.
      </SandboxNote>
    </div>
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
