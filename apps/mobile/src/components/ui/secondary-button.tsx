import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Body } from '@/components/ui/text';
import { fill, ink, palette, radius, stroke } from '@/theme/tokens';

type Props = {
  label: string;
  onPress: () => void;
  accent?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Compact action with explicit selected/accent and quiet secondary states. */
export function SecondaryButton({
  label,
  onPress,
  accent = false,
  disabled = false,
  style,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: accent }}
      style={({ pressed }) => [
        styles.base,
        accent ? styles.accent : styles.secondary,
        style,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Body
        numberOfLines={1}
        size={13.5}
        weight="semibold"
        color={accent ? '#fff' : ink.primary}>
        {label}
      </Body>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13,
  },
  accent: {
    backgroundColor: palette.cobaltDeep,
    borderColor: palette.cobalt,
  },
  secondary: {
    backgroundColor: fill.muted,
    borderColor: stroke.raised,
  },
  pressed: { backgroundColor: fill.active, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.42 },
});
