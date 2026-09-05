'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  CalendarClock,
  Cable,
  LayoutGrid,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

import { Chip, PulseDot } from '@/components/primitives';
import { useSession } from '@/lib/session';
import { cn } from '@/lib/utils';

/**
 * The four places a person actually goes. Funding, automation and the SnapTrade
 * portal are reached from the screens that explain them rather than promoted
 * here — a rail with nine entries is a sitemap, not navigation.
 */
type Destination = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Amber dot: something here is waiting on the user. */
  badge?: boolean;
};

export const DESTINATIONS: Destination[] = [
  { href: '/', label: 'Portfolio', icon: LayoutGrid },
  { href: '/strategies', label: 'Strategies', icon: Activity },
  { href: '/events', label: 'Events', icon: CalendarClock, badge: true },
  { href: '/connections', label: 'Connections', icon: Cable },
];

const SECONDARY: Destination[] = [
  { href: '/wallet', label: 'Wallet & security', icon: Wallet },
  { href: '/automation', label: 'Automation', icon: ShieldCheck },
];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function NavRail({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { mode } = useSession();

  return (
    <nav aria-label="Primary" className="flex h-full flex-col gap-1 p-3">
      <Link
        href="/"
        onClick={onNavigate}
        className="mb-4 flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-fill-press">
        <span className="grid size-7 place-items-center rounded-md bg-gradient-to-br from-cobalt to-violet text-[11px] font-bold text-white">
          T
        </span>
        <span className="text-[13.5px] leading-tight font-semibold">
          TradeToken
          <span className="block text-[10.5px] font-medium text-ink-faint">Stocks</span>
        </span>
      </Link>

      {DESTINATIONS.map(({ href, label, icon: Icon, badge }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors',
              active
                ? 'bg-fill-active text-ink-primary'
                : 'text-ink-tertiary hover:bg-fill-press hover:text-ink-secondary',
            )}>
            <Icon className={cn('size-4 shrink-0', active && 'text-cobalt-text')} aria-hidden />
            <span className="truncate">{label}</span>
            {badge ? (
              <span
                className="ml-auto size-1.5 shrink-0 rounded-full bg-amber"
                aria-label="Needs review"
              />
            ) : null}
          </Link>
        );
      })}

      <div className="my-3 h-px bg-stroke-hairline" />

      {SECONDARY.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] transition-colors',
              active
                ? 'bg-fill-active text-ink-primary'
                : 'text-ink-quaternary hover:bg-fill-press hover:text-ink-secondary',
            )}>
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}

      {/* Account and sandbox state sit at the foot of the rail. */}
      <div className="mt-auto space-y-2 pt-4">
        <Chip tone="amber" className="w-full justify-center">
          <PulseDot />
          Sandbox — simulated data
        </Chip>
        <Link
          href={mode === 'authenticated' ? '/wallet' : '/sign-in'}
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-lg border border-stroke-hairline bg-fill-subtle px-2.5 py-2 transition-colors hover:bg-fill-press">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cobalt to-violet text-[11px] font-semibold text-white">
            M
          </span>
          <span className="min-w-0 text-[12.5px] leading-tight font-semibold">
            Maya
            <span className="num block truncate text-[10.5px] font-normal text-ink-faint">
              {mode === 'authenticated' ? 'Privy wallet' : '0x7A4C…9E21'}
            </span>
          </span>
        </Link>
      </div>
    </nav>
  );
}
