import { useEffect } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Body } from '@/components/ui/text';
import { palette, radius, shadow } from '@/theme/tokens';

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** The slow highlight sweep. Off for anything that is not the primary action. */
  sheen?: boolean;
  accessibilityHint?: string;
};

/**
 * The app's single saturated action.
 *
 * There is deliberately only one of these on any screen. Cobalt fill means
 * "this is executable", the same thing it means on a balance card, so a second
 * one would dilute the only signal the user has for what can actually move
 * money.
 */
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  style,
  sheen = true,
  accessibilityHint,
}: Props) {
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (!sheen || disabled) return;
    sweep.value = withRepeat(
      withTiming(1, { duration: 5600, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [sheen, disabled, sweep]);

  const sheenStyle = useAnimatedStyle(() => ({
    // Travels from just off the left edge to just past the right.
    left: `${-40 + sweep.value * 140}%`,
  }));

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
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      <LinearGradient
        colors={[palette.cobalt, palette.cobaltDeep]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {sheen && !disabled && (
        <Animated.View style={[styles.sheen, sheenStyle]} pointerEvents="none">
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.24)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
      <View style={styles.specular} />
      <Body size={15} weight="semibold" color="#fff">
        {label}
      </Body>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.lg,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    ...shadow.accent,
  },
  pressed: { transform: [{ scale: 0.975 }] },
  disabled: { opacity: 0.45 },
  sheen: { position: 'absolute', top: 0, bottom: 0, width: '34%' },
  specular: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});
