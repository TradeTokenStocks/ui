import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { font, ink } from '@/theme/tokens';

/**
 * The design uses exactly three typefaces, each with one job:
 *
 *   Display  Bricolage Grotesque  the balance, screen titles
 *   Body     Instrument Sans      all UI text
 *   Num      Geist Mono           any number a user might compare to another
 *
 * These wrappers exist so that role is chosen explicitly at each call site.
 * `Num` matters most: the design tags every figure `class="n"`, and a value
 * that animates or updates in place will visibly jitter in a proportional
 * face because the digits are not the same width.
 */

type Weight = 'regular' | 'medium' | 'semibold' | 'bold';

type BaseProps = TextProps & {
  size?: number;
  weight?: Weight;
  color?: string;
  /** Shorthand for the common `letterSpacing` on tight display type. */
  tracking?: number;
};

const bodyFamily: Record<Weight, string> = {
  regular: font.sans,
  medium: font.sansMedium,
  semibold: font.sansSemi,
  bold: font.sansBold,
};

function base(size: number, color: string, family: string, tracking?: number): TextStyle {
  return { fontSize: size, color, fontFamily: family, letterSpacing: tracking };
}

export function Body({
  size = 13,
  weight = 'regular',
  color = ink.primary,
  tracking,
  style,
  ...rest
}: BaseProps) {
  return <RNText {...rest} style={[base(size, color, bodyFamily[weight], tracking), style]} />;
}

export function Display({
  size = 50,
  weight = 'semibold',
  color = ink.primary,
  tracking = -0.028 * 50,
  style,
  ...rest
}: BaseProps) {
  const family = weight === 'bold' ? font.displayBold : font.display;
  return <RNText {...rest} style={[base(size, color, family, tracking), style]} />;
}

export function Num({
  size = 13,
  weight = 'medium',
  color = ink.primary,
  tracking,
  style,
  ...rest
}: BaseProps) {
  const family = weight === 'regular' ? font.mono : font.monoMedium;
  return <RNText {...rest} style={[base(size, color, family, tracking), style]} />;
}
