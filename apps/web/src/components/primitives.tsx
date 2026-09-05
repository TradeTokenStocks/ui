import { cn } from '@/lib/utils';

/**
 * The small vocabulary every screen is built from.
 *
 * These are presentation only — the web equivalents of the native app's text
 * and chip components, not shared with it. What is shared is the data they
 * render and the tokens they are coloured with.
 */

/**
 * A number the user might compare against another number. Always monospaced
 * with tabular figures, so a column of values aligns and an animating value
 * does not jitter.
 */
export function Num({
  className,
  children,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span className={cn('num', className)} {...props}>
      {children}
    </span>
  );
}

/** Display type: balances and screen titles. Never body copy. */
export function Display({
  as: Tag = 'div',
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & { as?: 'h1' | 'h2' | 'h3' | 'div' }) {
  return (
    <Tag
      className={cn('font-display font-semibold tracking-[-0.02em] text-balance', className)}
      {...props}>
      {children}
    </Tag>
  );
}

/**
 * A balance, with the cents dropped to 30% opacity as the design specifies.
 * Takes the pre-split pieces so the rounding stays in the domain layer.
 */
export function Balance({
  whole,
  cents,
  className,
}: {
  whole: string;
  cents: string;
  className?: string;
}) {
  return (
    <Display className={cn('text-5xl sm:text-6xl', className)}>
      {whole}
      <span className="opacity-30">{cents}</span>
    </Display>
  );
}

/** A small pill. `tone` carries the same meaning it does in the native app. */
export function Chip({
  tone = 'neutral',
  className,
  children,
  ...props
}: React.ComponentProps<'span'> & {
  tone?: 'neutral' | 'cobalt' | 'amber' | 'positive';
}) {
  const tones = {
    neutral: 'border-stroke-raised bg-fill-muted text-ink-secondary',
    cobalt: 'border-cobalt/25 bg-cobalt/10 text-cobalt-text',
    amber: 'border-amber/25 bg-amber/10 text-amber-bright',
    positive: 'border-positive/25 bg-positive/10 text-positive',
  } as const;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap',
        tones[tone],
        className,
      )}
      {...props}>
      {children}
    </span>
  );
}

/** The slow amber pulse that marks live-but-simulated state. */
export function PulseDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative flex size-1.5', className)}>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60 [animation-duration:2.4s]" />
      <span className="relative inline-flex size-1.5 rounded-full bg-current" />
    </span>
  );
}

/**
 * The consolidated-exposure bar: the outlined portion is observed at a
 * brokerage and inert, the filled portion is onchain and allocatable. Two
 * companies can show the same value and mean completely different things,
 * which is the whole point of the product.
 */
export function ExposureBar({
  onchainPct,
  observedPct,
  className,
}: {
  onchainPct: number;
  observedPct: number;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`${onchainPct}% onchain and allocatable, ${observedPct}% observed at a brokerage`}
      className={cn('space-y-1.5', className)}>
      <div className="flex h-2.5 overflow-hidden rounded-pill border border-stroke-hairline bg-fill-muted">
        <div
          className="bg-gradient-to-r from-cobalt to-cobalt-deep shadow-[0_0_12px_rgba(94,124,255,0.4)]"
          style={{ width: `${onchainPct}%` }}
        />
        <div
          className="border-l border-bg/60 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.09)_0,rgba(255,255,255,0.09)_1px,transparent_1px,transparent_4px)]"
          style={{ width: `${observedPct}%` }}
        />
      </div>
      <div aria-hidden className="flex items-center justify-between gap-3">
        <Num className="text-[10px] font-medium text-cobalt-text">Wallet {onchainPct}%</Num>
        <Num className="text-[10px] text-ink-faint">Brokerage {observedPct}%</Num>
      </div>
    </div>
  );
}

/** A labelled figure in a row of figures. */
export function Stat({
  label,
  value,
  tone,
  className,
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'default' | 'amber' | 'positive';
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-[11.5px] font-medium text-ink-quaternary">{label}</div>
      <Num
        className={cn(
          'mt-1.5 block text-base font-medium',
          tone === 'amber' && 'text-amber',
          tone === 'positive' && 'text-positive',
        )}>
        {value}
      </Num>
    </div>
  );
}

/**
 * A raised surface. `specular` adds the 1px top highlight that keeps a dark
 * card from reading as a hole punched in the page.
 */
export function Panel({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'specular relative overflow-hidden rounded-xl border border-stroke-hairline bg-surface',
        className,
      )}
      {...props}>
      {children}
    </div>
  );
}

/** A section eyebrow. Small, tracked out, quiet. */
export function SectionLabel({
  as: Tag = 'h2',
  className,
  children,
}: {
  /** `legend` when the section is a fieldset, so the grouping is real. */
  as?: 'h2' | 'h3' | 'legend';
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tag
      className={cn(
        'text-[10.5px] font-semibold tracking-[0.11em] text-ink-faint uppercase',
        className,
      )}>
      {children}
    </Tag>
  );
}

/**
 * Says plainly that a figure is not real. Used wherever a number could
 * otherwise be mistaken for a funded balance or a settled trade.
 */
export function SandboxNote({ className, children, ...props }: React.ComponentProps<'p'>) {
  return (
    <p className={cn('text-[11.5px] leading-relaxed text-ink-faint', className)} {...props}>
      {children}
    </p>
  );
}
