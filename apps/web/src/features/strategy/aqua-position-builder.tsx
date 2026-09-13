'use client';

import { useState } from 'react';
import Link from 'next/link';
import { pairedRepresentations } from '@tradetoken/domain/fixtures';
import { ArrowLeft, Check, ChevronDown, Info, RotateCcw, ShieldCheck } from 'lucide-react';

import { Chip, Display, Num } from '@/components/primitives';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { AquaPositionChart } from './components/aqua-position-chart';
import { AquaTokenSelectDialog, TokenMark } from './components/aqua-token-select-dialog';
import { useAquaPositionState } from './hooks/use-aqua-position-state';

const QUICK_PAIRS = ['NVDA', 'AAPL', 'TSLA', 'MSFT'] as const;
const FEES = [5, 30, 100] as const;

export function AquaPositionBuilder() {
  const position = useAquaPositionState();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const totalUsd = (Number(position.amountA) || 0) + (Number(position.amountB) || 0);

  const pickPair = (ticker: string) => {
    const [dinari, xstock] = pairedRepresentations(ticker);
    if (!dinari || !xstock) return;
    position.selectToken('a', dinari);
    position.selectToken('b', xstock);
  };

  return (
    <div className="relative left-1/2 w-[calc(100vw-2rem)] max-w-[1280px] -translate-x-1/2 pb-8 lg:w-[calc(100vw-17rem)]">
      <header className="mb-5 flex items-center justify-between gap-4">
        <div>
          <Link href="/strategies/new/type" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-tertiary hover:text-ink-primary">
            <ArrowLeft className="size-3.5" /> Strategies
          </Link>
          <Display as="h1" className="mt-3 text-2xl sm:text-3xl">Create a position</Display>
        </div>
        <button type="button" onClick={position.reset} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold text-ink-tertiary hover:bg-fill-muted hover:text-ink-primary">
          <RotateCcw className="size-3.5" /> Reset
        </button>
      </header>

      <div className="overflow-hidden rounded-2xl border border-stroke-hairline bg-surface shadow-[0_28px_80px_rgba(0,0,0,.28)] lg:grid lg:grid-cols-[370px_minmax(0,1fr)]">
        <aside className="border-b border-stroke-hairline p-4 sm:p-5 lg:border-r lg:border-b-0">
          <ConfigLabel>Provide liquidity for</ConfigLabel>
          <button type="button" onClick={() => setSelectorOpen(true)} className="mt-2.5 flex w-full items-center rounded-xl border border-stroke-raised bg-fill-muted p-3 text-left transition-colors hover:bg-fill-active">
            <span className="flex -space-x-2">
              <TokenMark stock={position.tokenA} />
              <TokenMark stock={position.tokenB} />
            </span>
            <span className="ml-3 min-w-0 flex-1">
              <span className="block text-[14px] font-semibold">{position.tokenA.symbol} / {position.tokenB.symbol}</span>
              <span className="mt-0.5 block truncate text-[11px] text-ink-quaternary">{position.tokenA.name} · two issuers</span>
            </span>
            <ChevronDown className="size-4 text-ink-faint" />
          </button>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {QUICK_PAIRS.map((ticker) => (
              <button key={ticker} type="button" onClick={() => pickPair(ticker)} className={cn('shrink-0 rounded-pill border px-3 py-1.5 text-[11px] font-semibold', position.tokenA.ticker === ticker && position.pairIsSameStock ? 'border-cobalt/35 bg-cobalt/10 text-cobalt-text' : 'border-stroke-hairline bg-fill-subtle text-ink-tertiary hover:text-ink-primary')}>{ticker}</button>
            ))}
          </div>

          <div className="my-5 h-px bg-stroke-hairline" />

          <ConfigLabel>Strategy</ConfigLabel>
          <div className="mt-2.5 rounded-xl border border-cobalt/30 bg-cobalt/[0.06] p-3.5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-cobalt/15 text-cobalt-text"><Check className="size-4" /></span>
              <div>
                <p className="text-[13px] font-semibold">Same-stock pegged</p>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-quaternary">Trade two representations of the same stock around their fair multiplier ratio.</p>
              </div>
            </div>
          </div>
          {!position.pairIsSameStock ? <p className="mt-2 text-[11px] leading-relaxed text-amber-bright">Choose two representations of the same company for guarded execution.</p> : null}

          <fieldset className="mt-5">
            <ConfigLabel as="legend">Price curve</ConfigLabel>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {(['straight', 'curved'] as const).map((curve) => (
                <button key={curve} type="button" onClick={() => position.setCurve(curve)} className={cn('rounded-xl border px-3 py-3 text-left transition-colors', position.curve === curve ? 'border-cobalt/45 bg-cobalt/[0.07]' : 'border-stroke-hairline bg-fill-subtle hover:bg-fill-muted')}>
                  <span className="block text-[12px] font-semibold capitalize">{curve}</span>
                  <span className="mt-1 block text-[10.5px] text-ink-faint">{curve === 'curved' ? 'Deeper near fair value' : 'Even liquidity depth'}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <div className="flex items-center justify-between">
              <ConfigLabel as="legend">Swap fee</ConfigLabel>
              <span className="text-[10.5px] text-ink-faint">Auto</span>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              {FEES.map((fee) => (
                <button key={fee} type="button" onClick={() => position.setFeeBps(fee)} className={cn('rounded-lg border py-2 text-[11px] font-semibold', position.feeBps === fee ? 'border-cobalt/45 bg-cobalt/[0.08] text-cobalt-text' : 'border-stroke-hairline bg-fill-subtle text-ink-tertiary')}>{(fee / 100).toFixed(2)}%</button>
              ))}
            </div>
          </fieldset>

          <div className="mt-5 rounded-xl border border-positive/20 bg-positive/[0.045] p-3.5">
            <div className="flex items-center gap-2 text-positive"><ShieldCheck className="size-4" /><span className="text-[12px] font-semibold">Multiplier guard</span></div>
            <p className="mt-2 text-[10.5px] leading-relaxed text-ink-quaternary">Both stock legs stop filling if either issuer multiplier moves outside its approved range.</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[11px] text-ink-tertiary">Tolerance</span>
              <div className="flex items-center gap-1.5">
                {[2, 5, 10].map((value) => <button key={value} type="button" onClick={() => position.setGuardTolerancePct(value)} className={cn('rounded-md px-2 py-1 text-[10.5px] font-semibold', position.guardTolerancePct === value ? 'bg-positive/15 text-positive' : 'bg-fill-muted text-ink-faint')}>±{value}%</button>)}
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-ink-faint">Position preview</p>
              <Display as="h2" className="mt-1 text-xl">{position.tokenA.ticker} issuer spread</Display>
            </div>
            <Chip tone={position.pairIsSameStock ? 'positive' : 'amber'}>{position.pairIsSameStock ? 'Guard compatible' : 'Pair mismatch'}</Chip>
          </div>

          <div className="mt-5"><AquaPositionChart tokenA={position.tokenA} tokenB={position.tokenB} guardTolerancePct={position.guardTolerancePct} /></div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <AmountCard label="Token 1" token={position.tokenA} amount={position.amountA} onChange={position.setAmountA} />
            <AmountCard label="Token 2" token={position.tokenB} amount={position.amountB} onChange={position.setAmountB} />
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-stroke-hairline bg-fill-subtle p-3.5">
            <Info className="mt-0.5 size-3.5 shrink-0 text-cobalt-text" />
            <p className="text-[11px] leading-relaxed text-ink-quaternary">Your tokens remain in your wallet under Aqua. A signed strategy makes only the stated balances and price curve available to takers.</p>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-stroke-hairline pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10.5px] text-ink-faint">Total position</p>
              <Num className="mt-1 block text-lg font-medium">${totalUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Num>
            </div>
            <Button asChild size="lg" className={cn('sm:min-w-52', !position.pairIsSameStock && 'pointer-events-none opacity-50')}>
              <Link href={{ pathname: '/strategies/review', query: { mode: 'pegged', tokenA: position.tokenA.id, tokenB: position.tokenB.id, amountA: position.amountA, amountB: position.amountB, feeBps: position.feeBps, guard: position.guardTolerancePct } }}>Review position</Link>
            </Button>
          </div>
        </main>
      </div>

      <AquaTokenSelectDialog open={selectorOpen} onOpenChange={setSelectorOpen} tokenA={position.tokenA} tokenB={position.tokenB} onSelect={position.selectToken} />
    </div>
  );
}

function ConfigLabel({ as: Tag = 'p', children }: { as?: 'p' | 'legend'; children: React.ReactNode }) {
  return <Tag className="text-[10.5px] font-semibold tracking-[0.1em] text-ink-faint uppercase">{children}</Tag>;
}

function AmountCard({ label, token, amount, onChange }: { label: string; token: ReturnType<typeof pairedRepresentations>[number]; amount: string; onChange: (value: string) => void }) {
  return (
    <label className="rounded-xl border border-stroke-hairline bg-fill-subtle p-3.5">
      <span className="flex items-center justify-between gap-2 text-[10.5px] text-ink-faint"><span>{label}</span><Num>Balance {token.walletBalance}</Num></span>
      <span className="mt-3 flex items-center gap-3">
        <TokenMark stock={token} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold">{token.symbol}</span>
          <span className="block text-[9.5px] text-ink-faint">{token.issuer === 'dinari' ? 'Dinari' : 'xStock'}</span>
        </span>
        <span className="flex items-baseline gap-1"><span className="text-ink-faint">$</span><input inputMode="decimal" value={amount} onChange={(event) => onChange(event.target.value)} aria-label={`${token.symbol} allocation in dollars`} className="w-20 bg-transparent text-right font-mono text-lg font-medium outline-none" /></span>
      </span>
    </label>
  );
}
