'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  snaptradeInstitutions,
  snaptradeScenarios,
  type SnapTradeScenarioId,
} from '@tradetoken/domain/fixtures';

import { Chip, Display, Num, Panel, SandboxNote, SectionLabel } from '@/components/primitives';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * The hosted-portal handoff, represented honestly.
 *
 * In production this is SnapTrade's own hosted page on their domain — the whole
 * point is that institution credentials are exchanged there and never touch
 * this app. Here it is a labelled stand-in that exercises the same scenarios
 * their sandbox exposes, including the failure path.
 */
export function SnapTradePortalScreen({ mode }: { mode?: string }) {
  const router = useRouter();
  const [scenario, setScenario] = useState<SnapTradeScenarioId>('self-directed');
  const [institution, setInstitution] = useState<string>('alpaca');
  const [failed, setFailed] = useState(false);

  const selected = snaptradeScenarios.find((item) => item.id === scenario);
  if (!selected) throw new Error(`Unknown SnapTrade scenario: ${scenario}`);

  const connect = () => {
    if (scenario === 'invalid') {
      setFailed(true);
      return;
    }
    router.push('/connections');
  };

  return (
    <div className="mx-auto max-w-[560px] space-y-7">
      <header className="flex items-center gap-3">
        <span className="grid size-8 place-items-center rounded-lg bg-[#00C08B] text-[12px] font-bold text-[#08131c]">
          S
        </span>
        <Display as="h1" className="text-lg">
          SnapTrade
        </Display>
        <Chip tone="amber" className="ml-auto">
          Hosted portal · simulated
        </Chip>
      </header>

      <div>
        <Display className="text-2xl">
          {mode === 'reconnect' ? 'Reconnect a brokerage' : 'Connect a brokerage'}
        </Display>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-secondary">
          Choose a test institution and account shape. Access is read-only: holdings and
          transactions, never trading.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-amber/20 bg-amber/[0.07] p-4">
        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber" />
        <div>
          <p className="text-[13px] font-semibold text-amber-bright">Sandbox simulation</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-secondary">
            For testing only. No institution login is performed and no credentials are collected.
          </p>
        </div>
      </div>

      {failed ? (
        <div
          role="alert"
          className="rounded-lg border border-amber/25 bg-amber/[0.07] p-4">
          <p className="text-[13px] font-semibold text-amber-bright">
            Connection failed as expected
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-secondary">
            This fixture exercises expired credentials so the repair flow can be demonstrated.
            Pick another scenario to continue.
          </p>
        </div>
      ) : null}

      <fieldset>
        <SectionLabel as="legend">Test scenario</SectionLabel>
        <div className="mt-3 space-y-2">
          {snaptradeScenarios.map((item) => (
            <RadioCard
              key={item.id}
              name="scenario"
              checked={scenario === item.id}
              onSelect={() => {
                setScenario(item.id);
                setFailed(false);
              }}
              title={item.title}
              meta={item.meta}
            />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <SectionLabel as="legend">Institution</SectionLabel>
        <div className="mt-3 space-y-2">
          {snaptradeInstitutions.map((item) => (
            <RadioCard
              key={item.id}
              name="institution"
              checked={institution === item.id}
              onSelect={() => setInstitution(item.id)}
              title={item.title}
              meta="Read-only positions and activity"
            />
          ))}
        </div>
      </fieldset>

      <Panel className="p-4">
        <Num className="text-[11.5px] text-ink-tertiary">Selected · {selected.meta}</Num>
      </Panel>

      <div className="flex flex-wrap gap-2.5">
        <Button size="lg" onClick={connect}>
          {scenario === 'invalid' ? 'Attempt connection' : 'Connect read-only'}
        </Button>
        <Button size="lg" variant="ghost" onClick={() => router.push('/connections')}>
          Cancel
        </Button>
      </div>

      <SandboxNote>
        In production this page is served by SnapTrade on their own domain and returns to the app
        with a connection id. The brokerage secret and the SnapTrade consumer key stay on a
        server and are never exposed to the browser.
      </SandboxNote>
    </div>
  );
}

/**
 * A native radio in a card. Keeping the real input means keyboard arrow-key
 * behaviour, grouping and screen-reader semantics come from the platform.
 */
function RadioCard({
  name,
  checked,
  onSelect,
  title,
  meta,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  title: string;
  meta: string;
}) {
  return (
    <Label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors',
        checked
          ? 'border-cobalt/40 bg-cobalt/[0.07]'
          : 'border-stroke-hairline bg-fill-subtle hover:bg-fill-press',
      )}>
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="mt-0.5 size-4 shrink-0 accent-cobalt"
      />
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold">{title}</span>
        <span className="mt-0.5 block text-[11.5px] font-normal text-ink-tertiary">{meta}</span>
      </span>
    </Label>
  );
}
