import { Host, Picker } from '@expo/ui';

import { palette } from '@/theme/tokens';

export type SelectionOption<T extends string> = { label: string; value: T };

type Props<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: readonly SelectionOption<T>[];
  testID?: string;
};

/** Platform-native single-selection menu. */
export function SelectionPicker<T extends string>({ value, onChange, options, testID }: Props<T>) {
  return (
    <Host
      matchContents={{ vertical: true }}
      colorScheme="dark"
      seedColor={palette.cobalt}
      style={{ width: '100%' }}>
      <Picker
        selectedValue={value}
        onValueChange={(next) => onChange(next as T)}
        {...(testID ? { testID } : {})}>
        {options.map((option) => (
          <Picker.Item key={option.value} label={option.label} value={option.value} />
        ))}
      </Picker>
    </Host>
  );
}
