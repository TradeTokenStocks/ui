import { DitherField, type DitherFieldProps } from '@/components/dither-field';
import { cn } from '@/lib/utils';

/**
 * The ambient banner behind a screen's heading.
 *
 * Each screen names its own ramp, so colour identifies where you are before
 * you have read anything: cobalt for the portfolio, violet for a company,
 * warm for a corporate action, teal for connections, green for funding. The
 * ramps live in `@tradetoken/design-tokens`, so mobile picks up the same
 * identity from the same values.
 *
 * It always fades to the page background rather than ending at a hard edge,
 * and it stops above the content so no figure ever sits on moving pixels.
 */
export function ScreenField({
  ramp,
  height = 300,
  intensity = 0.75,
  className,
  ...props
}: DitherFieldProps & { height?: number }) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden', className)}
      style={{ height }}>
      <DitherField intensity={intensity} {...(ramp ? { ramp } : {})} {...props} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg/85 to-bg" />
    </div>
  );
}
