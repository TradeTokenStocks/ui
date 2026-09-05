import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { fill, font, ink, navMotion, palette, radius, shadow } from '@/theme/tokens';

export type NavKey = 'portfolio' | 'strategies';

const BAR_PADDING = 5;
const BAR_GAP = 8;

/** Inactive ink sits at 55% — the design's dimmed-icon weight. */
const DIM = 0.45;

type Props = {
  value: NavKey;
  onChange: (key: NavKey) => void;
  onCreate: () => void;
};

/**
 * Two destinations plus the verb.
 *
 * The design arrived here by elimination: Events and Activity were never
 * places, they are ways of reading the holdings already on screen, so they
 * became segments and freed the bar. What is left is the only two places worth
 * going and the app's single write action — which sits outside the bar so it
 * never reads as a third destination, and is the only saturated element at the
 * bottom of the screen so the eye finds it without hunting.
 *
 * The active state is a pill that physically slides between the two slots, not
 * a background that swaps in place. One shared value drives the pill position
 * and, in inverse, both tabs' icon weight and label ink — so a switch reads as
 * a single motion rather than a highlight change and a content change.
 */
export function BottomNav({ value, onChange, onCreate }: Props) {
  const [barWidth, setBarWidth] = useState(0);
  const index = value === 'portfolio' ? 0 : 1;

  // The two slots are equal by construction (flex:1 in a padded row with one
  // gap), so slot width is derivable from the bar's measured width.
  const tabWidth = barWidth > 0 ? (barWidth - BAR_PADDING * 2 - BAR_GAP) / 2 : 0;
  const offset = tabWidth + BAR_GAP;

  const halo = useSharedValue(0);
  const prevIndex = useRef(index);

  useEffect(() => {
    if (tabWidth === 0) return;
    // A real tab change glides the pill; any other re-run (first measure,
    // rotation) snaps it to its seat so it never sweeps in on its own.
    if (prevIndex.current !== index) {
      prevIndex.current = index;
      halo.set(
        withTiming(index * offset, {
          duration: navMotion.durationMs,
          easing: Easing.bezier(...navMotion.easing),
          reduceMotion: ReduceMotion.System,
        }),
      );
    } else {
      halo.set(index * offset);
    }
  }, [index, tabWidth, offset, halo]);

  // 0..1 progress of the pill's trip between slot 0 and slot 1.
  const progress = useDerivedValue(() => (offset > 0 ? halo.get() / offset : 0));

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: halo.get() }],
  }));

  const portfolioIcon = useAnimatedStyle(() => ({ opacity: 1 - progress.get() * DIM }));
  const portfolioLabel = useAnimatedStyle(() => ({
    color: interpolateColor(progress.get(), [0, 1], [ink.primary, ink.quaternary]),
  }));
  const strategiesIcon = useAnimatedStyle(() => ({ opacity: 1 - DIM + progress.get() * DIM }));
  const strategiesLabel = useAnimatedStyle(() => ({
    color: interpolateColor(progress.get(), [0, 1], [ink.quaternary, ink.primary]),
  }));

  const onBarLayout = (event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={styles.row}>
      <View style={styles.bar} onLayout={onBarLayout}>
        <Animated.View pointerEvents="none" style={[styles.halo, { width: tabWidth }, haloStyle]} />

        <Pressable
          onPress={() => onChange('portfolio')}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === 'portfolio' }}
          style={styles.tab}>
          <Animated.View style={portfolioIcon}>
            <PortfolioGlyph />
          </Animated.View>
          <Animated.Text numberOfLines={1} style={[styles.tabLabel, portfolioLabel]}>
            Portfolio
          </Animated.Text>
        </Pressable>

        <Pressable
          onPress={() => onChange('strategies')}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === 'strategies' }}
          style={styles.tab}>
          <Animated.View style={strategiesIcon}>
            <StrategiesGlyph />
          </Animated.View>
          <Animated.Text numberOfLines={1} style={[styles.tabLabel, strategiesLabel]}>
            Strategies
          </Animated.Text>
        </Pressable>
      </View>

      <Pressable
        onPress={onCreate}
        accessibilityRole="button"
        accessibilityLabel="Open a new strategy"
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}>
        <LinearGradient
          colors={[palette.cobalt, palette.cobaltDeep]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.plusBarH} />
        <View style={styles.plusBarV} />
      </Pressable>
    </View>
  );
}

/**
 * Both glyphs are built from plain views rather than an icon font or SVG.
 * They are four rectangles between them, and the design dims the internals
 * rather than swapping shapes for the inactive state — so an inactive icon
 * keeps its silhouette and only loses weight.
 */
function PortfolioGlyph() {
  return (
    <View style={styles.glyphGrid}>
      <View style={styles.gridCell} />
      <View style={[styles.gridCell, styles.gridCellDim]} />
      <View style={[styles.gridCell, styles.gridCellDim]} />
      <View style={styles.gridCell} />
    </View>
  );
}

function StrategiesGlyph() {
  return (
    <View style={styles.glyphBars}>
      <View style={styles.bar1} />
      <View style={styles.bar2} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bar: {
    flex: 1,
    flexDirection: 'row',
    gap: BAR_GAP,
    backgroundColor: 'rgba(18,20,24,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.nav,
    padding: BAR_PADDING,
    ...shadow.nav,
  },
  halo: {
    position: 'absolute',
    left: BAR_PADDING,
    top: BAR_PADDING,
    bottom: BAR_PADDING,
    borderRadius: radius.navTab,
    backgroundColor: fill.active,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.navTab,
  },
  tabLabel: {
    fontSize: 12.5,
    fontFamily: font.sansSemi,
    letterSpacing: 0.1,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    ...shadow.accent,
  },
  fabPressed: { transform: [{ scale: 0.94 }] },
  plusBarH: { position: 'absolute', width: 18, height: 3, borderRadius: 1.5, backgroundColor: '#fff' },
  plusBarV: { position: 'absolute', width: 3, height: 18, borderRadius: 1.5, backgroundColor: '#fff' },

  glyphGrid: { width: 15, height: 15, flexDirection: 'row', flexWrap: 'wrap', gap: 2.5 },
  gridCell: {
    width: 6.25,
    height: 6.25,
    borderRadius: 2.5,
    backgroundColor: ink.primary,
  },
  gridCellDim: { opacity: 0.45 },
  glyphBars: { width: 15, height: 15, justifyContent: 'center', gap: 4 },
  bar1: { height: 3, width: '100%', borderRadius: 1.5, backgroundColor: ink.primary },
  bar2: { height: 3, width: '58%', borderRadius: 1.5, backgroundColor: ink.primary, opacity: 0.45 },
});