'use client';

import { useState } from 'react';
import type { TokenizedStock } from '@tradetoken/domain';

import { Num } from '@/components/primitives';
import { cn } from '@/lib/utils';

const WINDOWS = ['7d', '1m', '3m', '6m', 'All'] as const;

export function AquaPositionChart({
  tokenA,
  tokenB,
  guardTolerancePct,
}: {
  tokenA: TokenizedStock;
  tokenB: TokenizedStock;
  guardTolerancePct: number;
}) {
  const [window, setWindow] = useState<(typeof WINDOWS)[number]>('1m');
  const ratio = tokenA.multiplier / tokenB.multiplier;
  const lower = ratio * (1 - guardTolerancePct / 100);
  const upper = ratio * (1 + guardTolerancePct / 100);

  return (
    <div className="min-h-[360px] rounded-2xl border border-stroke-hairline bg-[#0d0f12] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium text-ink-faint">Reference ratio</p>
          <Num className="mt-1 block text-2xl font-medium tracking-[-0.03em]">{ratio.toFixed(4)}</Num>
          <p className="mt-1 text-[11px] text-positive">Pegged representations · same underlying</p>
        </div>
        <div className="flex items-center rounded-lg border border-stroke-hairline bg-fill-muted p-1">
          {WINDOWS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setWindow(item)}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors',
                window === item ? 'bg-fill-active text-ink-primary' : 'text-ink-faint hover:text-ink-primary',
              )}>
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-5 h-[220px] overflow-hidden rounded-xl border border-white/[0.04] bg-[linear-gradient(180deg,rgba(94,124,255,.055),transparent_70%)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:100%_44px,72px_100%]" />
        <div className="absolute inset-x-0 top-[22%] bottom-[22%] border-y border-cobalt/25 bg-cobalt/[0.045]" />
        <svg viewBox="0 0 800 220" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-label="Illustrative same-stock price ratio">
          <defs>
            <linearGradient id="ratio-stroke" x1="0" x2="1">
              <stop offset="0" stopColor="#7894ff" stopOpacity=".4" />
              <stop offset=".45" stopColor="#89a1ff" />
              <stop offset="1" stopColor="#a992ff" />
            </linearGradient>
            <linearGradient id="ratio-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#718cff" stopOpacity=".18" />
              <stop offset="1" stopColor="#718cff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 116 C42 111 68 120 104 114 S176 89 212 103 S267 130 310 116 S364 85 402 101 S468 124 506 108 S568 90 606 103 S677 122 718 105 S768 94 800 101 L800 220 L0 220 Z" fill="url(#ratio-area)" />
          <path d="M0 116 C42 111 68 120 104 114 S176 89 212 103 S267 130 310 116 S364 85 402 101 S468 124 506 108 S568 90 606 103 S677 122 718 105 S768 94 800 101" fill="none" stroke="url(#ratio-stroke)" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
          <line x1="0" y1="110" x2="800" y2="110" stroke="rgba(255,255,255,.22)" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
        </svg>
        <Num className="absolute top-[22%] right-2 -translate-y-1/2 rounded bg-[#171a20] px-1.5 py-1 text-[9px] text-cobalt-text">{upper.toFixed(4)} max</Num>
        <Num className="absolute top-1/2 right-2 -translate-y-1/2 rounded bg-white px-1.5 py-1 text-[9px] font-semibold text-black">{ratio.toFixed(4)}</Num>
        <Num className="absolute right-2 bottom-[22%] translate-y-1/2 rounded bg-[#171a20] px-1.5 py-1 text-[9px] text-cobalt-text">{lower.toFixed(4)} min</Num>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-faint">
        <span>Illustrative ratio history</span>
        <Num>{tokenA.symbol} / {tokenB.symbol}</Num>
      </div>
    </div>
  );
}
