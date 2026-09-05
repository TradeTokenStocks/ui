import { useState } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { Button, Host } from '@expo/ui';

import { fill, palette, radius, stroke } from '@/theme/tokens';

type Props = {
  label: string;
  onPress: () => void;
  accent?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Native platform button for compact and secondary actions. */
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
          label={label}
          onPress={onPress}
          disabled={disabled}
          variant={accent ? 'filled' : 'outlined'}
          style={{ ...styles.base, ...(accent ? styles.accent : styles.secondary), width }}
        />
      </Host>
    </View>
  );
}

const styles = {
  base: { height: 42, borderRadius: radius.md },
  accent: { backgroundColor: palette.cobalt, borderColor: 'rgba(255,255,255,0.16)' },
  secondary: { backgroundColor: fill.muted, borderColor: stroke.raised },
};
