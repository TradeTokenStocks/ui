import { Host, Switch } from '@expo/ui';

import { palette } from '@/theme/tokens';

type Props = {
  value: boolean;
  onChange: (value: boolean) => void;
  label: string;
};

export function Toggle({ value, onChange, label }: Props) {
  return (
    <Host
      matchContents
      seedColor={palette.cobalt}
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}>
      <Switch value={value} onValueChange={onChange} />
    </Host>
  );
}
