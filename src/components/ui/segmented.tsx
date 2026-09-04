import { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

import { Body } from '@/components/ui/text';
import { fill, ink, palette, radius, stroke } from '@/theme/tokens';

export type Segment = {
  key: string;
  label: string;
  /** Renders an amber "needs review" dot after the label. */
  badge?: boolean;
};

type Props = {
  segments: Segment[];
  value: string;
  onChange: (key: string) => void;
};

const PAD = 4;
/** cubic-bezier(.22,.9,.24,1) from the design's `transition` on the thumb. */
const THUMB_EASING = Easing.bezier(0.22, 0.9, 0.24, 1);

/**
 * Sliding-thumb segmented control.
 *
 * The thumb is positioned from a measured track width rather than a percentage
 * because it has to inset by `PAD` on both sides — a percentage transform would
 * drift by a few pixels at the last segment, which is exactly where it is most
 * visible.
 */
export function Segmented({ segments, value, onChange }: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const index = Math.max(0, segments.findIndex((s) => s.key === value));
  const segmentWidth = trackWidth > 0 ? (trackWidth - PAD * 2) / segments.length : 0;

  const thumbStyle = useAnimatedStyle(() => ({
    width: segmentWidth,
    transform: [
      { translateX: withTiming(index * segmentWidth, { duration: 380, easing: THUMB_EASING }) },
    ],
  }));

  const onLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.track} onLayout={onLayout}>
      {segmentWidth > 0 && <Animated.View style={[styles.thumb, thumbStyle]} />}
      {segments.map((segment) => {
        const active = segment.key === value;
        return (
          <Pressable
            key={segment.key}
            onPress={() => onChange(segment.key)}
            style={styles.segment}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={
              segment.badge ? `${segment.label}, needs review` : segment.label
            }>
            <Body size={12.5} weight="semibold" color={active ? ink.primary : ink.quaternary}>
              {segment.label}
            </Body>
            {segment.badge && <View style={styles.badge} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: fill.muted,
    borderWidth: 1,
    borderColor: stroke.hairline,
    borderRadius: radius.segment,
    padding: PAD,
  },
  thumb: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    backgroundColor: fill.active,
    borderWidth: 1,
    borderColor: stroke.raised,
    borderRadius: radius.segmentThumb,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  badge: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.amber,
  },
});
