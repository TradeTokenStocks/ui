import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { palette } from '@/theme/tokens';

type Props = {
  size?: number;
  color?: string;
  /** Full cycle in ms. The design runs these slowly — 2.6s to 2.8s. */
  duration?: number;
};

/**
 * The slow amber breath used on the Sandbox chip and the Events badge.
 *
 * It signals "live but simulated", so it is deliberately calm — a fast pulse
 * would read as an alert, which is the wrong message for a sandbox flag.
 */
export function PulseDot({ size = 5, color = palette.amber, duration = 2800 }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [duration, progress]);

  const style = useAnimatedStyle(() => ({ opacity: 0.35 + progress.value * 0.65 }));

  return (
    <Animated.View
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]}
    />
  );
}
