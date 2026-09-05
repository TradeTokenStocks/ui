'use client';

import { useState } from 'react';
import { delegationLimits, delegationPermissions } from '@tradetoken/domain/fixtures';

import { Display, Num, Panel, SandboxNote, SectionLabel } from '@/components/primitives';
import { ScreenField } from '@/components/screen-field';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

/**
 * Scoped delegation. The argument this screen has to win is that a session key
 * is narrower than an account, so the limits are given as much space as the
 * permissions and "transfers out: never permitted" is stated rather than
 * implied by omission.
 */
export function AutomationScreen() {
  const [granted, setGranted] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(delegationPermissions.map((item) => [item.id, item.defaultOn])),
  );

  return (
    <div className="mx-auto max-w-[620px] space-y-8">
      <ScreenField ramp="delegation" intensity={0.75} />

      <header>
        <p className="text-[12.5px] font-medium text-ink-tertiary">Automatic repairs</p>
        <Display as="h1" className="mt-3 text-4xl leading-[1.1]">
          A split at 4am shouldn&apos;t cost you a position.
        </Display>
        <p className="mt-4 max-w-prose text-[13.5px] leading-relaxed text-ink-secondary">
          Grant a narrow, expiring session so predictable maintenance can happen without waking
          you up.
        </p>
      </header>

      <Panel className="p-5">
        <SectionLabel>This session can</SectionLabel>
        <ul className="mt-2 divide-y divide-stroke-hairline">
          {delegationPermissions.map((item) => (
            <li key={item.id} className="flex items-center gap-4 py-4">
              <span className="min-w-0 flex-1">
                <Label htmlFor={item.id} className="text-[13.5px] font-semibold">
                  {item.title}
                </Label>
                <span className="mt-1 block text-[11.5px] text-ink-tertiary">{item.meta}</span>
              </span>
              <Switch
                id={item.id}
                checked={permissions[item.id] ?? false}
                onCheckedChange={(checked) =>
                  setPermissions((current) => ({ ...current, [item.id]: checked }))
                }
              />
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2.5 rounded-lg border border-stroke-hairline bg-fill-subtle p-4">
          {delegationLimits.map((limit) => (
            <div key={limit.label} className="flex items-center justify-between gap-4">
              <dt className="text-[11.5px] text-ink-tertiary">{limit.label}</dt>
              <Num className="text-[11.5px] text-ink-secondary">{limit.value}</Num>
            </div>
          ))}
        </dl>
      </Panel>

      {granted ? (
        <div
          role="status"
          className="flex items-center gap-3 rounded-lg border border-positive/20 bg-positive/[0.07] p-4">
          <span className="size-2 shrink-0 rounded-full bg-positive" />
          <div>
            <p className="text-[13.5px] font-semibold text-positive">
              Sandbox policy granted for 30 days
            </p>
            <p className="mt-0.5 text-[11.5px] text-ink-secondary">
              Preview only. No wallet signature was requested.
            </p>
          </div>
        </div>
      ) : null}

      {explaining ? (
        <Panel className="p-4">
          <p className="text-[12.5px] leading-relaxed text-ink-secondary">
            A real session is signed by your embedded wallet and constrained by server-enforced
            policy. It cannot transfer funds to another address, it cannot silently widen its own
            permissions, and it expires on its own. Revoking it is a local action that takes
            effect immediately.
          </p>
        </Panel>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={() => setGranted((value) => !value)}>
          {granted ? 'Revoke sandbox grant' : 'Grant for 30 days'}
        </Button>
        <Button variant="ghost" onClick={() => setExplaining((value) => !value)}>
          {explaining ? 'Hide details' : 'How this works'}
        </Button>
      </div>

      <SandboxNote>
        Prototype only. The live version requires an authenticated Privy wallet signature and
        backend policy enforcement; nothing on this page signs or submits anything.
      </SandboxNote>
    </div>
  );
}
