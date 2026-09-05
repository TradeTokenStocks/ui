import { useState } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { Button, Host, Text } from '@expo/ui';

import { fill, ink, palette, radius, stroke } from '@/theme/tokens';

type Props = {
  label: string;
  onPress: () => void;
  accent?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Native platform button for compact and secondary actions.
 *
 * Renders its label through `@expo/ui`'s own `Text` (via `children`) instead
 * of the plain `label` prop: the native `label` string has no wrap control at
 * all on either platform, so a label wider than the measured button — e.g.
 * "$10,000" in a row of four equally-flexed buttons — wraps mid-token instead
 * of shrinking or truncating. `numberOfLines={1}` on the child `Text` clips it
 * with an ellipsis instead.
 */
export function SecondaryButton({ label, onPress, accent = false, disabled, style }: Props) {
  const [width, setWidth] = useState<number>();

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    setWidth((current) => (current === nextWidth ? current : nextWidth));
  };

  return (
    <View
      style={style}
      onLayout={handleLayout}
      accessibilityLabel={label}
      accessibilityState={{ disabled }}>
      <Host
        matchContents={{ vertical: true }}
        colorScheme="dark"
        seedColor={palette.cobalt}
        style={{ width: '100%' }}>
        <Button
          onPress={onPress}
          disabled={disabled}
          variant={accent ? 'filled' : 'outlined'}
          style={{ ...styles.base, ...(accent ? styles.accent : styles.secondary), width }}>
          <Text
            numberOfLines={1}
            textStyle={{ color: accent ? '#fff' : ink.primary, fontSize: 13.5, fontWeight: '600' }}>
            {label}
          </Text>
        </Button>
      </Host>
    </View>
  );
}

const styles = {
  base: { height: 42, borderRadius: radius.md },
  accent: { backgroundColor: palette.cobalt, borderColor: 'rgba(255,255,255,0.16)' },
  secondary: { backgroundColor: fill.muted, borderColor: stroke.raised },
};
