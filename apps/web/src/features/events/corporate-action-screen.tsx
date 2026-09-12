'use client';

import { formatNumber, formatUsd, rescaleShareEquivalents } from '@tradetoken/domain';
import { aaplDividend, nvdaSplit } from '@tradetoken/domain/fixtures';
import { ArrowRight, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { Chip, Display, Num, Panel, SandboxNote, SectionLabel } from '@/components/primitives';
import { ScreenField } from '@/components/screen-field';
import { useSplitRescaled } from '@/features/strategy/split-review-store';

/**
 * What happened, not what to do about it.
 *
 * A 10-for-1 split does not change what the position is worth and does not
 * change the token count — the multiplier moves. The consequence for an open
 * band (halt, rescale) is the strategy owner's call, so it lives on the
 * strategy detail and this feed only links there.
 */
export function CorporateActionScreen() {
  const rescaled = useSplitRescaled();
  const multiplier = nvdaSplit.multiplierAfter / nvdaSplit.multiplierBefore;
  const sharesAfter = rescaleShareEquivalents(nvdaSplit.shareEquivalentsBefore, multiplier);

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
          <ChangeRow
            label="Your exposure"
            before={`${formatNumber(nvdaSplit.shareEquivalentsBefore, 1)} sh`}
            after={`${formatNumber(sharesAfter, 0)} sh`}
          />
        </dl>

        <Link
          href={`/strategies/${nvdaSplit.ticker.toLowerCase()}`}
          className="mt-6 flex items-center gap-3 rounded-lg border border-stroke-hairline bg-fill-subtle p-4 transition-colors hover:bg-fill-press">
          <span className="min-w-0 flex-1">
            <SectionLabel as="h3">
              {nvdaSplit.affectedStrategies} open strategy affected
            </SectionLabel>
            <Num className="mt-1.5 block text-[12.5px] text-ink-secondary">
              {rescaled ? 'Band rescaled · trading resumed' : 'Halted by its multiplier guard · review in Strategies'}
            </Num>
          </span>
          <Chip tone={rescaled ? 'cobalt' : 'amber'}>{rescaled ? 'Rescaled' : 'Needs review'}</Chip>
          <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden />
        </Link>
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
        Both events are fixtures. No corporate-action feed is connected.
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
