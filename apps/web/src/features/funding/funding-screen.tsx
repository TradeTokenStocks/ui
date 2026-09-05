'use client';

import { useState } from 'react';
import { formatUsd } from '@tradetoken/domain';
import { fundingMethods, fundingPresetsUsd, wallet, type FundingMethodId } from '@tradetoken/domain/fixtures';

import { Display, Num, Panel, SandboxNote, SectionLabel } from '@/components/primitives';
import { ScreenField } from '@/components/screen-field';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function FundingScreen() {
  const [amount, setAmount] = useState<number>(5000);
  const [method, setMethod] = useState<FundingMethodId>('card');
  const [handedOff, setHandedOff] = useState(false);
  const [copied, setCopied] = useState(false);

  const selected = fundingMethods.find((item) => item.id === method);
  if (!selected) throw new Error(`Unknown funding method: ${method}`);

  const proceed = async () => {
    if (method === 'wallet') {
      try {
        await navigator.clipboard.writeText(wallet.address);
        setCopied(true);
      } catch {
        setCopied(false);
      }
    }
    setHandedOff(true);
  };

  return (
    <div className="mx-auto max-w-[560px] space-y-8">
      <ScreenField ramp="funding" intensity={0.6} />

      <header>
        <Display as="h1" className="text-3xl">
          Add funds
        </Display>
        <p className="mt-1.5 text-[12.5px] text-ink-tertiary">
          USDC on {wallet.chain}, into the wallet you already control.
        </p>
      </header>

      <section className="text-center">
        <p className="text-[12.5px] text-ink-tertiary">Amount</p>
        <Display className="mt-2 text-5xl">{formatUsd(amount)}</Display>
        <div className="mt-4 flex items-center justify-center gap-2.5">
          <span className="grid size-6 place-items-center rounded-full bg-cobalt text-[10px] font-bold text-white">
            B
          </span>
          <span className="text-[13px] font-semibold">USDC on {wallet.chain}</span>
          <Num className="text-[11.5px] text-ink-faint">Balance {formatUsd(0)}</Num>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {fundingPresetsUsd.map((preset) => (
          <Button
            key={preset}
            variant={amount === preset ? 'default' : 'outline'}
            onClick={() => {
              setAmount(preset);
              setHandedOff(false);
            }}>
            {formatUsd(preset)}
          </Button>
        ))}
      </div>

      <fieldset>
        <SectionLabel as="legend">How</SectionLabel>
        <div className="mt-3 space-y-2">
          {fundingMethods.map((item) => (
            <Label
              key={item.id}
              className={cn(
                'flex cursor-pointer items-center gap-3.5 rounded-lg border p-3.5 transition-colors',
                method === item.id
                  ? 'border-cobalt/40 bg-cobalt/[0.07]'
                  : 'border-stroke-hairline bg-fill-subtle hover:bg-fill-press',
              )}>
              <input
                type="radio"
                name="funding-method"
                checked={method === item.id}
                onChange={() => {
                  setMethod(item.id);
                  setHandedOff(false);
                }}
                className="size-4 shrink-0 accent-cobalt"
              />
              <span
                aria-hidden
                className="grid size-8 shrink-0 place-items-center rounded-lg bg-fill-muted text-[15px] text-cobalt-text">
                {item.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-semibold">{item.title}</span>
                <span className="mt-0.5 block text-[11.5px] font-normal text-ink-tertiary">
                  {item.meta}
                </span>
              </span>
            </Label>
          ))}
        </div>
      </fieldset>

      <Panel className="p-4">
        <SectionLabel>Secure provider handoff</SectionLabel>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-secondary">
          In production Privy opens the selected funding provider directly. Card details and bank
          credentials go to that provider, never to this application, and no payment instrument is
          ever stored here.
        </p>
      </Panel>

      {handedOff ? (
        <div
          role="status"
          className="rounded-lg border border-positive/20 bg-positive/[0.07] p-4">
          <p className="text-[13px] font-semibold text-positive">Sandbox handoff ready</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-secondary">
            {method === 'wallet'
              ? `${copied ? `${wallet.chain} address copied. ` : `Send USDC to ${wallet.short} on ${wallet.chain}. `}No transfer was created.`
              : `A live provider would now open for ${formatUsd(amount)}. No payment was created and no card was charged.`}
          </p>
        </div>
      ) : null}

      <div>
        <Button size="lg" className="w-full" onClick={proceed}>
          Continue with {formatUsd(amount)} · {selected.title}
        </Button>
        <SandboxNote className="mt-2.5 text-center">Sandbox — no real payment.</SandboxNote>
      </div>
    </div>
  );
}
