import Link from 'next/link';
import { executableTotalUsd, formatUsd } from '@tradetoken/domain';
import { companies, companyDetails } from '@tradetoken/domain/fixtures';

import { Display, Num, Panel } from '@/components/primitives';

export function StrategyCompanyPickerScreen() {
  const eligible = companies.flatMap((company) => {
    const detail = companyDetails[company.ticker];
    const executableUsd = detail ? executableTotalUsd(detail) : 0;
    return executableUsd > 0 ? [{ company, executableUsd }] : [];
  });

  return (
    <div className="mx-auto max-w-[620px] space-y-7">
      <header>
        <Link href="/strategies" className="text-[12.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-primary">
          ← Strategies
        </Link>
        <Display as="h1" className="mt-4 text-3xl">New strategy</Display>
        <p className="mt-2 text-[12.5px] text-ink-tertiary">
          Choose a company with an allocatable wallet balance.
        </p>
      </header>

      <Panel>
        <ul className="divide-y divide-stroke-hairline">
          {eligible.map(({ company, executableUsd }) => (
            <li key={company.ticker}>
              <Link
                href={{ pathname: '/strategies/new/type', query: { ticker: company.ticker } }}
                className="flex items-center gap-3.5 px-5 py-4 transition-colors hover:bg-fill-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cobalt/70">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-stroke-hairline bg-fill-subtle text-[11.5px] font-semibold text-ink-secondary">
                  {company.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold">{company.name}</span>
                  <Num className="mt-0.5 block text-[11px] text-ink-quaternary">{company.ticker} · wallet</Num>
                </span>
                <Num className="shrink-0 text-[13px] font-medium">{formatUsd(executableUsd)}</Num>
                <span aria-hidden className="text-ink-faint">›</span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
