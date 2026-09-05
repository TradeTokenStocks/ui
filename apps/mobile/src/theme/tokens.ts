/**
 * The mobile view of the design system.
 *
 * Raw semantic values — colours, radii, spacing, ramps, motion — come from
 * `@tradetoken/design-tokens` so web and native cannot drift. What stays here
 * is what only React Native can consume: shadow style objects and the
 * `@expo-google-fonts` family constants.
 */

import { motion as rawMotion, ramps } from '@tradetoken/design-tokens';

export { palette, ink, stroke, fill, radius, space, ramps } from '@tradetoken/design-tokens';

/** The home screen's ambient field, as Skia wants it: a fixed 3-stop tuple. */
export const ditherRamp = ramps.portfolio;

export const font = {
  /** Bricolage Grotesque — the big balance number and screen titles only. */
  display: 'BricolageGrotesque_600SemiBold',
  displayBold: 'BricolageGrotesque_700Bold',
  /** Instrument Sans — all UI text. */
  sans: 'InstrumentSans_400Regular',
  sansMedium: 'InstrumentSans_500Medium',
  sansSemi: 'InstrumentSans_600SemiBold',
  sansBold: 'InstrumentSans_700Bold',
  /**
   * Geist Mono — every number the user might compare against another number.
   * Tabular figures are the whole point, so a value that animates must use
   * this or it will jitter.
   */
  mono: 'GeistMono_400Regular',
  monoMedium: 'GeistMono_500Medium',
} as const;

/**
 * Shadows are iOS-only in practice; Android gets `elevation` and ignores the
 * offset/radius, which is fine because every shadow here is a soft downward
 * lift rather than a directional light. RN style objects, so not shared.
 */
export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 20 },
    elevation: 12,
  },
  accent: {
    shadowColor: '#3448DC',
    shadowOpacity: 0.45,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  nav: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 16 },
    elevation: 16,
  },
} as const;

/**
 * The design's motion signature, in the units Reanimated expects: a cubic
 * bezier tuple and millisecond durations.
 */
export const motion = {
  rise: rawMotion.rise as unknown as readonly [number, number, number, number],
  riseDuration: rawMotion.riseDurationMs,
  stagger: rawMotion.staggerMs,
} as const;
