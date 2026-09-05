'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy } from 'lucide-react';
import { formatUsd } from '@tradetoken/domain';
import { approvalThresholdUsd, wallet } from '@tradetoken/domain/fixtures';

import { Chip, Display, Num, Panel, SandboxNote, SectionLabel } from '@/components/primitives';
import { ScreenField } from '@/components/screen-field';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function WalletScreen() {
  const [copied, setCopied] = useState(false);
  const [passkey, setPasskey] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice('Your browser blocked clipboard access. The address is shown in full below.');
    }
  };

  return (
    <div className="space-y-8">
      <ScreenField ramp="wallet" intensity={0.7} />

      <header>
        <Display as="h1" className="text-3xl">
          Wallet &amp; security
        </Display>
        <p className="mt-1.5 text-[12.5px] text-ink-tertiary">
          Self-custodial by construction. Nobody here can move your funds.
        </p>
      </header>

      <div className="specular relative overflow-hidden rounded-xl bg-gradient-to-br from-cobalt to-cobalt-deep p-6 shadow-[0_16px_50px_-16px_rgba(52,72,220,0.65)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Display className="text-2xl text-white">{wallet.short}</Display>
            <p className="mt-1 text-[12px] text-white/70">{wallet.chain} · embedded wallet</p>
          </div>
          <span className="rounded-pill border border-white/25 bg-white/10 px-2.5 py-1 text-[10.5px] font-semibold text-white">
            Self-custody
          </span>
        </div>

        <Num className="mt-5 block break-all text-[11px] text-white/60">{wallet.address}</Num>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <Button variant="secondary" onClick={copyAddress}>
            {copied ? (
              <>
                <Check className="size-3.5" aria-hidden /> Copied
              </>
            ) : (
              <>
                <Copy className="size-3.5" aria-hidden /> Copy address
              </>
            )}
          </Button>
          <Button asChild variant="secondary">
            <Link href="/funding">Add funds</Link>
          </Button>
        </div>
      </div>

      <section>
        <SectionLabel>Recovery</SectionLabel>
        <Panel className="mt-3">
          <ul className="divide-y divide-stroke-hairline">
            <SettingRow
              title="Recovery password"
              meta="Set 4 Sep · re-enter on a new device"
              trailing={<Chip tone="positive">On</Chip>}
            />
            <SettingRow
              title="Cloud backup share"
              meta="Recommended second method"
              trailing={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setNotice(
                      'Backup enrolment requires an authenticated Privy session. Sign in to exercise the real path.',
                    )
                  }>
                  Add
                </Button>
              }
            />
            <SettingRow
              title="Export private key"
              meta="Always available — this wallet is yours to take"
              trailing={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setNotice(
                      'Export is handled entirely by Privy in an isolated iframe. This app never sees the key, and there is no key to export in sandbox mode.',
                    )
                  }>
                  Export
                </Button>
              }
            />
          </ul>
        </Panel>
        {notice ? (
          <div
            role="status"
            className="mt-3 flex items-start gap-3 rounded-lg border border-stroke-hairline bg-fill-subtle p-4">
            <p className="flex-1 text-[12.5px] leading-relaxed text-ink-secondary">{notice}</p>
            <Button variant="ghost" size="sm" onClick={() => setNotice(null)}>
              Dismiss
            </Button>
          </div>
        ) : null}
      </section>

      <section>
        <SectionLabel>Approvals</SectionLabel>
        <Panel className="mt-3 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Label htmlFor="passkey" className="text-[15px] font-semibold">
                Passkey check above {formatUsd(approvalThresholdUsd)}
              </Label>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-secondary">
                Re-authenticate before a strategy above this threshold opens or closes. Individual
                fills never interrupt you — that is the point of a scoped session.
              </p>
            </div>
            <Switch
              id="passkey"
              checked={passkey}
              onCheckedChange={setPasskey}
              aria-label="Passkey approval threshold"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-stroke-hairline pt-4">
            <Chip tone={passkey ? 'cobalt' : 'neutral'}>
              Opens above {formatUsd(approvalThresholdUsd)}
            </Chip>
            <Chip tone={passkey ? 'cobalt' : 'neutral'}>Closes above {formatUsd(approvalThresholdUsd)}</Chip>
            <Chip>Fills never prompt</Chip>
          </div>
        </Panel>
      </section>

      <div className="flex flex-wrap gap-2.5">
        <Button asChild variant="outline">
          <Link href="/automation">Scoped automation</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/sign-in">Sign in with Privy</Link>
        </Button>
      </div>

      <SandboxNote>
        The address above is a fixture. In production it is a Privy embedded wallet created on
        first login, with the key material held in the user&apos;s own custody and exportable at
        any time.
      </SandboxNote>
    </div>
  );
}

function SettingRow({
  title,
  meta,
  trailing,
}: {
  title: string;
  meta: string;
  trailing: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-4 px-5 py-4">
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold">{title}</span>
        <span className="mt-0.5 block text-[11.5px] text-ink-tertiary">{meta}</span>
      </span>
      <span className="shrink-0">{trailing}</span>
    </li>
  );
}
