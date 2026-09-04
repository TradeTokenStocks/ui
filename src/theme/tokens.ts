/**
 * Design tokens extracted from `design/src/v3-dark.html`.
 *
 * The design document uses raw hex inline everywhere rather than CSS variables,
 * so these names are ours. Where a value appears in the source under several
 * near-identical shades, the most-used one wins and the others are dropped —
 * the document had four distinct near-black surfaces that read identically on
 * a phone.
 *
 * The app is dark-only. There is no light variant because the design has none,
 * and a half-built light theme is worse than an honest absence.
 */

export const palette = {
  /** Page background. Everything sits on this. */
  bg: '#0A0B0D',
  /** Raised card surface — the holdings list, sheets, panels. */
  surface: '#101216',
  /** Recessed surface, used behind the nav bar's glass. */
  surfaceSunken: '#0C0E12',

  text: '#F2F3F5',

  /** Primary accent. Onchain / allocatable / actionable. */
  cobalt: '#5E7CFF',
  /** Gradient terminus for cobalt fills (buttons, the wallet card, the FAB). */
  cobaltDeep: '#3F4FD6',
  /** Cobalt as text on dark — links, active values. */
  cobaltText: '#8DA2FF',
  /** Cobalt on chips and monospace ids. */
  cobaltDim: '#93A6FF',

  /** Violet, only ever as the far stop of the avatar/FAB gradient. */
  violet: '#8E63FF',

  positive: '#4ADE8B',
  /** Corporate actions, sandbox badges, "needs review". */
  amber: '#E0A33C',
  amberBright: '#FFB066',
} as const;

/**
 * Text opacities. The design expresses hierarchy almost entirely through
 * alpha on a single ink colour rather than through separate greys, so these
 * are the real type-colour scale.
 */
export const ink = {
  primary: palette.text,
  secondary: 'rgba(242,243,245,0.62)',
  tertiary: 'rgba(242,243,245,0.48)',
  quaternary: 'rgba(242,243,245,0.42)',
  faint: 'rgba(242,243,245,0.34)',
} as const;

/** Hairline borders and translucent fills, all white-on-dark. */
export const stroke = {
  /** Default card and control border. */
  hairline: 'rgba(255,255,255,0.07)',
  /** Slightly stronger — segmented controls, chips. */
  raised: 'rgba(255,255,255,0.09)',
  /** On saturated cobalt fills. */
  onAccent: 'rgba(255,255,255,0.16)',
  /** The 1px top highlight that sits on cards and cobalt buttons. */
  specular: 'rgba(255,255,255,0.4)',
} as const;

export const fill = {
  /** Inactive segment / secondary card background. */
  subtle: 'rgba(255,255,255,0.03)',
  /** Segmented control track, chips. */
  muted: 'rgba(255,255,255,0.05)',
  /** Active segment thumb, active nav tab. */
  active: 'rgba(255,255,255,0.10)',
  /** Row hover/press. */
  press: 'rgba(255,255,255,0.035)',
} as const;

/**
 * The dither field's 3-stop ramp on the home screen. Ordered dark → light,
 * layered over `palette.bg`. Consumed by the Skia shader as vec3 uniforms.
 */
export const ditherRamp = ['#141B40', '#2C3A8E', '#6E88FF'] as const;

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
   * The design tags these `class="n"`; tabular figures are the whole point,
   * so a value that animates must use this or it will jitter.
   */
  mono: 'GeistMono_400Regular',
  monoMedium: 'GeistMono_500Medium',
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  /** Segmented control outer. */
  segment: 18,
  /** Segmented control thumb. */
  segmentThumb: 14,
  /** Nav bar and its tabs. */
  nav: 24,
  navTab: 19,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 40,
  /** Horizontal screen padding — the design's `.pad`. */
  gutter: 20,
} as const;

/**
 * Shadows are iOS-only in practice; Android gets `elevation` and ignores the
 * offset/radius, which is fine because every shadow here is a soft downward
 * lift rather than a directional light.
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
 * The design's motion signature: everything enters with the same rise curve at
 * staggered delays. Exported so screens stagger consistently instead of each
 * one inventing its own timing.
 */
export const motion = {
  /** cubic-bezier(.2,.85,.25,1) from the source. */
  rise: [0.2, 0.85, 0.25, 1] as const,
  riseDuration: 800,
  /** Delay between successive elements in an entrance stagger. */
  stagger: 60,
} as const;
