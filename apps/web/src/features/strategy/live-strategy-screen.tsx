'use client';

import { explorerTransactionUrl, formatUsd, hackathonDeployment, type LiveStrategyRecord } from '@tradetoken/domain';
import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatUnits } from 'viem';

import { Chip, Display, Num, Panel, PulseDot, SandboxNote, Stat } from '@/components/primitives';
import { ScreenField } from '@/components/screen-field';
import { Button } from '@/components/ui/button';

import { useLiveStrategy, type LiveStrategyStage } from './hooks/use-live-strategy';
import { useLiveStrategies } from './live-strategy-store';

const tradeLabel: Record<LiveStrategyStage, string> = {
  idle: 'Run demo trade',
  quoting: 'Checking guarded quote…',
  approving: 'Approving input token…',
  swapping: 'Submitting demo trade…',
  confirming: 'Confirming trade…',
  complete: 'Run opposite trade',
  rejected: 'Retry guarded quote',
  'updating-multiplier': 'Run demo trade',
  docking: 'Run demo trade',
  docked: 'Run demo trade',
  error: 'Retry demo trade',
};

function tokenAmount(value: bigint, decimals: number) {
  return Number(formatUnits(value, decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function multiplierLabel(value: bigint) {
  return `${Number(formatUnits(value, 18)).toFixed(4)}×`;
}

function shortHash(hash: string) {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

export function LiveStrategyRoute() {
  const id = useSearchParams().get('id');
  const record = useLiveStrategies().find((candidate) => candidate.id === id);

  if (!record) {
    return (
      <div className="mx-auto max-w-[560px] space-y-4">
        <Link href="/strategies" className="text-[12.5px] font-medium text-ink-tertiary hover:text-ink-primary">
          ← Strategies
        </Link>
        <Panel className="p-6">
          <Display as="h1" className="text-base">Strategy not found</Display>
          <p className="mt-2 text-[12.5px] text-ink-tertiary">
            Live strategies are remembered by the browser that opened them.
          </p>
        </Panel>
      </div>
    );
  }

  return <LiveStrategyScreen record={record} />;
}

function LiveStrategyScreen({ record }: { record: LiveStrategyRecord }) {
  const live = useLiveStrategy(record);
  const closed = record.status === 'closed';
  const balanceA = live.position?.strategy.a ?? BigInt(record.tokenA.reserve);
  const balanceB = live.position?.strategy.b ?? BigInt(record.tokenB.reserve);
  const signedA = BigInt(record.tokenA.multiplier);
  const signedB = BigInt(record.tokenB.multiplier);
  const currentA = live.position?.multipliers.a ?? signedA;
  const currentB = live.position?.multipliers.b ?? signedB;
  const multiplierMoved = currentB !== signedB;
  const txUrl = (hash: string) => explorerTransactionUrl(hackathonDeployment, hash);

  return (
    <div className="mx-auto max-w-[720px] space-y-7">
      <ScreenField ramp="strategy" intensity={0.6} />

      <header>
        <Link href="/strategies" className="mb-5 inline-block text-[12.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-primary">
          ← Strategies
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <Display as="h1" className="text-2xl">
            {record.tokenA.symbol} / {record.tokenB.symbol}
          </Display>
          {closed ? (
            <Chip>Closed</Chip>
          ) : (
            <Chip tone="positive">
              <PulseDot />
              Live
            </Chip>
          )}
        </div>
        <Num className="mt-1.5 block text-[12px] text-ink-quaternary">
          Same-stock pegged · Aqua · {hackathonDeployment.chainName}
        </Num>
        <p className="mt-7 text-[12.5px] font-medium text-ink-tertiary">Original allocation</p>
        <Display className="mt-1 text-5xl">{formatUsd(record.allocationUsd, { digits: 2 })}</Display>
      </header>

      <Panel className="p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <BalanceCard issuer={record.tokenA.issuer ?? 'xStock'} symbol={record.tokenA.symbol} amount={tokenAmount(balanceA, record.tokenA.decimals)} />
          <BalanceCard issuer={record.tokenB.issuer ?? 'Ondo'} symbol={record.tokenB.symbol} amount={tokenAmount(balanceB, record.tokenB.decimals)} />
        </div>
        <SandboxNote className="mt-3 text-center">
          {live.position
            ? `Aqua strategy balances · wallet holds ${tokenAmount(live.position.wallet.a, record.tokenA.decimals)} ${record.tokenA.symbol} and ${tokenAmount(live.position.wallet.b, record.tokenB.decimals)} ${record.tokenB.symbol} without escrow`
            : 'Balances signed at creation · Aqua accounts for liquidity without escrow'}
        </SandboxNote>
      </Panel>

      <Panel className="border-positive/20 bg-positive/[0.045] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10.5px] font-semibold tracking-[0.11em] text-positive uppercase">Multiplier circuit breaker</p>
            <Display className="mt-1 text-xl">Both representations guarded</Display>
          </div>
          <Chip tone="positive">
            <ShieldCheck className="size-3.5" />±{record.guardToleranceBps / 100}%
          </Chip>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-4 border-t border-stroke-hairline pt-4">
          <Stat label={record.tokenA.symbol} value={currentA === signedA ? multiplierLabel(signedA) : `${multiplierLabel(signedA)} → ${multiplierLabel(currentA)}`} />
          <Stat
            label={record.tokenB.symbol}
            tone={multiplierMoved ? 'amber' : 'default'}
            value={multiplierMoved ? `${multiplierLabel(signedB)} → ${multiplierLabel(currentB)}` : multiplierLabel(signedB)}
          />
          <Stat label="Swap fee" value={`${(record.feeBps / 100).toFixed(2)}%`} />
        </div>
        <p className="mt-4 text-[11.5px] leading-relaxed text-ink-quaternary">
          Every quote executes both multiplier checks before the PeggedSwap curve. Move either mock
          multiplier outside its signed range and the next demo quote is rejected before a wallet
          transaction is sent.
        </p>
        {live.canUpdateMultiplier && !closed ? (
          <Button
            variant="outline"
            className="mt-4"
            disabled={live.busy}
            onClick={() => void live.updateDemoMultiplier(multiplierMoved ? 'restore' : 'break')}>
            {live.stage === 'updating-multiplier'
              ? 'Updating multiplier…'
              : multiplierMoved
                ? `Restore signed ${record.tokenB.symbol} multiplier`
                : `Simulate ${record.tokenB.symbol} corporate action`}
          </Button>
        ) : null}
      </Panel>

      {closed ? null : (
        <Panel className="border-cobalt/25 bg-cobalt/[0.055] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[13.5px] font-semibold">Demo the strategy</p>
              <Num className="mt-0.5 block text-[11px] text-ink-faint">{live.direction} · 5% of the original leg</Num>
            </div>
            <Chip tone={live.stage === 'rejected' ? 'amber' : 'cobalt'}>
              {live.stage === 'rejected' ? 'Protected' : 'Live quote'}
            </Chip>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button size="lg" className="flex-1" disabled={live.busy} onClick={() => void live.trade()}>
              {tradeLabel[live.stage]}
            </Button>
            <Button size="lg" variant="outline" disabled={live.busy} onClick={() => void live.dock()}>
              {live.stage === 'docking' ? 'Closing strategy…' : 'Close strategy · dock liquidity'}
            </Button>
          </div>
        </Panel>
      )}

      {live.error ? <p className="text-center text-[11.5px] text-amber-bright">{live.error}</p> : null}
      {live.lastHash ? (
        <p className="text-center">
          <a href={txUrl(live.lastHash)} target="_blank" rel="noreferrer" className="font-mono text-[11px] text-ink-faint hover:text-ink-secondary">
            Confirmed · {shortHash(live.lastHash)} ↗
          </a>
        </p>
      ) : null}

      <dl className="space-y-2.5 border-t border-stroke-hairline pt-4">
        <Fact label="Strategy hash" value={shortHash(record.strategyHash)} />
        <Fact label="Open transaction" value={shortHash(record.shipTransactionHash)} href={txUrl(record.shipTransactionHash)} />
        <Fact label="Created" value={new Date(record.createdAt).toLocaleString()} />
        {record.dockTransactionHash ? (
          <Fact label="Close transaction" value={shortHash(record.dockTransactionHash)} href={txUrl(record.dockTransactionHash)} />
        ) : null}
        {record.closedAt ? <Fact label="Closed" value={new Date(record.closedAt).toLocaleString()} /> : null}
      </dl>
    </div>
  );
}

function BalanceCard({ issuer, symbol, amount }: { issuer: string; symbol: string; amount: string }) {
  return (
    <div className="rounded-xl border border-stroke-hairline bg-fill-subtle p-4">
      <p className="text-[10.5px] text-ink-faint">{issuer}</p>
      <Num className="mt-2 block text-xl font-medium">{amount}</Num>
      <p className="mt-0.5 text-[11px] text-ink-quaternary">{symbol}</p>
    </div>
  );
}

function Fact({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[12.5px] text-ink-tertiary">{label}</dt>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="font-mono text-[12.5px] font-medium hover:text-cobalt-text">
          {value} ↗
        </a>
      ) : (
        <Num className="text-[12.5px] font-medium">{value}</Num>
      )}
    </div>
  );
}
