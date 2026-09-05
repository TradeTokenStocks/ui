import { useState } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { Button, Host, Text } from '@expo/ui';

import { palette, radius } from '@/theme/tokens';

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
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
  accessibilityHint,
}: Props) {
  const [width, setWidth] = useState<number>();

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    setWidth((current) => (current === nextWidth ? current : nextWidth));
  };

  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      onLayout={handleLayout}
      style={style}>
      <Host matchContents={{ vertical: true }} seedColor={palette.cobalt} style={{ width: '100%' }}>
        <Button
          onPress={onPress}
          disabled={disabled}
          variant="filled"
          style={{ ...styles.button, width }}>
          <Text numberOfLines={1} textStyle={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
            {label}
          </Text>
        </Button>
      </Host>
    </View>
  );
}

const styles = {
  button: {
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: palette.cobalt,
  },
};
