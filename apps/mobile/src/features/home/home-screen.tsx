import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { BottomNav, type NavKey } from '@/components/ui/bottom-nav';
import { PortfolioScene } from '@/features/portfolio/portfolio-scene';
import { StrategyListScene } from '@/features/strategy/strategy-list-scene';
import { navMotion, palette } from '@/theme/tokens';

/** How far the incoming scene travels while the outgoing one fades away. */
const SCENE_SLIDE = 12;

/**
 * The dock shell. Portfolio and Strategies are the app's only two destinations,
 * so instead of pushing one route on top of the other they are two scenes on
 * one route that the dock switches between in place.
 *
 * Both scenes stay mounted: each keeps its scroll position across switches —
 * which is what "tab" behaviour means to a user. The switch is one shared
 * motion — a Reanimated transition on a single progress value driving both
 * scenes — so the pill in the dock and the content behind it arrive together
 * instead of the content hard-cutting beneath a gliding pill.
 */
export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<NavKey>('portfolio');

  // 0 = portfolio, 1 = strategies.
  const progress = useSharedValue(0);

  const selectTab = (next: NavKey) => {
    setTab(next);
    progress.set(
      withTiming(next === 'strategies' ? 1 : 0, {
        duration: navMotion.durationMs,
        easing: Easing.bezier(...navMotion.easing),
        reduceMotion: ReduceMotion.System,
      }),
    );
  };

  const portfolioStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.get(),
    transform: [{ translateX: progress.get() * -SCENE_SLIDE }],
  }));
  const strategiesStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateX: (1 - progress.get()) * SCENE_SLIDE }],
  }));

  const navHeight = 56 + insets.bottom + 26;

  return (
    <View style={styles.root}>
      <Animated.View
        style={[styles.scene, portfolioStyle]}
        pointerEvents={tab === 'portfolio' ? 'auto' : 'none'}
        accessibilityElementsHidden={tab !== 'portfolio'}
        importantForAccessibility={tab === 'portfolio' ? 'auto' : 'no-hide-descendants'}>
        <PortfolioScene insets={insets} />
      </Animated.View>

      <Animated.View
        style={[styles.scene, strategiesStyle]}
        pointerEvents={tab === 'strategies' ? 'auto' : 'none'}
        accessibilityElementsHidden={tab !== 'strategies'}
        importantForAccessibility={tab === 'strategies' ? 'auto' : 'no-hide-descendants'}>
        <StrategyListScene insets={insets} />
      </Animated.View>

      {/* Fade the list out from under the nav rather than clipping it, so
          scrolled content dissolves instead of disappearing at a hard edge. */}
      <LinearGradient
        colors={['rgba(10,11,13,0)', palette.bg]}
        locations={[0, 0.62]}
        pointerEvents="none"
        style={[styles.navFade, { height: navHeight + 60 }]}
      />
      <View style={[styles.nav, { bottom: insets.bottom + 20 }]}>
        <BottomNav
          value={tab}
          onChange={selectTab}
          onCreate={() => router.push('/strategy/create')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  scene: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  navFade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  nav: { position: 'absolute', left: 16, right: 16 },
});