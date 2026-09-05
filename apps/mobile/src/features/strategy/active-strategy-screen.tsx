import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/ui/bottom-nav';
import { StrategyScene } from '@/features/strategy/strategy-scene';
import { palette } from '@/theme/tokens';

/**
 * The pushed form of a strategy destination (`/strategy/[ticker]`) — what a
 * completed review lands on (strategy-review-screen replaces to this route).
 * Same scene a list row would open, but with a real back step and no
 * cross-fade transition, because here navigation really happened and there is
 * somewhere to go back to.
 */
export function ActiveStrategyScreen() {
  const insets = useSafeAreaInsets();
  const { ticker } = useLocalSearchParams<{ ticker?: string }>();

  return (
    <View style={styles.root}>
      <StrategyScene
        insets={insets}
        {...(ticker ? { ticker } : {})}
        standalone
        onBack={() => router.back()}
      />

      <View style={[styles.nav, { bottom: insets.bottom + 20 }]}>
        <BottomNav
          value="strategies"
          onChange={(next) => {
            if (next === 'portfolio') router.navigate('/');
          }}
          onCreate={() => router.push('/strategy/create')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  nav: { position: 'absolute', left: 16, right: 16 },
});
