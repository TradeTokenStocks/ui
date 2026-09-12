'use client';

import { corporateActionRescale, formatNumber, formatUsd, type StrategySummary } from '@tradetoken/domain';
import { nvdaSplit } from '@tradetoken/domain/fixtures';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { Chip, Num, Panel, SectionLabel } from '@/components/primitives';
import { Button } from '@/components/ui/button';

import { markSplitRescaled, useSplitRescaled } from '../split-review-store';

const range = (min: number, max: number) => `${min.toFixed(2)}x — ${max.toFixed(2)}x`;
const band = (lower: number, upper: number) =>
  `${formatUsd(lower, { digits: 2 })} — ${formatUsd(upper, { digits: 2 })}`;

/**
 * The strategy-side consequence of the NVDA split: the guard halted the band,
 * and rescaling is the owner's decision, so it lives with the strategy rather
 * than in the events feed.
 */
export function SplitReviewPanel({ strategy }: { strategy: StrategySummary }) {
  const rescaled = useSplitRescaled();
  const plan = corporateActionRescale({
    band: { lowerUsd: strategy.lowerUsd, upperUsd: strategy.upperUsd },
    multiplierBefore: nvdaSplit.multiplierBefore,
    multiplierAfter: nvdaSplit.multiplierAfter,
    guardTolerancePct: 5,
  });

  return (
    <Panel className={rescaled ? 'border-cobalt/25 p-5' : 'border-amber/25 bg-amber/[0.04] p-5'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionLabel>{rescaled ? 'Band rescaled' : `Corporate action · ${nvdaSplit.title} split`}</SectionLabel>
        <Chip tone={rescaled ? 'cobalt' : 'amber'}>
          {rescaled ? `Guard active · ${formatNumber(nvdaSplit.multiplierAfter, 2)}x` : 'Halted onchain by Swap-VM'}
        </Chip>
      </div>

      <p className="mt-3 max-w-prose text-[12.5px] leading-relaxed text-ink-secondary">
        {rescaled
          ? `Band and multiplier guard now match the post-split multiplier. Safe trading resumed.`
          : `NVDA's multiplier moved from ${formatNumber(nvdaSplit.multiplierBefore, 2)}x to ${formatNumber(nvdaSplit.multiplierAfter, 2)}x, outside this band's guard, so Swap-VM opcode 24 halted new fills. Rescale to keep trading.`}
      </p>

      <dl className="mt-4 space-y-2.5">
        <ChangeRow
          label="Price band"
          before={band(plan.bandBefore.lowerUsd, plan.bandBefore.upperUsd)}
          after={band(plan.bandAfter.lowerUsd, plan.bandAfter.upperUsd)}
          applied={rescaled}
        />
        <ChangeRow
          label="Multiplier guard"
          before={range(plan.guardBefore.min, plan.guardBefore.max)}
          after={range(plan.guardAfter.min, plan.guardAfter.max)}
          applied={rescaled}
        />
      </dl>

      <div className="mt-5 flex flex-wrap gap-2.5">
        {rescaled ? null : <Button onClick={markSplitRescaled}>Rescale band</Button>}
        <Button asChild variant="ghost">
          <Link href="/events/nvda-split">View the split</Link>
        </Button>
      </div>
    </Panel>
  );
}

function ChangeRow({ label, before, after, applied }: { label: string; before: string; after: string; applied: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <dt className="w-32 shrink-0 text-[12.5px] text-ink-tertiary">{label}</dt>
      <dd className="flex min-w-0 items-center gap-2.5">
        <Num className="text-[12.5px] text-ink-quaternary line-through">{before}</Num>
        <ArrowRight className="size-3.5 shrink-0 text-ink-faint" aria-hidden />
        <Num className={applied ? 'text-[12.5px] font-medium text-cobalt-text' : 'text-[12.5px] font-medium'}>{after}</Num>
      </dd>
    </div>
  );
}
