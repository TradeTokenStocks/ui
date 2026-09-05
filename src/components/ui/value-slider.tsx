import { Host, Slider } from '@expo/ui';

import { palette } from '@/theme/tokens';

type Props = {
  value: number;
  minimumValue: number;
  maximumValue: number;
  step: number;
  onValueChange: (value: number) => void;
  accessibilityLabel: string;
};

/** SDK-native slider, wrapped only to keep product-facing prop names stable. */
export function ValueSlider({
  value,
  minimumValue,
  maximumValue,
  step,
  onValueChange,
  accessibilityLabel,
}: Props) {
  return (
    <Host
      matchContents={{ vertical: true }}
      seedColor={palette.cobalt}
      style={{ width: '100%' }}
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: minimumValue, max: maximumValue, now: value }}>
      <Slider
        value={value}
        min={minimumValue}
        max={maximumValue}
        step={step}
        onValueChange={onValueChange}
      />
    </Host>
  );
}
