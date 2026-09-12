'use client';

import { useMemo, useState } from 'react';
import type { TokenizedStock } from '@tradetoken/domain';
import { tokenizedStocks } from '@tradetoken/domain/fixtures';
import { Search } from 'lucide-react';

import { Num } from '@/components/primitives';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const CATEGORIES = ['All', 'Tokenized stocks', 'Tech', 'Semis', 'RWA'] as const;
const TABS = ['Top', 'Trending', 'Gainers', 'New', 'Most viewed'] as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tokenA: TokenizedStock;
  tokenB: TokenizedStock;
  onSelect: (leg: 'a' | 'b', token: TokenizedStock) => void;
};

export function AquaTokenSelectDialog({ open, onOpenChange, tokenA, tokenB, onSelect }: Props) {
  const [activeLeg, setActiveLeg] = useState<'a' | 'b'>('a');
  const [queryA, setQueryA] = useState('');
  const [queryB, setQueryB] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All');
  const [tab, setTab] = useState<(typeof TABS)[number]>('Top');
  const query = activeLeg === 'a' ? queryA : queryB;

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tokenizedStocks.filter((stock) => {
      const matchesCategory = category === 'All' || stock.categories.includes(category);
      const matchesQuery = !normalized || `${stock.name} ${stock.ticker} ${stock.symbol} ${stock.issuer}`.toLowerCase().includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const choose = (stock: TokenizedStock) => {
    onSelect(activeLeg, stock);
    if (activeLeg === 'a') {
      setActiveLeg('b');
      setQueryB('');
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[min(790px,calc(100dvh-2rem))] overflow-hidden border-stroke-raised bg-[#101216] p-0 sm:max-w-[520px]" showCloseButton>
        <DialogTitle className="sr-only">Select token pair</DialogTitle>
        <div className="border-b border-stroke-hairline px-5 pt-5 pb-4">
          <p className="pr-10 text-[13px] font-semibold">Search tokens by name or paste address</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <SearchField label="Token 1" symbol={tokenA.symbol} value={queryA} active={activeLeg === 'a'} onFocus={() => setActiveLeg('a')} onChange={setQueryA} />
            <SearchField label="Token 2" symbol={tokenB.symbol} value={queryB} active={activeLeg === 'b'} onFocus={() => setActiveLeg('b')} onChange={setQueryB} />
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((item) => (
              <button key={item} onClick={() => setCategory(item)} className={cn('shrink-0 rounded-pill border px-3 py-2 text-[12px] font-semibold transition-colors', category === item ? 'border-stroke-raised bg-fill-active text-ink-primary' : 'border-transparent bg-fill-muted text-ink-tertiary hover:text-ink-primary')}>{item}</button>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-1 overflow-x-auto border-b border-stroke-hairline px-3 py-2">
            {TABS.map((item) => (
              <button key={item} onClick={() => setTab(item)} className={cn('shrink-0 rounded-lg px-3 py-2 text-[12.5px] font-semibold transition-colors', tab === item ? 'bg-fill-active text-ink-primary' : 'text-ink-tertiary hover:text-ink-primary')}>{item}</button>
            ))}
            <Num className="ml-auto rounded-md bg-fill-muted px-2 py-1 text-[10px] text-ink-quaternary">24h</Num>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {rows.map((stock) => (
              <button key={stock.id} onClick={() => choose(stock)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-fill-press focus-visible:bg-fill-press">
                <TokenMark stock={stock} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold">{stock.name}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-quaternary">
                    <Num>{stock.symbol}</Num><span>·</span><span>{stock.issuer === 'dinari' ? 'Dinari' : 'xStock'}</span><span>·</span><Num>{stock.address ? `${stock.address.slice(0, 6)}…${stock.address.slice(-4)}` : 'awaiting deployment'}</Num>
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <Num className="block text-[13px] font-medium">${stock.priceUsd.toLocaleString()}</Num>
                  <Num className={cn('mt-0.5 block text-[11px]', stock.changePct >= 0 ? 'text-positive' : 'text-amber-bright')}>{stock.changePct > 0 ? '+' : ''}{stock.changePct.toFixed(2)}%</Num>
                </span>
                {stock.walletBalance > 0 ? <span className="size-1.5 rounded-full bg-cobalt shadow-[0_0_8px_rgba(94,124,255,.9)]" title="Held in wallet" /> : null}
              </button>
            ))}
            {rows.length === 0 ? <p className="py-14 text-center text-[13px] text-ink-quaternary">No tokenized stocks match this search.</p> : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SearchField({ label, symbol, value, active, onFocus, onChange }: { label: string; symbol: string; value: string; active: boolean; onFocus: () => void; onChange: (value: string) => void }) {
  return (
    <label className={cn('flex h-14 items-center gap-2 rounded-xl border bg-fill-muted px-3 transition-colors', active ? 'border-cobalt/60 bg-cobalt/[0.07]' : 'border-stroke-hairline')}>
      <Search className="size-4 shrink-0 text-ink-faint" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-[9.5px] font-semibold tracking-wider text-ink-faint uppercase">{label} · {symbol}</span>
        <input value={value} onFocus={onFocus} onChange={(event) => onChange(event.target.value)} placeholder="Search" className="mt-0.5 w-full bg-transparent text-[13px] outline-none placeholder:text-ink-quaternary" />
      </span>
    </label>
  );
}

export function TokenMark({ stock, size = 'md' }: { stock: TokenizedStock; size?: 'sm' | 'md' }) {
  return <span className={cn('grid shrink-0 place-items-center rounded-full border font-semibold', size === 'sm' ? 'size-7 text-[9px]' : 'size-10 text-[10px]', stock.issuer === 'dinari' ? 'border-cobalt/35 bg-cobalt/15 text-cobalt-text' : 'border-violet/35 bg-violet/15 text-[#B9A3FF]')}>{stock.issuer === 'dinari' ? 'D' : 'X'}</span>;
}
