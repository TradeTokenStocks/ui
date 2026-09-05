import { StyleSheet } from 'react-native';
import NativeSegmentedControl from '@react-native-segmented-control/segmented-control';

import { palette } from '@/theme/tokens';

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

/** Maintained library segmented control with stable product-facing keys. */
export function Segmented({ segments, value, onChange }: Props) {
  const index = Math.max(0, segments.findIndex((s) => s.key === value));

  return (
    <NativeSegmentedControl
      appearance="dark"
      values={segments.map((segment) => `${segment.label}${segment.badge ? ' •' : ''}`)}
      selectedIndex={index}
      tintColor={palette.cobalt}
      onChange={(event) => onChange(segments[event.nativeEvent.selectedSegmentIndex].key)}
      style={styles.control}
    />
  );
}

const styles = StyleSheet.create({
  control: { width: '100%', height: 42 },
});
