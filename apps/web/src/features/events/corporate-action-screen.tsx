'use client';

import { calculateMultiplierBounds, formatNumber, formatUsd, rescaleBand, rescaleShareEquivalents } from '@tradetoken/domain';
import { aaplDividend, activeStrategy, nvdaSplit } from '@tradetoken/domain/fixtures';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Chip, Display, Num, Panel, SandboxNote, SectionLabel } from '@/components/primitives';
import { ScreenField } from '@/components/screen-field';
import { Button } from '@/components/ui/button';

/**
 * The demo's centrepiece.
 *
 * A 10-for-1 split does not change what the position is worth and does not
 * change the token count — the multiplier moves. Everything derived from that
 * is computed with the shared `rescaleBand` / `rescaleShareEquivalents`, so the
 * arithmetic on this page is the same arithmetic the native app runs.
 */
export function CorporateActionScreen() {
  const [rescaled, setRescaled] = useState(false);

  const multiplier = nvdaSplit.multiplierAfter / nvdaSplit.multiplierBefore;
  const before = { lowerUsd: activeStrategy.lowerUsd, upperUsd: activeStrategy.upperUsd };
  const after = rescaleBand(before, multiplier);
  const sharesAfter = rescaleShareEquivalents(nvdaSplit.shareEquivalentsBefore, multiplier);
  const guardBefore = calculateMultiplierBounds(nvdaSplit.multiplierBefore, 5);
  const guardAfter = calculateMultiplierBounds(nvdaSplit.multiplierAfter, 5);

  const haltedExplanation = `Order halted on-chain by Swap-VM opcode 24. NVDA's multiplier jumped from ${formatNumber(nvdaSplit.multiplierBefore, 2)}x to ${formatNumber(nvdaSplit.multiplierAfter, 2)}x, exceeding your ${guardBefore.min.toFixed(2)}x — ${guardBefore.max.toFixed(2)}x guard. Rescaling updates your price band to ${formatUsd(after.lowerUsd, {digits: 2})} — ${formatUsd(after.upperUsd, {digits: 2})} and arms a new ${guardAfter.min.toFixed(2)}x — ${guardAfter.max.toFixed(2)}x guard.`;
  const rescaledExplanation = `Band rescaled to ${formatUsd(after.lowerUsd, {digits: 2})} — ${formatUsd(after.upperUsd, {digits: 2})}. Multiplier guard updated to ${guardAfter.min.toFixed(2)}x — ${guardAfter.max.toFixed(2)}x (±5%). Safe trading resumed.`;
  return (
    <div className="space-y-8">
      <ScreenField ramp="corporateAction" intensity={0.8} />

      <header className="flex flex-wrap items-center justify-between gap-3">
        <Display as="h1" className="text-3xl">
          Events
        </Display>
        <Chip tone="amber">{rescaled ? '1 needs review' : '2 need review'}</Chip>
      </header>

      <Panel className="p-6">
        <Chip tone="amber" className="border-0 bg-transparent px-0">
          Stock split · effective {nvdaSplit.effective}
        </Chip>
        <Display className="mt-1 text-3xl">{nvdaSplit.title}</Display>

        <p className="mt-5 max-w-prose text-[13px] leading-relaxed text-ink-secondary">
          Your token count doesn&apos;t change. The B20 multiplier does, so each token will
          represent ten times the shares it does today.
        </p>

        <dl className="mt-5 space-y-3">
          <ChangeRow
            label="Multiplier"
            before={formatNumber(nvdaSplit.multiplierBefore, 4)}
            after={formatNumber(nvdaSplit.multiplierAfter, 4)}
            accent
          />
          <ChangeRow label='Multiplier guard' before={`${guardBefore.min.toFixed(2)}x - ${guardBefore.max.toFixed(2)}x`} after={`${guardAfter.min.toFixed(2)}x - ${guardAfter.max.toFixed(2)}x`} accent={rescaled}/>
          <ChangeRow
            label="Your exposure"
            before={`${formatNumber(nvdaSplit.shareEquivalentsBefore, 1)} sh`}
            after={`${formatNumber(sharesAfter, 0)} sh`}
          />
        </dl>

        <div className="mt-6 rounded-lg border border-stroke-hairline bg-fill-subtle p-4">
          <div className="flex items-center justify-between gap-2">
          <SectionLabel>
            {rescaled ? 'Open strategy updated' : `${nvdaSplit.affectedStrategies} open strategy is affected`}
          </SectionLabel>
          <Chip tone={rescaled ? 'cobalt' : 'amber'}>{rescaled ? 'Guard active · 10.00x' : 'Halted onchain by Swap-VM'}</Chip>
          </div>
          <Num className="mt-2 block text-[12.5px] leading-relaxed text-ink-secondary">
            {rescaled
              ? rescaledExplanation
              : haltedExplanation}
          </Num>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <Button onClick={() => setRescaled(true)} disabled={rescaled}>
              {rescaled ? 'Band rescaled ✓' : 'Rescale band'}
            </Button>
            <Button asChild variant="ghost">
              <Link href="/strategies">{rescaled ? 'Back to strategy' : 'Not now'}</Link>
            </Button>
          </div>
        </div>
      </Panel>

      <Panel className="p-6">
        <SectionLabel>Cash dividend · paid {aaplDividend.paid}</SectionLabel>
        <Display className="mt-2 text-lg">
          Apple · {formatUsd(aaplDividend.perShareUsd, { digits: 2 })} per share
        </Display>
        <p className="mt-2 max-w-prose text-[12.5px] leading-relaxed text-ink-secondary">
          B20 pays dividends by raising the multiplier instead of sending cash — your{' '}
          {formatNumber(aaplDividend.tokens, 1)} aapl tokens now represent{' '}
          {formatNumber(aaplDividend.tokens * aaplDividend.multiplier, 2)} shares. Brokerage shares
          paid cash.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip tone="cobalt">Onchain · {formatNumber(aaplDividend.multiplier, 4)}</Chip>
          <Chip>
            Observed · {formatUsd(aaplDividend.brokerageCashUsd, { digits: 2, sign: true })}
          </Chip>
        </div>
      </Panel>

      <SandboxNote>
        Both events are fixtures. Rescaling here updates the demo only — no corporate-action feed
        is connected and no transaction is submitted.
      </SandboxNote>
    </div>
  );
}

function ChangeRow({
  label,
  before,
  after,
  accent = false,
}: {
  label: string;
  before: string;
  after: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <dt className="w-32 shrink-0 text-[12.5px] text-ink-tertiary">{label}</dt>
      <dd className="flex min-w-0 items-center gap-2.5">
        <Num className="text-[13px] text-ink-quaternary line-through">{before}</Num>
        <ArrowRight className="size-3.5 shrink-0 text-ink-faint" aria-hidden />
        <Num className={accent ? 'text-[13px] font-medium text-amber-bright' : 'text-[13px] font-medium'}>
          {after}
        </Num>
      </dd>
    </div>
  );
}
