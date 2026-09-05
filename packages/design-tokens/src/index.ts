/**
 * Raw semantic design values, shared by every client.
 *
 * Platform-neutral on purpose: no React Native style objects, no CSS strings,
 * no `rem`. Mobile feeds these into `StyleSheet.create`; web emits them as CSS
 * custom properties. Anything that only one platform can consume — RN shadow
 * objects, `expo-google-fonts` family constants, Tailwind utilities — stays in
 * that client.
 *
 * Values are extracted from `design/src/v3-dark.html`. The app is dark-only:
 * the design has no light variant, and a half-built one is worse than none.
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

  /** Violet, the second executable tint — partner mints, the avatar gradient. */
  violet: '#8E63FF',

  positive: '#4ADE8B',
  /** Corporate actions, sandbox badges, "needs review". */
  amber: '#E0A33C',
  amberBright: '#FFB066',
} as const;

/**
 * Text opacities. The design expresses hierarchy almost entirely through alpha
 * on a single ink colour rather than through separate greys, so these are the
 * real type-colour scale.
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
 * Ambient dither-field ramps, ordered dark → light and layered over the page
 * background. Mobile drives a Skia shader with them; web uses them as gradient
 * stops. The ramp identifies what the surface is about, so they are named for
 * the screen rather than the hue.
 */
export const ramps = {
  /** Portfolio and sign-in. Cobalt — the executable/onchain accent. */
  portfolio: ['#141B40', '#2C3A8E', '#6E88FF'],
  /** Company detail. Violet-leaning: both legs shown there are executable. */
  company: ['#141A3C', '#303385', '#8A78FF'],
  /** Strategy builder chart. Dimmer, because values are read off it. */
  strategy: ['#101733', '#1F2A66', '#4F6BF0'],
  /** Corporate actions. Warm — the only non-cobalt state in the product. */
  corporateAction: ['#2E1C12', '#8A4020', '#FFB066'],
  /** Delegation. Violet, matching the scoped-permission accent. */
  delegation: ['#171135', '#3f2f8b', '#8E63FF'],
} as const satisfies Record<string, readonly [string, string, string]>;

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
 * Typeface roles. Family names only — each client loads them its own way
 * (`@expo-google-fonts/*` on native, `next/font/google` on web), so the weight
 * constants live with the loader rather than here.
 */
export const typography = {
  /** Bricolage Grotesque — the big balance number and screen titles only. */
  display: { family: 'Bricolage Grotesque', weights: [600, 700] },
  /** Instrument Sans — all UI text. */
  sans: { family: 'Instrument Sans', weights: [400, 500, 600, 700] },
  /**
   * Geist Mono — every number the user might compare against another number.
   * Tabular figures are the whole point: a value that animates must use this
   * or it will jitter.
   */
  mono: { family: 'Geist Mono', weights: [400, 500] },
} as const;

/**
 * The design's motion signature: everything enters with the same rise curve at
 * staggered delays, so screens stagger consistently instead of each one
 * inventing its own timing.
 */
export const motion = {
  /** cubic-bezier(.2,.85,.25,1) from the source. */
  rise: [0.2, 0.85, 0.25, 1],
  riseDurationMs: 800,
  /** Delay between successive elements in an entrance stagger. */
  staggerMs: 60,
} as const;
