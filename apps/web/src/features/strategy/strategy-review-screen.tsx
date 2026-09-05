'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check } from 'lucide-react';
import {
  b20Symbol,
  bandMarket,
  formatNumber,
  formatUsd,
  projectBand,
  resolveCompany,
} from '@tradetoken/domain';
import { activeStrategy, companyDetails, wallet } from '@tradetoken/domain/fixtures';

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

function numericParam(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function StrategyReviewScreen() {
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

  return (
    <div className="mx-auto max-w-[560px] space-y-7">
      <header>
        <Link
          href={{ pathname: '/strategies/new', query: { ticker: company.ticker } }}
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
          </dl>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Not now</Button>
            </DialogClose>
            <Button
              disabled={opening}
              onClick={() => {
                setOpening(true);
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
