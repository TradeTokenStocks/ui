import { StyleSheet, View } from 'react-native';
import NativeSegmentedControl from '@react-native-segmented-control/segmented-control';

import { PulseDot } from '@/components/ui/pulse-dot';
import { fill, font, ink, palette } from '@/theme/tokens';

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

/**
 * Maintained library segmented control with stable product-facing keys.
 *
 * The native control renders in the OS system font by default and has no
 * concept of the app's badge language, so both are patched in explicitly:
 * `fontStyle`/`activeFontStyle` set it to the app's Instrument Sans (the
 * library exposes this — it just wasn't being passed), and the "needs
 * review" signal is the same amber `PulseDot` used everywhere else in the
 * app, overlaid at the badged segment's position, rather than a bullet
 * character appended to the label string.
 */
export function Segmented({ segments, value, onChange }: Props) {
  const index = Math.max(0, segments.findIndex((s) => s.key === value));
  const badgeIndex = segments.findIndex((s) => s.badge);

  return (
    <View style={styles.wrap}>
      <NativeSegmentedControl
        appearance="dark"
        values={segments.map((segment) => segment.label)}
        selectedIndex={index}
        tintColor={palette.cobalt}
        backgroundColor={fill.muted}
        sliderStyle={{ backgroundColor: fill.active }}
        fontStyle={{ fontFamily: font.sansSemi, fontSize: 12.5, color: ink.tertiary }}
        activeFontStyle={{ fontFamily: font.sansSemi, fontSize: 12.5, color: ink.primary }}
        onChange={(event) => {
          const next = segments[event.nativeEvent.selectedSegmentIndex];
          if (next) onChange(next.key);
        }}
        style={styles.control}
      />
      {badgeIndex >= 0 && (
        <View
          pointerEvents="none"
          style={[
            styles.badge,
            { left: `${((badgeIndex + 0.72) / segments.length) * 100}%` },
          ]}>
          <PulseDot size={5} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  control: { width: '100%', height: 42 },
  badge: { position: 'absolute', top: '50%', marginTop: -2.5 },
});
