import { Pressable, StyleSheet, View } from 'react-native';

import { ink, radius } from '@/theme/tokens';

type Props = {
  onPress: () => void;
};

/**
 * Circular back affordance. The chevron is two rotated rules rather than an
 * icon font, which keeps the app free of an icon dependency for what amounts
 * to six glyphs in the whole design.
 */
export function BackButton({ onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={10}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <View style={styles.chevron}>
        <View style={[styles.stroke, styles.top]} />
        <View style={[styles.stroke, styles.bottom]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  chevron: { width: 10, height: 12, justifyContent: 'center' },
  stroke: {
    position: 'absolute',
    width: 8,
    height: 1.6,
    borderRadius: 1,
    backgroundColor: ink.secondary,
    left: 0,
  },
  top: { transform: [{ translateY: -2.4 }, { rotate: '-45deg' }] },
  bottom: { transform: [{ translateY: 2.4 }, { rotate: '45deg' }] },
});
