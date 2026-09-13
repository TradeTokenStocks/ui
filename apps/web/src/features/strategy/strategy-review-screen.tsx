'use client';

import {
  b20Symbol,
  bandMarket,
  calculateMultiplierBounds,
  formatNumber,
  formatUsd,
  hackathonDeployment,
  projectBand,
  resolveCompany,
} from '@tradetoken/domain';
import { activeStrategy, companyDetails, stockRepresentation, wallet } from '@tradetoken/domain/fixtures';
import { Check, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { Chip, Display, Num, Panel, SandboxNote } from '@/components/primitives';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

import { TokenMark } from './components/aqua-token-select-dialog';
import { addCreatedStrategy } from './created-strategies-store';
import { useOpenLivePosition } from './hooks/use-open-live-position';

function numericParam(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function StrategyReviewScreen() {
  const params = useSearchParams();

  return params.get('mode') === 'pegged' ? <PeggedStrategyReview /> : <ConcentratedStrategyReview />;
}

function ConcentratedStrategyReview() {
  const params = useSearchParams();
  const router = useRouter();

  const ticker = (params.get('ticker') ?? 'NVDA').toUpperCase();
  const company = resolveCompany(companyDetails, ticker, 'NVDA');
  const allocation = numericParam(params.get('allocation'), 12000);
  const band = numericParam(params.get('band'), 10);

  // Recomputed from the query rather than passed through, so a deep link into
  // review is still correct.
  const projection = projectBand({
    priceUsd: company.priceUsd,
    allocationUsd: allocation,
    bandPct: band,
  });

  const [opening, setOpening] = useState(false);

  const multiplierBounds = calculateMultiplierBounds(company.multiplier ?? 1.0, 5);

  return (
    <div className="mx-auto max-w-[560px] space-y-7">
      <header>
        <Link
          href={{ pathname: '/strategies/new/configure', query: { mechanism: 'concentrated', ticker: company.ticker } }}
          className="text-[12.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-primary">
          ← Adjust
        </Link>
        <Display as="h1" className="mt-4 text-2xl">
          Review strategy
        </Display>
        <Display className="mt-4 text-4xl">{formatUsd(allocation)}</Display>
        <Num className="mt-2 block text-[12.5px] text-ink-tertiary">
          {bandMarket(company.ticker)} · band{' '}
          {formatUsd(projection.lowerUsd, { digits: 2 })} —{' '}
          {formatUsd(projection.upperUsd, { digits: 2 })}
        </Num>
      </header>

      <Panel className="p-5">
        <div className="flex items-center gap-3 border-b border-stroke-hairline pb-4">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cobalt to-violet text-[11px] font-semibold text-white">
            B
          </span>
          <Num className="flex-1 text-[12px] text-ink-secondary">
            {wallet.chain} · {wallet.short}
          </Num>
          <Chip tone="positive">Self-custody</Chip>
        </div>

        <Display className="mt-5 text-xl">Two approvals to open</Display>

        <ol className="mt-4 divide-y divide-stroke-hairline">
          <Approval
            index={1}
            signed
            title={`Allow Aqua to use ${formatNumber(projection.usdcSideUsd)} USDC`}
            detail="Spend cap, revocable any time"
          />
          <Approval
            index={2}
            title="Open the band"
            detail={`${formatNumber(projection.tokens, 1)} ${b20Symbol(company.ticker)} + ${formatNumber(projection.usdcSideUsd)} USDC`}
          />
        </ol>

        <dl className="mt-5 space-y-2.5 border-t border-stroke-hairline pt-4">
          <Fact label="Aqua fee tier" value={`${activeStrategy.feeTierPct.toFixed(2)}%`} />
          <Fact label="Network fee" value={formatUsd(activeStrategy.networkFeeUsd, { digits: 2 })} />
          <Fact label="You can exit" value="Any time" />
          <Fact label='Multiplier guard' value={`${multiplierBounds.min.toFixed(2)}x - ${multiplierBounds.max.toFixed(2)}x`}/>
        </dl>
      </Panel>

      {/*
        Mobile holds a button down to sign. On a desktop that is neither
        discoverable nor keyboard-operable, so the second approval is an
        explicit confirmation instead. Radix owns the focus trap and restore.
      */}
      <Dialog>
        <DialogTrigger asChild>
          <Button size="lg" className="w-full">
            Sign and open strategy
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Open this band?</DialogTitle>
            <DialogDescription>
              In production this requests a signature from your embedded wallet and submits the
              approval and the open as two transactions. In the sandbox it advances the demo and
              nothing is signed, sent or spent.
            </DialogDescription>
          </DialogHeader>
          <dl className="space-y-2.5 rounded-lg border border-stroke-hairline bg-fill-subtle p-4">
            <Fact label="Allocation" value={formatUsd(allocation)} />
            <Fact
              label="Band"
              value={`${formatUsd(projection.lowerUsd, { digits: 2 })} — ${formatUsd(projection.upperUsd, { digits: 2 })}`}
            />
            <Fact label="Opens as" value={`${formatNumber(projection.tokens, 1)} tokens + USDC`} />
            <Fact label='Circuit breaker' value='Auto-halt on split/dividend (±5%)'/>
          </dl>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Not now</Button>
            </DialogClose>
            <Button
              disabled={opening}
              onClick={() => {
                setOpening(true);
                addCreatedStrategy({
                  ticker: company.ticker,
                  mechanism: 'concentrated',
                  pairLabel: bandMarket(company.ticker),
                  depositedUsd: allocation,
                  feeTierPct: activeStrategy.feeTierPct,
                  guardPct: 5,
                  lowerValue: projection.lowerUsd,
                  upperValue: projection.upperUsd,
                });
                router.push('/strategies');
              }}>
              {opening ? 'Opening…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SandboxNote className="text-center">
        Sandbox — no real funds move and no wallet signature is requested.
      </SandboxNote>
    </div>
  );
}

function PeggedStrategyReview() {
  const params = useSearchParams();
  const router = useRouter();
  const tokenA = stockRepresentation(params.get('tokenA') ?? 'xstock-nvda') ?? stockRepresentation('xstock-nvda')!;
  const tokenB = stockRepresentation(params.get('tokenB') ?? 'ondo-nvda') ?? stockRepresentation('ondo-nvda')!;
  const amountA = numericParam(params.get('amountA'), 20);
  const amountB = numericParam(params.get('amountB'), 20);
  const feeBps = numericParam(params.get('feeBps'), 30);
  const guard = numericParam(params.get('guard'), 5);
  const curve = params.get('curve') === 'straight' ? 'straight' : 'curved';
  const [opening, setOpening] = useState(false);
  const live = useOpenLivePosition();
  const liveMode = live.deploymentReady;
  const walletLabel = liveMode
    ? live.walletAddress
      ? `${live.walletAddress.slice(0, 6)}…${live.walletAddress.slice(-4)}`
      : 'Wallet required'
    : wallet.short;
  const ratio = tokenA.multiplier / tokenB.multiplier;
  const total = amountA + amountB;

  const deploy = async () => {
    if (!liveMode) {
      setOpening(true);
      addCreatedStrategy({
        ticker: tokenA.ticker,
        mechanism: 'pegged',
        pairLabel: `${tokenA.symbol} / ${tokenB.symbol}`,
        depositedUsd: total,
        feeTierPct: feeBps / 100,
        guardPct: guard,
        lowerValue: ratio * (1 - guard / 100),
        upperValue: ratio * (1 + guard / 100),
      });
      router.push('/strategies');
      return;
    }

    try {
      const record = await live.openPosition({
        ticker: tokenA.ticker,
        tokenAId: tokenA.id,
        tokenBId: tokenB.id,
        amountAUsd: String(amountA),
        amountBUsd: String(amountB),
        priceUsd: tokenA.priceUsd,
        feeBps,
        guardToleranceBps: guard * 100,
        curve,
      });
      router.push(`/strategies/live?id=${encodeURIComponent(record.id)}`);
    } catch {
      // The hook surfaces the error inside the dialog.
    }
  };

  return (
    <div className="mx-auto max-w-[620px] space-y-7">
      <header>
        <Link
          href={{
            pathname: '/strategies/new/configure',
            query: { tokenA: tokenA.id, tokenB: tokenB.id },
          }}
          className="text-[12.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-primary">
          ← Adjust position
        </Link>
        <Display as="h1" className="mt-4 text-2xl">Review position</Display>
        <Display className="mt-4 text-4xl">{formatUsd(total)}</Display>
        <Num className="mt-2 block text-[12.5px] text-ink-tertiary">{tokenA.symbol} / {tokenB.symbol} · same-stock pegged</Num>
      </header>

      <Panel className="p-5">
        <div className="flex items-center gap-3 border-b border-stroke-hairline pb-4">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cobalt to-violet text-[11px] font-semibold text-white">B</span>
          <Num className="flex-1 text-[12px] text-ink-secondary">{liveMode ? hackathonDeployment.chainName : wallet.chain} · {walletLabel}</Num>
          <Chip tone="positive">In wallet</Chip>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ReviewToken stock={tokenA} amount={amountA} />
          <ReviewToken stock={tokenB} amount={amountB} />
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-positive/20 bg-positive/[0.045] p-4">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-positive" />
          <div>
            <p className="text-[12.5px] font-semibold text-positive">Two-leg multiplier protection</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-quaternary">Execution halts if either token leaves ±{guard}% of its signed multiplier. Existing fills remain settled; unsafe new fills fail.</p>
          </div>
        </div>

        <dl className="mt-5 space-y-2.5 border-t border-stroke-hairline pt-4">
          <Fact label="Reference ratio" value={ratio.toFixed(4)} />
          <Fact label="Signed range" value={`${(ratio * (1 - guard / 100)).toFixed(4)} — ${(ratio * (1 + guard / 100)).toFixed(4)}`} />
          <Fact label="Aqua fee" value={`${(feeBps / 100).toFixed(2)}%`} />
          <Fact label="Custody" value="Tokens stay in wallet" />
        </dl>
      </Panel>

      <Dialog>
        <DialogTrigger asChild><Button size="lg" className="w-full">Sign and deploy position</Button></DialogTrigger>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Deploy this Aqua strategy?</DialogTitle>
            <DialogDescription>
              {liveMode
                ? 'Your embedded wallet approves each leg for Aqua if needed, then ships the guarded strategy. Tokens stay in your wallet.'
                : 'The final integration will request token approvals, sign the guarded strategy, and ship it to Aqua. This sandbox confirmation does not sign or submit anything.'}
            </DialogDescription>
          </DialogHeader>
          <dl className="space-y-2.5 rounded-lg border border-stroke-hairline bg-fill-subtle p-4">
            <Fact label="Pair" value={`${tokenA.symbol} / ${tokenB.symbol}`} />
            <Fact label="Available balance" value={formatUsd(total)} />
            <Fact label="Circuit breaker" value={`Both legs · ±${guard}%`} />
            <Fact label="Price curve" value={curve === 'straight' ? 'Straight' : 'Curved'} />
          </dl>
          {live.error ? <p className="text-[11.5px] text-amber-bright">{live.error}</p> : null}
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost" disabled={live.busy}>Not now</Button></DialogClose>
            <Button disabled={opening || live.busy} onClick={() => void deploy()}>
              {liveMode ? live.label : opening ? 'Deploying…' : 'Confirm sandbox'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SandboxNote className="text-center">
        {liveMode
          ? `Live on ${hackathonDeployment.chainName} — confirming signs real transactions from your embedded wallet.`
          : 'Sandbox — contract addresses are intentionally pending the teammate deployment manifest.'}
      </SandboxNote>
    </div>
  );
}

function ReviewToken({ stock, amount }: { stock: NonNullable<ReturnType<typeof stockRepresentation>>; amount: number }) {
  return (
    <div className="rounded-xl border border-stroke-hairline bg-fill-subtle p-4">
      <div className="flex items-center gap-3"><TokenMark stock={stock} size="sm" /><span><span className="block text-[12px] font-semibold">{stock.symbol}</span><span className="text-[10.5px] text-ink-faint">{stock.issuer === 'ondo' ? 'Ondo' : 'xStock'}</span></span></div>
      <Num className="mt-4 block text-xl font-medium">{formatUsd(amount)}</Num>
      <Num className="mt-1 block text-[10.5px] text-ink-faint">multiplier {stock.multiplier.toFixed(4)}x</Num>
    </div>
  );
}

function Approval({
  index,
  title,
  detail,
  signed = false,
}: {
  index: number;
  title: string;
  detail: string;
  signed?: boolean;
}) {
  return (
    <li className="flex items-center gap-3 py-3.5">
      <span
        className={cn(
          'grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold',
          signed ? 'bg-cobalt text-white' : 'border border-stroke-raised text-ink-secondary',
        )}>
        {signed ? <Check className="size-3.5" aria-hidden /> : index}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold">{title}</span>
        <Num className="mt-0.5 block text-[11.5px] text-ink-quaternary">{detail}</Num>
      </span>
      {signed ? (
        <span className="shrink-0 text-[11.5px] font-semibold text-positive">Signed</span>
      ) : null}
    </li>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[12.5px] text-ink-tertiary">{label}</dt>
      <Num className="text-[12.5px] font-medium">{value}</Num>
    </div>
  );
}
