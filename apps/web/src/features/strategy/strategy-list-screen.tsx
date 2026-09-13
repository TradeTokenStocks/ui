'use client';

import Link from 'next/link';
import {
  bandMarket,
  formatNumber,
  formatPercent,
  formatUsd,
  isGain,
  strategyMechanismLabel,
  type LiveStrategyRecord,
  type StrategySummary,
} from '@tradetoken/domain';
import { strategies } from '@tradetoken/domain/fixtures';

import { Chip, Display, Num, Panel, PulseDot, SandboxNote } from '@/components/primitives';
import { ScreenField } from '@/components/screen-field';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { type CreatedSandboxStrategy, useCreatedStrategies } from './created-strategies-store';
import { useLiveStrategies } from './live-strategy-store';

export function StrategyListScreen() {
  const createdStrategies = useCreatedStrategies();
  const liveStrategies = useLiveStrategies().filter((strategy) => strategy.status !== 'closed');
  const strategyCount = strategies.length + createdStrategies.length + liveStrategies.length;

  return (
    <div className="space-y-7">
      <ScreenField ramp="strategy" intensity={0.62} />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-3">
            <Display as="h1" className="text-3xl">Strategies</Display>
            <Num className="text-[12px] text-ink-quaternary">{strategyCount} open</Num>
          </div>
          <p className="mt-2 text-[12.5px] text-ink-tertiary">
            Automated ranges using your onchain balances.
          </p>
        </div>
        <Button asChild>
          <Link href="/strategies/new">New strategy</Link>
        </Button>
      </header>

      {strategyCount > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {liveStrategies.map((strategy) => (
            <LiveStrategyCard key={strategy.id} strategy={strategy} />
          ))}
          {createdStrategies.map((strategy) => (
            <CreatedStrategyCard key={strategy.id} strategy={strategy} />
          ))}
          {strategies.map((strategy) => (
            <StrategyCard key={strategy.ticker} strategy={strategy} />
          ))}
        </div>
      ) : (
        <Panel className="p-6">
          <Display as="h2" className="text-base">No open strategies</Display>
          <p className="mt-2 text-[12.5px] text-ink-tertiary">
            Open one on a company with an available wallet balance.
          </p>
        </Panel>
      )}

      <SandboxNote>
        Strategy positions, fills, and returns are deterministic sandbox fixtures.
      </SandboxNote>
    </div>
  );
}

function LiveStrategyCard({ strategy }: { strategy: LiveStrategyRecord }) {
  return (
    <Link
      href={{ pathname: '/strategies/live', query: { id: strategy.id } }}
      aria-label={`${strategy.tokenA.symbol} / ${strategy.tokenB.symbol}, live Aqua strategy`}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/70">
      <Panel className="h-full border-positive/20 bg-gradient-to-br from-positive/[0.05] to-surface p-5 transition-colors group-hover:border-stroke-raised">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Display as="h2" className="text-[15px]">{strategy.tokenA.symbol} / {strategy.tokenB.symbol}</Display>
              <Chip>{strategyMechanismLabel('pegged')}</Chip>
            </div>
            <Num className="mt-1.5 block text-[11px] text-ink-quaternary">
              Aqua · {strategy.strategyHash.slice(0, 8)}…{strategy.strategyHash.slice(-6)}
            </Num>
          </div>
          <Chip tone="positive"><PulseDot />Live</Chip>
        </div>

        <div className="mt-6 flex items-end justify-between gap-4 border-t border-stroke-hairline pt-4">
          <div>
            <Num className="block text-xl font-medium">{formatUsd(strategy.allocationUsd, { digits: 2 })}</Num>
            <Num className="mt-1 block text-[11.5px] text-positive">Confirmed onchain</Num>
          </div>
          <div className="text-right">
            <Num className="block text-[11.5px] text-ink-quaternary">{(strategy.feeBps / 100).toFixed(2)}% fee</Num>
            <Num className="mt-1 block text-[11.5px] text-positive">Both legs · ±{strategy.guardToleranceBps / 100}%</Num>
          </div>
        </div>
      </Panel>
    </Link>
  );
}

function CreatedStrategyCard({ strategy }: { strategy: CreatedSandboxStrategy }) {
  const pegged = strategy.mechanism === 'pegged';

  return (
    <Panel className="h-full border-cobalt/25 bg-gradient-to-br from-cobalt/[0.065] to-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Display as="h2" className="text-[15px]">{strategy.pairLabel}</Display>
            <Chip>{strategyMechanismLabel(strategy.mechanism)}</Chip>
          </div>
          <Num className="mt-1.5 block text-[11px] text-ink-quaternary">
            {pegged
              ? `ratio ${strategy.lowerValue.toFixed(4)} — ${strategy.upperValue.toFixed(4)}`
              : `${formatUsd(strategy.lowerValue, { digits: 2 })} — ${formatUsd(strategy.upperValue, { digits: 2 })}`}
          </Num>
        </div>
        <Chip tone="positive"><PulseDot />Open</Chip>
      </div>

      <div className="mt-6 flex items-end justify-between gap-4 border-t border-stroke-hairline pt-4">
        <div>
          <Num className="block text-xl font-medium">{formatUsd(strategy.depositedUsd, { digits: 2 })}</Num>
          <Num className="mt-1 block text-[11.5px] text-cobalt-text">Just created</Num>
        </div>
        <div className="text-right">
          <Num className="block text-[11.5px] text-ink-quaternary">{strategy.feeTierPct.toFixed(2)}% fee</Num>
          <Num className="mt-1 block text-[11.5px] text-positive">Both legs · ±{strategy.guardPct}%</Num>
        </div>
      </div>
    </Panel>
  );
}

function StrategyCard({ strategy }: { strategy: StrategySummary }) {
  const positionValue = strategy.depositedUsd * (1 + strategy.gainVsDepositPct / 100);

  return (
    <Link
      href={`/strategies/${strategy.ticker.toLowerCase()}`}
      aria-label={`${bandMarket(strategy.ticker)}, position ${formatUsd(positionValue)}`}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/70">
      <Panel className="h-full p-5 transition-colors group-hover:border-stroke-raised group-hover:bg-fill-subtle">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Display as="h2" className="text-[15px]">{bandMarket(strategy.ticker)}</Display>
              <Chip>{strategyMechanismLabel(strategy.mechanism)}</Chip>
            </div>
            <Num className="mt-1.5 block text-[11px] text-ink-quaternary">
              {formatUsd(strategy.lowerUsd, { digits: 2 })} — {formatUsd(strategy.upperUsd, { digits: 2 })}
            </Num>
          </div>
          <Chip tone="positive"><PulseDot />In band</Chip>
        </div>

        <div className="mt-6 flex items-end justify-between gap-4 border-t border-stroke-hairline pt-4">
          <div>
            <Num className="block text-xl font-medium">{formatUsd(positionValue, { digits: 2 })}</Num>
            <Num className={cn('mt-1 block text-[11.5px]', isGain(strategy.gainVsDepositPct) ? 'text-positive' : 'text-ink-quaternary')}>
              {formatPercent(strategy.gainVsDepositPct, 2)} vs deposit
            </Num>
          </div>
          <div className="text-right">
            <Num className="block text-[11.5px] text-ink-quaternary">{formatNumber(strategy.fills)} fills</Num>
            <Num className="mt-1 block text-[11.5px] text-ink-quaternary">{strategy.timeInBandPct}% in band</Num>
          </div>
        </div>
      </Panel>
    </Link>
  );
}
