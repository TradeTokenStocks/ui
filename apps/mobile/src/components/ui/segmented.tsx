import { Pressable, StyleSheet, View } from 'react-native';

import { PulseDot } from '@/components/ui/pulse-dot';
import { Body } from '@/components/ui/text';
import { fill, ink, radius, stroke } from '@/theme/tokens';

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

/** Product-owned tabs with consistent sizing, colour, and accessibility. */
export function Segmented({ segments, value, onChange }: Props) {
  return (
    <View accessibilityRole="tablist" style={styles.track}>
      {segments.map((segment) => {
        const selected = segment.key === value;
        return (
          <Pressable
            key={segment.key}
            onPress={() => onChange(segment.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.selected,
              pressed && !selected && styles.pressed,
            ]}>
            <View style={styles.labelRow}>
              <Body
                size={12.5}
                weight="semibold"
                color={selected ? ink.primary : ink.tertiary}>
                {segment.label}
              </Body>
              {segment.badge ? <PulseDot size={5} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: 4,
    borderRadius: radius.segment,
    borderWidth: 1,
    borderColor: stroke.hairline,
    backgroundColor: fill.subtle,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.segmentThumb,
  },
  selected: {
    backgroundColor: fill.active,
    borderWidth: 1,
    borderColor: stroke.raised,
  },
  pressed: { backgroundColor: fill.press },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
});
