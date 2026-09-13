'use client';

import { useState } from 'react';
import { hackathonDeployment, type DividendPreference, type TokenizedStock } from '@tradetoken/domain';
import { pairedRepresentations, tokenizedStocks, wallet } from '@tradetoken/domain/fixtures';
import { ArrowLeft, ArrowRight, Check, Coins, RefreshCw, Search } from 'lucide-react';

import { Display, Num } from '@/components/primitives';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { TokenMark } from '@/features/strategy/components/aqua-token-select-dialog';
import { useConnection } from 'wagmi';

import { useAddLiveStockPair } from './use-add-live-stock-pair';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (stock: TokenizedStock, amountUsd: number, preference: DividendPreference) => void;
};

export function AddStockDialog({ open, onOpenChange, onComplete }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [query, setQuery] = useState('');
  const [stock, setStock] = useState<TokenizedStock | null>(null);
  const [amount, setAmount] = useState('500');
  const [preference, setPreference] = useState<DividendPreference>('drip');
  const catalog = tokenizedStocks.filter(
    (item) => item.issuer === 'xstock' && (hackathonDeployment.status !== 'live' || Boolean(item.address)),
  );
  const normalized = query.trim().toLowerCase();
  const rows = catalog.filter((item) => !normalized || `${item.name} ${item.ticker}`.toLowerCase().includes(normalized));
  const amountUsd = Number(amount) || 0;
  const live = useAddLiveStockPair();
  const { address } = useConnection();
  const recipient = live.deploymentReady
    ? address
      ? `${address.slice(0, 6)}…${address.slice(-4)}`
      : 'Sign in required'
    : wallet.short;

  const close = (next: boolean) => {
    if (!next && live.busy) return;
    onOpenChange(next);
    if (!next)
      setTimeout(() => {
        setStep(1);
        live.reset();
      }, 180);
  };

  const confirm = async () => {
    if (!stock || amountUsd <= 0) return;
    if (live.deploymentReady) {
      const [tokenA, tokenB] = pairedRepresentations(stock.ticker);
      if (!tokenA || !tokenB) return;
      try {
        await live.addPair({ tokenAId: tokenA.id, tokenBId: tokenB.id, amountUsd: amount, priceUsd: stock.priceUsd });
      } catch {
        return;
      }
    }
    onComplete(stock, amountUsd, preference);
    close(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="overflow-hidden border-stroke-raised bg-[#101216] p-0 sm:max-w-[540px]" showCloseButton>
        <DialogTitle className="sr-only">Add a tokenized stock</DialogTitle>
        <DialogDescription className="sr-only">Choose a stock, allocation, and dividend payout preference.</DialogDescription>

        <div className="border-b border-stroke-hairline px-5 pt-5 pb-4">
          <div className="flex items-center gap-3 pr-9">
            {step > 1 ? <button type="button" onClick={() => setStep((step - 1) as 1 | 2)} className="grid size-8 place-items-center rounded-lg bg-fill-muted text-ink-tertiary hover:text-ink-primary"><ArrowLeft className="size-4" /></button> : null}
            <div className="min-w-0 flex-1"><Display className="text-lg">Add stock</Display><p className="mt-0.5 text-[11px] text-ink-faint">{step === 1 ? 'Choose the company' : step === 2 ? 'Set amount and dividends' : 'Review tokenization'}</p></div>
            <Num className="text-[10.5px] text-ink-faint">{step} / 3</Num>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-1.5">{[1, 2, 3].map((item) => <span key={item} className={cn('h-1 rounded-pill', item <= step ? 'bg-cobalt' : 'bg-fill-active')} />)}</div>
        </div>

        {step === 1 ? (
          <div className="p-4 sm:p-5">
            <label className="flex h-11 items-center gap-2 rounded-xl border border-stroke-hairline bg-fill-muted px-3 focus-within:border-cobalt/50">
              <Search className="size-4 text-ink-faint" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search stocks" className="w-full bg-transparent text-[13px] outline-none placeholder:text-ink-faint" />
            </label>
            <div className="mt-3 max-h-[390px] overflow-y-auto">
              {rows.map((item) => (
                <button key={item.ticker} type="button" onClick={() => { setStock(item); setStep(2); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-fill-press">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-stroke-raised bg-fill-muted text-[10px] font-semibold">{item.ticker.slice(0, 2)}</span>
                  <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-semibold">{item.name}</span><Num className="mt-0.5 block text-[10.5px] text-ink-faint">{item.ticker} · dividend {item.dividendYieldPct.toFixed(2)}%</Num></span>
                  <span className="text-right"><Num className="block text-[13px]">${item.priceUsd.toFixed(2)}</Num><span className="mt-0.5 block text-[10.5px] text-ink-faint">2 representations</span></span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 2 && stock ? (
          <div className="space-y-5 p-5">
            <div className="flex items-center gap-3 rounded-xl border border-stroke-hairline bg-fill-subtle p-3.5"><TokenMark stock={stock} /><span className="flex-1"><span className="block text-[13px] font-semibold">{stock.name}</span><Num className="text-[10.5px] text-ink-faint">{stock.ticker} · ${stock.priceUsd.toFixed(2)}</Num></span><button type="button" onClick={() => setStep(1)} className="text-[11px] font-semibold text-cobalt-text">Change</button></div>
            <div>
              <p className="text-[10.5px] font-semibold tracking-wider text-ink-faint uppercase">Allocation</p>
              <label className="mt-2.5 flex items-baseline rounded-xl border border-stroke-raised bg-fill-muted px-4 py-3"><span className="text-xl text-ink-faint">$</span><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className="min-w-0 flex-1 bg-transparent px-2 font-mono text-2xl font-medium outline-none" /><Num className="text-[11px] text-ink-faint">USD</Num></label>
              <div className="mt-2 flex gap-2">{['100', '500', '1000', '5000'].map((value) => <button key={value} type="button" onClick={() => setAmount(value)} className={cn('flex-1 rounded-lg border py-2 text-[10.5px] font-semibold', amount === value ? 'border-cobalt/40 bg-cobalt/10 text-cobalt-text' : 'border-stroke-hairline bg-fill-subtle text-ink-faint')}>${Number(value).toLocaleString()}</button>)}</div>
            </div>
            <fieldset>
              <legend className="text-[10.5px] font-semibold tracking-wider text-ink-faint uppercase">Dividend payout</legend>
              <div className="mt-2.5 space-y-2">
                <PreferenceCard active={preference === 'drip'} icon={<RefreshCw className="size-4" />} title="Auto-reinvest (DRIP)" copy="Compounds share-equivalents through the onchain multiplier." onClick={() => setPreference('drip')} />
                <PreferenceCard active={preference === 'usdc'} icon={<Coins className="size-4" />} title="Stablecoin (USDC)" copy={`Sends cash distributions to ${wallet.short}.`} onClick={() => setPreference('usdc')} tone="positive" />
              </div>
            </fieldset>
            <Button size="lg" className="w-full" disabled={amountUsd <= 0} onClick={() => setStep(3)}>Review <ArrowRight className="size-4" /></Button>
          </div>
        ) : null}

        {step === 3 && stock ? (
          <div className="space-y-5 p-5">
            <div className="rounded-2xl border border-cobalt/25 bg-cobalt/[0.055] p-5 text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-cobalt/15 text-cobalt-text"><Check className="size-5" /></span><Display className="mt-3 text-xl">{formatCurrency(amountUsd)} of {stock.ticker}</Display><p className="mt-1 text-[11.5px] text-ink-quaternary">Ready to tokenize into your embedded wallet</p></div>
            <dl className="space-y-3 rounded-xl border border-stroke-hairline bg-fill-subtle p-4"><ReviewFact label="Stock" value={`${stock.name} (${stock.ticker})`} /><ReviewFact label="Representations" value="xStock + Ondo" /><ReviewFact label="Dividends" value={preference === 'drip' ? 'Auto-reinvest · multiplier' : 'USDC wallet payout'} /><ReviewFact label="Network" value={live.deploymentReady ? hackathonDeployment.chainName : 'Deployment network pending'} /><ReviewFact label="Gas" value="Sponsored" /><ReviewFact label="Recipient" value={recipient} /></dl>
            {live.error ? <p className="text-center text-[11.5px] text-amber-bright">{live.error}</p> : null}
            <Button size="lg" className="w-full" disabled={live.busy} onClick={() => void confirm()}>{live.deploymentReady ? live.label : 'Confirm & tokenize stock'}</Button>
            <p className="text-center text-[10.5px] text-ink-faint">{live.deploymentReady ? 'Mints both representations into your embedded wallet.' : 'Sandbox confirmation until mint contracts are connected.'}</p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PreferenceCard({ active, icon, title, copy, onClick, tone = 'cobalt' }: { active: boolean; icon: React.ReactNode; title: string; copy: string; onClick: () => void; tone?: 'cobalt' | 'positive' }) {
  return <button type="button" onClick={onClick} className={cn('flex w-full items-start gap-3 rounded-xl border p-3.5 text-left', active ? tone === 'positive' ? 'border-positive/35 bg-positive/[0.06]' : 'border-cobalt/40 bg-cobalt/[0.07]' : 'border-stroke-hairline bg-fill-subtle')}><span className={cn('mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg', tone === 'positive' ? 'bg-positive/10 text-positive' : 'bg-cobalt/10 text-cobalt-text')}>{icon}</span><span className="min-w-0 flex-1"><span className="block text-[12.5px] font-semibold">{title}</span><span className="mt-1 block text-[10.5px] leading-relaxed text-ink-quaternary">{copy}</span></span>{active ? <Check className={cn('mt-1 size-4', tone === 'positive' ? 'text-positive' : 'text-cobalt-text')} /> : null}</button>;
}

function ReviewFact({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4"><dt className="text-[11.5px] text-ink-tertiary">{label}</dt><Num className="text-right text-[11.5px] font-medium">{value}</Num></div>; }
function formatCurrency(value: number) { return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`; }
