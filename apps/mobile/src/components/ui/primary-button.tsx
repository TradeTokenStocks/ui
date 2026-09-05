import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Body } from '@/components/ui/text';
import { palette, radius, shadow, stroke } from '@/theme/tokens';

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

/** A predictable, high-contrast primary action on both native platforms. */
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  style,
  accessibilityHint,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        style,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <LinearGradient
        pointerEvents="none"
        colors={[palette.cobalt, palette.cobaltDeep]}
        start={{ x: 0.08, y: 0 }}
        end={{ x: 0.92, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Body size={15} weight="bold" color="#fff">
        {label}
      </Body>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: stroke.onAccent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadow.accent,
  },
  pressed: { opacity: 0.86, transform: [{ scale: 0.992 }] },
  disabled: { opacity: 0.42 },
});
